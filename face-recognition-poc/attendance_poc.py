#!/usr/bin/env python3
"""
Smart School Attendance - Face Recognition PoC
==============================================
Simulates: Webcam/RTSP → Face Detection → Match against Known Faces → Log Attendance + WhatsApp

Usage:
  1. Create folder: known_faces/
  2. Add photos: known_faces/John_Doe.jpg, known_faces/Jane_Smith.jpg (filename = person name)
  3. Run: python attendance_poc.py

Press 'q' to quit.
"""

import csv
import json
import os
import time
import threading
from datetime import datetime
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

import cv2
import numpy as np
import requests

# ============== CONFIGURATION ==============
POC_DIR = Path(__file__).parent
KNOWN_FACES_DIR = POC_DIR / "known_faces"
STUDENTS_CSV = POC_DIR / "students.csv"

DEMO_MODE = os.environ.get("DEMO_MODE", "").strip() in ("1", "true", "yes")
TARGET_FPS = 6 if DEMO_MODE else 4  # Faster feedback in demo
CONFIDENCE_THRESHOLD = 0.55 if DEMO_MODE else 0.6  # Slightly relaxed in demo
COOLDOWN_SECONDS = 10 if DEMO_MODE else 30  # Shorter cooldown for repeated demos
MATCH_STREAK_REQUIRED = 2  # Require 2 consecutive frames above threshold (reduces false positives)
MIN_ENROLL_SHARPNESS = 45 if DEMO_MODE else 50  # Allow slightly blurrier in demo

# API: Next.js attendance-event endpoint (ensure dev server is running)
API_BASE_URL = os.environ.get("ATTENDANCE_API_URL", "http://localhost:3000")
API_KEY = os.environ.get("ATTENDANCE_API_KEY", "")


def _api_headers():
    """Headers for API requests. Include X-API-Key when ATTENDANCE_API_KEY is set."""
    h = {"Content-Type": "application/json"}
    if API_KEY:
        h["X-API-Key"] = API_KEY
    return h

# Video: 0 = webcam, or DroidCam/IP URL (set by env or prompt at start)
DEFAULT_CAM_IP = "192.168.29.224"
DEFAULT_CAM_PORT = "4747"
DEFAULT_STREAM_PORT = 5000  # Dashboard Live Feed and Face Scan use this
VIDEO_SOURCE = None  # set in main() after prompt or from env
STREAM_PORT = DEFAULT_STREAM_PORT

# Shared latest frame for MJPEG (dashboard + Face Scan use this same camera)
_latest_frame = None
_frame_lock = threading.Lock()
_stream_ready = False

# ============== GLOBALS ==============
last_attendance = {}  # {name: timestamp} for debouncing
match_streak = {}  # {name: count} for multi-frame confirmation
last_unknown_report = 0  # Debounce unknown face reports
UNKNOWN_REPORT_COOLDOWN = 10  # Seconds between unknown face reports
last_auto_enroll_time = 0  # Debounce auto-enroll (same unknown face)
AUTO_ENROLL_COOLDOWN = 10  # Seconds between auto-enrolling new faces
last_frame_time = 0
frame_interval = 1.0 / TARGET_FPS
students_map = {}  # {name: {phone, tenant_id}}
MIN_ENROLL_FACE_SIZE = 60  # Minimum width/height for auto-enroll crop


def load_students():
    """Load student name -> phone mapping from students.csv."""
    global students_map
    students_map = {}
    if not STUDENTS_CSV.exists():
        print(f"[WARN] {STUDENTS_CSV} not found. WhatsApp API calls will use demo phone.")
        return
    with open(STUDENTS_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get("name", "").strip()
            if name:
                students_map[name] = {
                    "phone": row.get("phone", "").strip() or "916371070959",
                    "tenant_id": row.get("tenant_id", "").strip() or "delhi",
                }


def load_known_faces():
    """Load known face images from known_faces/ folder. Returns list of (name, image_path)."""
    known = []
    if not KNOWN_FACES_DIR.exists():
        KNOWN_FACES_DIR.mkdir(parents=True, exist_ok=True)
        return known
    for path in KNOWN_FACES_DIR.glob("*"):
        if path.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp"):
            name = path.stem.replace("_", " ")  # John_Doe.jpg -> John Doe
            known.append((name, str(path)))
    return known


def _get_next_student_id() -> int:
    """Return next available student_id from students.csv."""
    if not STUDENTS_CSV.exists():
        return 1
    ids = []
    with open(STUDENTS_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                ids.append(int(row.get("student_id") or 0))
            except ValueError:
                pass
    return max(ids, default=0) + 1


def _face_quality_ok(crop) -> bool:
    """Quick check: size and sharpness suitable for enrollment."""
    if crop is None or crop.size == 0:
        return False
    h, w = crop.shape[:2]
    if w < MIN_ENROLL_FACE_SIZE or h < MIN_ENROLL_FACE_SIZE:
        return False
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    return lap.var() >= MIN_ENROLL_SHARPNESS


def auto_enroll_unknown_face(face_crop, known_faces_list: list) -> str | None:
    """
    Enroll an unknown face: analyse, save to known_faces/, add to students.csv,
    append to known_faces_list, and mark attendance. Returns enrolled name or None.
    """
    global last_auto_enroll_time, students_map
    now = time.time()
    if now - last_auto_enroll_time < AUTO_ENROLL_COOLDOWN:
        return None
    if face_crop is None or not _face_quality_ok(face_crop):
        return None
    try:
        from enroll_face import add_to_students_csv
    except ImportError:
        return None
    next_id = _get_next_student_id()
    name = f"Guest_{next_id}"
    file_name = name.replace(" ", "_") + ".jpg"
    out_path = KNOWN_FACES_DIR / file_name
    KNOWN_FACES_DIR.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), face_crop)
    add_to_students_csv(name, student_id=next_id)
    load_students()
    known_faces_list.append((name, str(out_path)))
    last_auto_enroll_time = now
    print(f"\n>>> AUTO-ENROLLED: {name} (student_id={next_id}) — face analysed and added.")
    log_attendance(name, 1.0)
    return name


known_embeddings_cache: dict[str, np.ndarray] = {}
_use_face_recognition = False

try:
    import face_recognition
    _use_face_recognition = True
except ImportError:
    pass


def _face_embedding(img: np.ndarray) -> np.ndarray:
    """Simple embedding: resized grayscale + L2-normalized vector (fallback when face_recognition not available)."""
    if img is None or img.size == 0:
        return np.zeros((1,), dtype="float32")
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    gray = cv2.resize(gray, (112, 112))
    vec = gray.astype("float32").flatten()
    norm = np.linalg.norm(vec) + 1e-6
    return vec / norm


def _face_embedding_fr(img: np.ndarray) -> np.ndarray | None:
    """face_recognition 128-d encoding. Returns None if no face detected."""
    if img is None or img.size == 0:
        return None
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    encodings = face_recognition.face_encodings(rgb)
    return encodings[0] if encodings else None


def find_match(frame, known_faces):
    """
    Detect faces in frame and compare against known faces.
    Uses face_recognition (128-d) when available, else OpenCV grayscale embedding.
    Returns (matched_name, confidence, unknown_face_crop).
    """
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    except Exception:
        return None, 0.0, None

    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    if cascade.empty():
        return None, 0.0, None

    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    if len(faces) == 0:
        return None, 0.0, None

    x, y, w, h = max(faces, key=lambda r: r[2] * r[3])
    face_crop = frame[y : y + h, x : x + w].copy()

    if _use_face_recognition:
        face_emb = _face_embedding_fr(face_crop)
        if face_emb is not None:
            known_names = []
            known_encodings = []
            for name, ref_path in known_faces:
                try:
                    cache_key = f"fr:{ref_path}"
                    enc = known_embeddings_cache.get(cache_key)
                    if enc is None:
                        img = cv2.imread(ref_path)
                        if img is None:
                            continue
                        enc = _face_embedding_fr(img)
                        if enc is not None:
                            known_embeddings_cache[cache_key] = enc
                    if enc is not None:
                        known_names.append(name)
                        known_encodings.append(enc)
                except Exception:
                    continue
            if known_encodings:
                matches = face_recognition.compare_faces(
                    known_encodings, face_emb, tolerance=1.0 - CONFIDENCE_THRESHOLD
                )
                distances = face_recognition.face_distance(known_encodings, face_emb)
                best_idx = np.argmin(distances) if len(distances) > 0 else -1
                if best_idx >= 0 and matches[best_idx]:
                    conf = max(0.0, 1.0 - float(distances[best_idx]))
                    return known_names[best_idx], conf, None

    # Fallback: OpenCV grayscale embedding
    face_emb = _face_embedding(face_crop)
    best_name = None
    best_score = 0.0

    for name, ref_path in known_faces:
        try:
            cache_key = f"cv:{ref_path}"
            emb = known_embeddings_cache.get(cache_key)
            if emb is None:
                img = cv2.imread(ref_path)
                if img is None:
                    continue
                emb = _face_embedding(img)
                known_embeddings_cache[cache_key] = emb
            dist = float(np.linalg.norm(face_emb - emb))
            score = max(0.0, 1.0 - dist)
            if score > best_score:
                best_score = score
                best_name = name
        except Exception:
            continue

    if best_name and best_score >= CONFIDENCE_THRESHOLD:
        return best_name, best_score, None
    return None, 0.0, face_crop


def should_log_attendance(name: str) -> bool:
    """Debounce: only log if cooldown has passed."""
    now = time.time()
    if name not in last_attendance:
        return True
    return (now - last_attendance[name]) >= COOLDOWN_SECONDS


def report_unknown_face(face_crop) -> bool:
    """POST unknown face to API for manual assignment. Returns True if sent."""
    global last_unknown_report
    now = time.time()
    if now - last_unknown_report < UNKNOWN_REPORT_COOLDOWN:
        return False
    if face_crop is None:
        return False
    try:
        import base64
        _, buf = cv2.imencode(".jpg", face_crop)
        b64 = base64.b64encode(buf).decode("utf-8")
        r = requests.post(
            f"{API_BASE_URL}/api/unknown-faces",
            json={"image_base64": b64, "camera_id": "webcam"},
            headers=_api_headers(),
            timeout=5,
        )
        if r.ok:
            last_unknown_report = now
            print(">>> Unknown face reported for manual assignment.")
            return True
    except Exception as e:
        pass
    return False


def log_attendance(name: str, confidence: float):
    """Log attendance and trigger WhatsApp via API. Retries with backoff on failure."""
    last_attendance[name] = time.time()
    info = students_map.get(name, {"phone": "916371070959", "tenant_id": "delhi"})
    phone = info["phone"]
    tenant_id = info["tenant_id"]
    time_str = datetime.now().strftime("%I:%M %p")

    print(f"\n>>> ATTENDANCE MARKED: {name} (confidence: {confidence:.2%})")
    print(">>> Triggering WhatsApp API...")

    payload = {
        "student_name": name,
        "phone": phone,
        "time": time_str,
        "tenant_id": tenant_id,
    }
    delays = [0, 1, 3]  # First try, then retry after 1s and 3s
    last_err = None
    for i, delay in enumerate(delays):
        if delay > 0:
            print(f">>> Retry {i} after {delay}s...")
            time.sleep(delay)
        try:
            r = requests.post(
                f"{API_BASE_URL}/api/attendance-event",
                json=payload,
                headers=_api_headers(),
                timeout=10,
            )
            data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
            if r.ok:
                print(f">>> OK: {data.get('status', 'sent')}")
                return
            last_err = data.get("error", r.text)
            print(f">>> FAIL: {last_err}")
        except requests.exceptions.RequestException as e:
            last_err = str(e)
            print(f">>> API ERROR: {e}")
    if last_err:
        print(f">>> All retries failed. Last error: {last_err}")


def prompt_camera_config():
    """Use shared camera config (same as enroll_face, stream_server, attendance_rtsp_opencv)."""
    global VIDEO_SOURCE, STREAM_PORT
    try:
        from camera_config import load_camera_config, prompt_camera_config as shared_prompt
        vs, sp = load_camera_config()
        if vs is not None and sp is not None:
            VIDEO_SOURCE = vs
            STREAM_PORT = sp
            return
        VIDEO_SOURCE, STREAM_PORT = shared_prompt(ask_stream_port=True)
    except ImportError:
        vs = os.environ.get("VIDEO_SOURCE")
        if vs is not None:
            VIDEO_SOURCE = int(vs) if vs.isdigit() else vs
            STREAM_PORT = int(os.environ.get("STREAM_PORT", str(DEFAULT_STREAM_PORT)))
            return
        print("Camera source (DroidCam / IP webcam, or webcam)")
        ip = input(f"  IP address (or 0 for webcam) [{DEFAULT_CAM_IP}]: ").strip() or DEFAULT_CAM_IP
        if ip == "0" or ip.lower() == "webcam":
            VIDEO_SOURCE = 0
        else:
            port = input(f"  Port [{DEFAULT_CAM_PORT}]: ").strip() or DEFAULT_CAM_PORT
            VIDEO_SOURCE = f"http://{ip}:{port}/video"
        STREAM_PORT = int(input(f"  Stream port [{DEFAULT_STREAM_PORT}]: ").strip() or str(DEFAULT_STREAM_PORT))


def _students_json() -> bytes:
    """Return students from students.csv as JSON."""
    students = []
    if STUDENTS_CSV.exists():
        try:
            with open(STUDENTS_CSV, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    name = (row.get("name") or "").strip()
                    if name:
                        students.append({
                            "id": row.get("student_id", str(i + 1)).strip(),
                            "name": name,
                            "phone": (row.get("phone") or "").strip(),
                            "tenant_id": (row.get("tenant_id") or "delhi").strip(),
                        })
        except Exception:
            pass
    return json.dumps({"students": students}).encode("utf-8")


class _StreamHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_POST(self):
        if self.path == "/reset-cooldowns":
            global last_attendance, match_streak
            last_attendance.clear()
            match_streak.clear()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"ok":true,"message":"Cooldowns reset"}')
        else:
            self.send_error(404)

    def do_GET(self):
        if self.path in ("/", "/stream"):
            self._send_stream()
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        elif self.path == "/students":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(_students_json())
        else:
            self.send_error(404)

    def _send_stream(self):
        self.send_response(200)
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        try:
            while True:
                with _frame_lock:
                    frame = _latest_frame
                if frame is None:
                    time.sleep(0.05)
                    continue
                _, jpg = cv2.imencode(".jpg", frame)
                self.wfile.write(b"--frame\r\n")
                self.wfile.write(b"Content-Type: image/jpeg\r\n")
                self.wfile.write(f"Content-Length: {len(jpg)}\r\n".encode())
                self.wfile.write(b"\r\n")
                self.wfile.write(jpg.tobytes())
                self.wfile.write(b"\r\n")
                time.sleep(0.05)
        except (BrokenPipeError, ConnectionResetError):
            pass


def _run_stream_server():
    server = HTTPServer(("0.0.0.0", STREAM_PORT), _StreamHandler)
    try:
        server.serve_forever()
    except Exception:
        pass
    finally:
        server.shutdown()


def main():
    global VIDEO_SOURCE, _latest_frame, _stream_ready
    prompt_camera_config()
    load_students()
    known_faces = load_known_faces()
    if not known_faces:
        print("No known faces found. Add images to known_faces/ and run again.")
        return

    print(f"Loaded {len(known_faces)} known faces: {[n for n, _ in known_faces]}" + (" (face_recognition)" if _use_face_recognition else " (OpenCV fallback)"))
    print(f"Students: {len(students_map)} | API: {API_BASE_URL}")
    print(f"Video: {VIDEO_SOURCE}")
    print(f"Target FPS: {TARGET_FPS} | Confidence: {CONFIDENCE_THRESHOLD} | Cooldown: {COOLDOWN_SECONDS}s")
    print("Press 'q' to quit.\n")

    cap = cv2.VideoCapture(VIDEO_SOURCE)
    for _ in range(2):
        if cap.isOpened():
            break
        cap.release()
        time.sleep(2)
        cap = cv2.VideoCapture(VIDEO_SOURCE)
    if not cap.isOpened():
        print("Failed to open video source.")
        print("  Tips: DroidCam app on + same Wi‑Fi; or run again and enter 0 for webcam. Edit camera_config.json to change.")
        return

    # Serve same feed to dashboard (Live Feed + Face Scan use this)
    thread = threading.Thread(target=_run_stream_server, daemon=True)
    thread.start()
    print(f"Dashboard feed: http://localhost:{STREAM_PORT}/stream (Live Feed & Face Scan use this camera)")

    global last_frame_time
    last_frame_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        now = time.time()
        if now - last_frame_time < frame_interval:
            cap.grab()  # Skip frame
            continue
        last_frame_time = now

        # Flip for webcam mirror effect (optional)
        frame = cv2.flip(frame, 1)

        name, confidence, unknown_crop = find_match(frame, known_faces)

        if name and confidence >= CONFIDENCE_THRESHOLD:
            match_streak[name] = match_streak.get(name, 0) + 1
            if match_streak[name] >= MATCH_STREAK_REQUIRED and should_log_attendance(name):
                log_attendance(name, confidence)
                match_streak[name] = 0  # reset after logging
        else:
            match_streak.clear()  # reset streak when no match
            # Draw label on frame
            cv2.putText(
                frame, f"{name} ({confidence:.0%})",
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2
            )
        else:
            enrolled_name = None
            if unknown_crop is not None:
                enrolled_name = auto_enroll_unknown_face(unknown_crop, known_faces)
                if enrolled_name is None:
                    report_unknown_face(unknown_crop)  # fallback: report to API if no auto-enroll
            if enrolled_name:
                cv2.putText(frame, f"Enrolled: {enrolled_name}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
            else:
                cv2.putText(frame, "Unknown (not registered)", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        # Serve this frame to dashboard (Live Feed + Face Scan)
        with _frame_lock:
            _latest_frame = frame.copy()
            _stream_ready = True

        cv2.imshow("Attendance PoC", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Done.")


if __name__ == "__main__":
    main()
