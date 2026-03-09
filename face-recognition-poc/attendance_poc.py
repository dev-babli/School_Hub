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

# RTSP: force TCP for stable streams (Hikvision, tunnels, etc.)
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

import cv2
import numpy as np
import requests

# ============== CONFIGURATION ==============
POC_DIR = Path(__file__).parent
KNOWN_FACES_DIR = POC_DIR / "known_faces"
STUDENTS_CSV = POC_DIR / "students.csv"

DEMO_MODE = os.environ.get("DEMO_MODE", "").strip() in ("1", "true", "yes")
HEADLESS = os.environ.get("HEADLESS", os.environ.get("NO_GUI", "")).strip() in ("1", "true", "yes")
# Production: 3 FPS, higher confidence, more consecutive frames (give camera time to settle)
TARGET_FPS = 6 if DEMO_MODE else 3
CONFIDENCE_THRESHOLD = 0.30  # 30% match = recognize; set STRICT=1 for 0.70
MATCH_STREAK_REQUIRED = 3  # 3 frames (~1 sec) = instant recognition
# One attendance per person per day (no repeat messages)
ATTENDANCE_ONCE_PER_DAY = True
DISABLE_AUTO_ENROLL = True  # Only manually enrolled faces get attendance
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
last_attendance_date = {}  # {name: "YYYY-MM-DD"} — one per person per day
match_streak = {}  # {name: count} for multi-frame confirmation
last_unknown_report = 0  # Debounce unknown face reports
UNKNOWN_REPORT_COOLDOWN = 10  # Seconds between unknown face reports
last_auto_enroll_time = 0  # Debounce auto-enroll (same unknown face)
AUTO_ENROLL_COOLDOWN = 10  # Seconds between auto-enrolling new faces
last_frame_time = 0
frame_interval = 1.0 / TARGET_FPS
students_map = {}  # {name: {phone, tenant_id}}
MIN_ENROLL_FACE_SIZE = 60  # Minimum width/height for auto-enroll crop

# LBPH Recognizer
_lbph_recognizer = None
_lbph_label_map = {}  # {int_label: name}


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
                    "phone": row.get("phone", "").strip() or "971582553710",
                    "tenant_id": row.get("tenant_id", "").strip() or "delhi",
                }


def load_known_faces():
    """Load known face images. Supports:
    - known_faces/PersonName/ (folder with img_001.jpg, ...) - multi-image enrollment
    - known_faces/PersonName.jpg (legacy single file)
    Skips Guest_* so only deliberately enrolled persons are recognized."""
    known = []
    if not KNOWN_FACES_DIR.exists():
        KNOWN_FACES_DIR.mkdir(parents=True, exist_ok=True)
        return known
    for item in KNOWN_FACES_DIR.iterdir():
        if item.is_dir():
            if item.name.startswith("Guest_"):
                continue
            name = item.name.replace("_", " ")
            for p in item.glob("*"):
                if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp"):
                    known.append((name, str(p)))
        elif item.is_file() and item.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp"):
            if item.stem.startswith("Guest_"):
                continue
            name = item.stem.replace("_", " ")
            known.append((name, str(item)))
    return known


def _train_lbph(known_faces):
    """Train LBPH recognizer with known faces."""
    global _lbph_recognizer, _lbph_label_map
    
    # Check if cv2.face is available
    try:
        if not hasattr(cv2, 'face'):
            print("[INFO] cv2.face not available. LBPH disabled.")
            return False
        recognizer = cv2.face.LBPHFaceRecognizer_create()
    except AttributeError:
        print("[INFO] cv2.face not available. LBPH disabled.")
        return False

    faces = []
    labels = []
    _lbph_label_map = {}
    label_counter = 0
    name_to_label = {}

    print(f"Training LBPH on {len(known_faces)} images...")
    
    for name, path in known_faces:
        try:
            img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                continue
            
            # Resize to fixed size for consistency
            img = cv2.resize(img, (100, 100))
            
            if name not in name_to_label:
                name_to_label[name] = label_counter
                _lbph_label_map[label_counter] = name
                label_counter += 1
            
            faces.append(img)
            labels.append(name_to_label[name])
        except Exception:
            continue

    if not faces:
        print("[WARN] No valid faces for LBPH training.")
        return False

    recognizer.train(faces, np.array(labels))
    _lbph_recognizer = recognizer
    print(f"LBPH Trained on {len(faces)} faces for {len(name_to_label)} people.")
    return True


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


def _maybe_auto_enroll(face_crop, known_faces_list: list) -> str | None:
    """
    Enroll an unknown face: analyse, save to known_faces/, add to students.csv,
    append to known_faces_list, and mark attendance. Returns enrolled name or None.
    """
    global last_auto_enroll_time, students_map
    now = time.time()
    if now - last_auto_enroll_time < AUTO_ENROLL_COOLDOWN:
        return None
    if DISABLE_AUTO_ENROLL or face_crop is None or not _face_quality_ok(face_crop):
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
    
    # Re-train LBPH if auto-enroll happens (optional, might be slow)
    # _train_lbph(known_faces_list) 
    
    return name


known_embeddings_cache: dict[str, np.ndarray] = {}
_insightface_app = None


def _get_insightface():
    global _insightface_app
    if _insightface_app is not None:
        return _insightface_app
    try:
        from insightface.app import FaceAnalysis
        app = FaceAnalysis(name="buffalo_sc", providers=["CPUExecutionProvider"])
        app.prepare(ctx_id=-1, det_size=(320, 320))
        _insightface_app = app
        return app
    except Exception:
        return None


def _face_embedding_cv(img: np.ndarray) -> np.ndarray:
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


def _face_embedding_if(img: np.ndarray) -> np.ndarray | None:
    app = _get_insightface()
    if app is None or img is None or img.size == 0:
        return None
    try:
        img_bgr = img if len(img.shape) == 3 else cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        faces = app.get(img_bgr)
        if not faces:
            return None
        emb = faces[0].embedding
        return emb / (np.linalg.norm(emb) + 1e-6)
    except Exception:
        return None


def find_match(frame, known_faces):
    """
    Detect faces and compare against known faces.
    Priority:
    1. LBPH (if available)
    2. InsightFace (if available)
    3. Histogram/Simple CV Fallback
    
    Returns (matched_name, confidence, unknown_face_crop, bbox) where bbox is (x, y, w, h) or None.
    """
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    except Exception:
        return None, 0.0, None, None

    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    if cascade.empty():
        return None, 0.0, None, None

    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    if len(faces) == 0:
        return None, 0.0, None, None

    x, y, w, h = max(faces, key=lambda r: r[2] * r[3])
    face_crop = frame[y : y + h, x : x + w].copy()
    bbox = (x, y, w, h)

    # 1. LBPH Check
    if _lbph_recognizer:
        try:
            face_gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
            face_gray = cv2.resize(face_gray, (100, 100))
            label, confidence = _lbph_recognizer.predict(face_gray)
            
            # LBPH confidence: 0 is perfect match. Usually < 50 is good.
            # We map it to a 0.0-1.0 score where 1.0 is best.
            # Let's say threshold is 70.
            lbph_threshold = 70.0
            if confidence < lbph_threshold:
                score = max(0.0, (lbph_threshold - confidence) / lbph_threshold)
                name = _lbph_label_map.get(label)
                if name:
                    return name, score, None, bbox
        except Exception:
            pass

    # 2. InsightFace Check (Optional)
    app = _get_insightface()
    if app is not None:
        face_emb = _face_embedding_if(face_crop)
        if face_emb is not None:
            best_name, best_score = None, 0.0
            for name, ref_path in known_faces:
                try:
                    cache_key = f"if:{ref_path}"
                    enc = known_embeddings_cache.get(cache_key)
                    if enc is None:
                        img = cv2.imread(ref_path)
                        if img is None:
                            continue
                        enc = _face_embedding_if(img)
                        if enc is not None:
                            known_embeddings_cache[cache_key] = enc
                    if enc is not None:
                        sim = float(np.dot(face_emb, enc))
                        if sim > best_score:
                            best_score = sim
                            best_name = name
                except Exception:
                    continue
            if best_name and best_score >= CONFIDENCE_THRESHOLD:
                return best_name, best_score, None, bbox

    # 3. Fallback: OpenCV Histogram Correlation
    # Better than simple embedding for budget phones
    best_name = None
    best_score = 0.0
    
    try:
        face_gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        face_hist = cv2.calcHist([face_gray], [0], None, [256], [0, 256])
        cv2.normalize(face_hist, face_hist, 0, 1, cv2.NORM_MINMAX)
        
        for name, ref_path in known_faces:
            try:
                cache_key = f"hist:{ref_path}"
                ref_hist = known_embeddings_cache.get(cache_key)
                if ref_hist is None:
                    img = cv2.imread(ref_path)
                    if img is None:
                        continue
                    img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                    ref_hist = cv2.calcHist([img_gray], [0], None, [256], [0, 256])
                    cv2.normalize(ref_hist, ref_hist, 0, 1, cv2.NORM_MINMAX)
                    known_embeddings_cache[cache_key] = ref_hist
                
                score = cv2.compareHist(face_hist, ref_hist, cv2.HISTCMP_CORREL)
                if score > best_score:
                    best_score = score
                    best_name = name
            except Exception:
                continue
    except Exception:
        pass

    if best_name and best_score >= 0.6: # Histogram correlation threshold
        return best_name, best_score, None, bbox
        
    return None, 0.0, face_crop, bbox


def should_log_attendance(name: str) -> bool:
    """One attendance per person per day — no repeat messages."""
    today = datetime.now().strftime("%Y-%m-%d")
    if name not in last_attendance_date:
        return True
    return last_attendance_date[name] != today


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
    """Log attendance and trigger WhatsApp via API. Once per person per day."""
    last_attendance_date[name] = datetime.now().strftime("%Y-%m-%d")
    info = students_map.get(name, {"phone": "971582553710", "tenant_id": "delhi"})
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
            global last_attendance_date, match_streak
            last_attendance_date.clear()
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
        except (BrokenPipeError, ConnectionResetError, OSError, ConnectionAbortedError):
            pass


def _run_stream_server():
    server = ThreadingHTTPServer(("0.0.0.0", STREAM_PORT), _StreamHandler)
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

    # Train LBPH
    _train_lbph(known_faces)

    print(f"Loaded {len(known_faces)} known faces.")
    print(f"Students: {len(students_map)} | API: {API_BASE_URL}")
    print(f"Video: {VIDEO_SOURCE}")
    print(f"Target FPS: {TARGET_FPS} | Confidence: {CONFIDENCE_THRESHOLD} | Streak: {MATCH_STREAK_REQUIRED} | Once per day")
    print("Press 'q' to quit.\n")

    def _open_cap():
        src = VIDEO_SOURCE
        if isinstance(src, str) and (src.startswith("http") or src.startswith("rtsp")):
            c = cv2.VideoCapture(src, cv2.CAP_FFMPEG)
        else:
            c = cv2.VideoCapture(src)
        if c.isOpened():
            c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return c

    cap = _open_cap()
    for _ in range(2):
        if cap.isOpened():
            break
        cap.release()
        time.sleep(2)
        cap = _open_cap()
    if not cap.isOpened():
        print("Failed to open video source.")
        print("  Tips: Hikvision=1, DroidCam=2, webcam=0. Same Wi‑Fi for IP cameras. Edit camera_config.json to change.")
        return

    # Serve same feed to dashboard (Live Feed + Face Scan use this)
    thread = threading.Thread(target=_run_stream_server, daemon=True)
    thread.start()
    print(f"Dashboard feed: http://localhost:{STREAM_PORT}/stream (Live Feed & Face Scan use this camera)")

    global last_frame_time
    last_frame_time = 0

    RECONNECT_DELAY = 3
    while True:
        if cap is None or not cap.isOpened():
            cap = _open_cap()
            if not cap.isOpened():
                print("[WARN] Cannot open camera. Retry in 3s...")
                time.sleep(RECONNECT_DELAY)
                continue

        ret, frame = cap.read()
        if not ret or frame is None:
            cap.release()
            cap = None
            print("[WARN] Frame read failed. Reconnecting...")
            time.sleep(RECONNECT_DELAY)
            continue

        try:
            _ = frame.shape
        except Exception:
            continue

        now = time.time()
        if now - last_frame_time < frame_interval:
            cap.grab()  # Skip frame
            continue
        last_frame_time = now

        # Flip for webcam mirror effect (optional)
        frame = cv2.flip(frame, 1)

        name, confidence, unknown_crop, bbox = find_match(frame, known_faces)

        if name and confidence >= CONFIDENCE_THRESHOLD:
            match_streak[name] = match_streak.get(name, 0) + 1
            if match_streak[name] >= MATCH_STREAK_REQUIRED and should_log_attendance(name):
                log_attendance(name, confidence)
                match_streak[name] = 0
            if bbox:
                x, y, w, h = bbox
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 3)
            cv2.putText(frame, f"{name} ({confidence:.0%})", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        else:
            match_streak.clear()
            enrolled_name = None
            if unknown_crop is not None:
                enrolled_name = _maybe_auto_enroll(unknown_crop, known_faces)
                if enrolled_name is None:
                    report_unknown_face(unknown_crop)
            if bbox:
                x, y, w, h = bbox
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 165, 255), 2)
            if enrolled_name:
                cv2.putText(frame, f"Enrolled: {enrolled_name}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
            else:
                cv2.putText(frame, "Unknown (not registered)", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        # Serve this frame to dashboard (Live Feed + Face Scan)
        with _frame_lock:
            _latest_frame = frame.copy()
            _stream_ready = True

        if not HEADLESS:
            cv2.imshow("Attendance PoC", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    if cap is not None:
        cap.release()
    if not HEADLESS:
        cv2.destroyAllWindows()
    print("Done.")


if __name__ == "__main__":
    main()
