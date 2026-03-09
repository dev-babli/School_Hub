"""
Smart School Attendance - Face Recognition (DroidCam)
=====================================================
Same as attendance_poc.py but configured for DroidCam only.
Uses http://IP:4747/video — phone and PC must be on same Wi-Fi.

Usage:
  1. Install DroidCam on phone, connect via Wi-Fi
  2. Add enrolled faces in known_faces/
  3. Run: python attendance_droidcam.py

Env: DROIDCAM_IP, DROIDCAM_PORT (default 192.168.29.224, 4747)
Press 'q' to quit.
"""

import csv
import json
import os
import time
import threading
from datetime import datetime

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
TARGET_FPS = 6 if DEMO_MODE else 3
CONFIDENCE_THRESHOLD = 0.30
MATCH_STREAK_REQUIRED = 3
ATTENDANCE_ONCE_PER_DAY = True
DISABLE_AUTO_ENROLL = True
MIN_ENROLL_SHARPNESS = 45 if DEMO_MODE else 50

API_BASE_URL = os.environ.get("ATTENDANCE_API_URL", "http://localhost:3000")
API_KEY = os.environ.get("ATTENDANCE_API_KEY", "")

DROIDCAM_IP = os.environ.get("DROIDCAM_IP", "192.168.29.224")
DROIDCAM_PORT = os.environ.get("DROIDCAM_PORT", "4747")
DEFAULT_STREAM_PORT = 5000
VIDEO_SOURCE = None
STREAM_PORT = DEFAULT_STREAM_PORT


def _api_headers():
    h = {"Content-Type": "application/json"}
    if API_KEY:
        h["X-API-Key"] = API_KEY
    return h


_latest_frame = None
_frame_lock = threading.Lock()
_stream_ready = False

last_attendance_date = {}
match_streak = {}
last_unknown_report = 0
UNKNOWN_REPORT_COOLDOWN = 10
last_auto_enroll_time = 0
AUTO_ENROLL_COOLDOWN = 10
last_frame_time = 0
frame_interval = 1.0 / TARGET_FPS
students_map = {}
MIN_ENROLL_FACE_SIZE = 60

FACE_SIZE = 100
LBPH_CONFIDENCE_MAX = 70
HISTOGRAM_THRESHOLD = 0.65
_lbph_model = None
_lbph_label_to_name: dict[int, str] = {}
_lbph_built_from: tuple = ()


def load_students():
    global students_map
    students_map = {}
    if not STUDENTS_CSV.exists():
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


def _get_next_student_id() -> int:
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
    if crop is None or crop.size == 0:
        return False
    h, w = crop.shape[:2]
    if w < MIN_ENROLL_FACE_SIZE or h < MIN_ENROLL_FACE_SIZE:
        return False
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    return lap.var() >= MIN_ENROLL_SHARPNESS


def _maybe_auto_enroll(face_crop, known_faces_list: list) -> str | None:
    global last_auto_enroll_time, students_map
    now = time.time()
    if now - last_auto_enroll_time < AUTO_ENROLL_COOLDOWN or DISABLE_AUTO_ENROLL or face_crop is None or not _face_quality_ok(face_crop):
        return None
    try:
        from enroll_face import add_to_students_csv
    except ImportError:
        return None
    next_id = _get_next_student_id()
    name = f"Guest_{next_id}"
    out_path = KNOWN_FACES_DIR / (name.replace(" ", "_") + ".jpg")
    KNOWN_FACES_DIR.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), face_crop)
    add_to_students_csv(name, student_id=next_id)
    load_students()
    known_faces_list.append((name, str(out_path)))
    last_auto_enroll_time = now
    log_attendance(name, 1.0)
    return name


def _prepare_face(img: np.ndarray) -> np.ndarray | None:
    if img is None or img.size == 0:
        return None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    return cv2.resize(gray, (FACE_SIZE, FACE_SIZE))


def _match_histogram(face_gray: np.ndarray, known_faces: list) -> tuple[str | None, float]:
    if face_gray is None or face_gray.size == 0:
        return None, 0.0
    face_gray = cv2.resize(face_gray, (FACE_SIZE, FACE_SIZE))
    h1 = cv2.calcHist([face_gray], [0], None, [256], [0, 256])
    cv2.normalize(h1, h1)
    best_name, best_corr = None, 0.0
    for name, ref_path in known_faces:
        try:
            img = cv2.imread(ref_path)
            if img is None:
                continue
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, (FACE_SIZE, FACE_SIZE))
            h2 = cv2.calcHist([gray], [0], None, [256], [0, 256])
            cv2.normalize(h2, h2)
            corr = cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL)
            if corr > best_corr:
                best_corr = corr
                best_name = name
        except Exception:
            continue
    return best_name, max(0.0, float(best_corr))


def _build_lbph(known_faces: list) -> bool:
    global _lbph_model, _lbph_label_to_name, _lbph_built_from
    key = tuple(sorted((n, p) for n, p in known_faces))
    if key == _lbph_built_from and _lbph_model is not None:
        return True
    try:
        recognizer = cv2.face.LBPHFaceRecognizer_create()
    except AttributeError:
        return False
    labels_list, faces_list = [], []
    name_to_label, label_to_name = {}, {}
    next_label = 0
    per_name_count = {}
    for name, ref_path in known_faces:
        if per_name_count.get(name, 0) >= 3:
            continue
        per_name_count[name] = per_name_count.get(name, 0) + 1
        img = cv2.imread(ref_path)
        if img is None:
            continue
        gray = _prepare_face(img)
        if gray is None:
            continue
        if name not in name_to_label:
            name_to_label[name] = next_label
            label_to_name[next_label] = name
            next_label += 1
        labels_list.append(name_to_label[name])
        faces_list.append(gray)
    if not faces_list:
        return False
    recognizer.train(np.array(faces_list), np.array(labels_list, dtype=np.int32))
    _lbph_model = recognizer
    _lbph_label_to_name = label_to_name
    _lbph_built_from = key
    return True


def _match_lbph(face_gray: np.ndarray, known_faces: list) -> tuple[str | None, float]:
    if not _build_lbph(known_faces):
        return None, 0.0
    face_prep = _prepare_face(face_gray)
    if face_prep is None:
        return None, 0.0
    try:
        label, confidence = _lbph_model.predict(face_prep)
    except Exception:
        return None, 0.0
    if label not in _lbph_label_to_name or confidence > LBPH_CONFIDENCE_MAX:
        return None, 0.0
    name = _lbph_label_to_name[label]
    score = max(0.0, 1.0 - confidence / LBPH_CONFIDENCE_MAX)
    return name, score


def _match_lbph_or_histogram(face_crop: np.ndarray, known_faces: list) -> tuple[str | None, float]:
    if not known_faces:
        return None, 0.0
    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY) if len(face_crop.shape) == 3 else face_crop
    name, score = _match_lbph(gray, known_faces)
    if name is not None and score >= CONFIDENCE_THRESHOLD:
        return name, score
    name, score = _match_histogram(face_crop, known_faces)
    if name is not None and score >= HISTOGRAM_THRESHOLD:
        return name, score
    return None, 0.0


def find_match(frame, known_faces):
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
    best_name, best_score = _match_lbph_or_histogram(face_crop, known_faces)
    if best_name and best_score >= CONFIDENCE_THRESHOLD:
        return best_name, best_score, None, bbox
    return None, 0.0, face_crop, bbox


def should_log_attendance(name: str) -> bool:
    today = datetime.now().strftime("%Y-%m-%d")
    return name not in last_attendance_date or last_attendance_date[name] != today


def report_unknown_face(face_crop) -> bool:
    global last_unknown_report
    if time.time() - last_unknown_report < UNKNOWN_REPORT_COOLDOWN or face_crop is None:
        return False
    try:
        import base64
        _, buf = cv2.imencode(".jpg", face_crop)
        r = requests.post(
            f"{API_BASE_URL}/api/unknown-faces",
            json={"image_base64": base64.b64encode(buf).decode("utf-8"), "camera_id": "droidcam"},
            headers=_api_headers(),
            timeout=5,
        )
        if r.ok:
            last_unknown_report = time.time()
            return True
    except Exception:
        pass
    return False


def log_attendance(name: str, confidence: float):
    last_attendance_date[name] = datetime.now().strftime("%Y-%m-%d")
    info = students_map.get(name, {"phone": "971582553710", "tenant_id": "delhi"})
    payload = {
        "student_name": name,
        "phone": info["phone"],
        "time": datetime.now().strftime("%I:%M %p"),
        "tenant_id": info["tenant_id"],
    }
    for delay in [0, 1, 3]:
        if delay > 0:
            time.sleep(delay)
        try:
            r = requests.post(f"{API_BASE_URL}/api/attendance-event", json=payload, headers=_api_headers(), timeout=10)
            if r.ok:
                return
        except Exception:
            pass


def prompt_droidcam_config():
    """DroidCam-only: IP and port. Uses env DROIDCAM_IP, DROIDCAM_PORT or prompt."""
    global VIDEO_SOURCE, STREAM_PORT
    ip = os.environ.get("DROIDCAM_IP", DROIDCAM_IP)
    port = os.environ.get("DROIDCAM_PORT", DROIDCAM_PORT)
    config_path = POC_DIR / "camera_config.json"
    if config_path.exists():
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            vs = data.get("video_source")
            if isinstance(vs, str) and "http" in vs:
                VIDEO_SOURCE = vs
                STREAM_PORT = int(data.get("stream_port", DEFAULT_STREAM_PORT))
                return
        except Exception:
            pass
    try:
        use = input(f"  Use DroidCam at {ip}:{port}? (Y/n) [Y]: ").strip().lower()
        if use in ("n", "no"):
            ip = input(f"  DroidCam IP [{ip}]: ").strip() or ip
            port = input(f"  DroidCam port [{port}]: ").strip() or port
        VIDEO_SOURCE = f"http://{ip}:{port}/video"
        sp = input(f"  Stream port for dashboard [{DEFAULT_STREAM_PORT}]: ").strip() or str(DEFAULT_STREAM_PORT)
        STREAM_PORT = int(sp)
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump({"video_source": VIDEO_SOURCE, "stream_port": STREAM_PORT}, f, indent=2)
    except (EOFError, KeyboardInterrupt):
        VIDEO_SOURCE = f"http://{ip}:{port}/video"
        STREAM_PORT = DEFAULT_STREAM_PORT


def _students_json() -> bytes:
    students = []
    if STUDENTS_CSV.exists():
        try:
            with open(STUDENTS_CSV, newline="", encoding="utf-8") as f:
                for i, row in enumerate(csv.DictReader(f)):
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
                self.wfile.write(b"--frame\r\nContent-Type: image/jpeg\r\n")
                self.wfile.write(f"Content-Length: {len(jpg)}\r\n\r\n".encode())
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
    global VIDEO_SOURCE, _latest_frame, last_frame_time
    prompt_droidcam_config()
    load_students()
    known_faces = load_known_faces()
    if not known_faces:
        print("No known faces found. Add images to known_faces/ and run again.")
        return
    engine = "LBPH" if _build_lbph(known_faces) else "Histogram"
    print(f"DroidCam Attendance — Video: {VIDEO_SOURCE}")
    print(f"Loaded {len(known_faces)} faces: {[n for n, _ in known_faces]} ({engine})")
    print(f"Dashboard: http://localhost:{STREAM_PORT}/stream")
    print("Press 'q' to quit.\n")

    def _open_cap():
        c = cv2.VideoCapture(VIDEO_SOURCE, cv2.CAP_FFMPEG)
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
        print("Failed to open DroidCam. Ensure phone app is running and PC/phone on same Wi-Fi.")
        print(f"  Test: {VIDEO_SOURCE}")
        return

    threading.Thread(target=_run_stream_server, daemon=True).start()
    last_frame_time = 0
    RECONNECT_DELAY = 3

    while True:
        if cap is None or not cap.isOpened():
            cap = _open_cap()
            if not cap.isOpened():
                print("[WARN] DroidCam disconnected. Reconnecting...")
                time.sleep(RECONNECT_DELAY)
                continue
        ret, frame = cap.read()
        if not ret or frame is None:
            cap.release()
            cap = None
            time.sleep(RECONNECT_DELAY)
            continue
        try:
            _ = frame.shape
        except Exception:
            continue
        now = time.time()
        if now - last_frame_time < frame_interval:
            cap.grab()
            continue
        last_frame_time = now
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
            enrolled_name = _maybe_auto_enroll(unknown_crop, known_faces) if unknown_crop is not None else None
            if enrolled_name is None and unknown_crop is not None:
                report_unknown_face(unknown_crop)
            if bbox:
                x, y, w, h = bbox
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 165, 255), 2)
            if enrolled_name:
                cv2.putText(frame, f"Enrolled: {enrolled_name}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
            else:
                cv2.putText(frame, "Unknown (not registered)", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        with _frame_lock:
            _latest_frame = frame.copy()

        if not HEADLESS:
            cv2.imshow("Attendance (DroidCam)", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    if cap is not None:
        cap.release()
    if not HEADLESS:
        cv2.destroyAllWindows()
    print("Done.")


if __name__ == "__main__":
    main()
