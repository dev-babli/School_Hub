#!/usr/bin/env python3
"""
Standalone Livestream Server for Dashboard
==========================================
Serves MJPEG on port 5000 for the dashboard Live Feed. No attendance/API dependencies.
- Fetches camera stream continuously with auto-reconnect
- Face recognition: green box + name for enrolled faces
- Uses camera_config.json (same as other scripts)

Usage:
  py livestream_server.py

Dashboard: http://localhost:3000 — Live Feed will use http://localhost:5000/stream
"""

import os
import sys
import time
import threading
from pathlib import Path

# RTSP: force TCP for stable streams (Pinggy, tunnels, etc.)
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import cv2
import numpy as np

# ============== CONFIG ==============
POC_DIR = Path(__file__).resolve().parent
KNOWN_FACES_DIR = POC_DIR / "known_faces"
CONFIDENCE_THRESHOLD = 0.58
TARGET_FPS = 10
RECONNECT_DELAY = 3
DEFAULT_STREAM_PORT = 5000

VIDEO_SOURCE = None
STREAM_PORT = DEFAULT_STREAM_PORT

_latest_frame = None
_frame_lock = threading.Lock()


def load_camera_config():
    """Load video source and stream port from camera_config.json or env."""
    global VIDEO_SOURCE, STREAM_PORT
    config_path = POC_DIR / "camera_config.json"
    if os.environ.get("VIDEO_SOURCE") is not None:
        raw = os.environ.get("VIDEO_SOURCE", "")
        VIDEO_SOURCE = int(raw) if raw.strip().isdigit() else raw.strip()
        STREAM_PORT = int(os.environ.get("STREAM_PORT", str(DEFAULT_STREAM_PORT)))
        return
    if config_path.exists():
        try:
            import json
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            vs = data.get("video_source")
            if vs is not None:
                VIDEO_SOURCE = vs if isinstance(vs, int) else str(vs)
                STREAM_PORT = int(data.get("stream_port", DEFAULT_STREAM_PORT))
                return
        except Exception:
            pass
    # Fallback: webcam
    VIDEO_SOURCE = 0
    STREAM_PORT = DEFAULT_STREAM_PORT


def load_known_faces():
    """Load (name, path) from known_faces/."""
    known = []
    if not KNOWN_FACES_DIR.exists():
        return known
    for p in KNOWN_FACES_DIR.glob("*"):
        if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp"):
            name = p.stem.replace("_", " ")
            known.append((name, str(p)))
    return known


# Embedding cache
_embeddings_cache: dict[str, np.ndarray] = {}
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


def _embed_cv(img: np.ndarray) -> np.ndarray:
    """Simple OpenCV grayscale embedding (no InsightFace)."""
    if img is None or img.size == 0:
        return np.zeros((1,), dtype="float32")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    gray = cv2.resize(gray, (112, 112))
    vec = gray.astype("float32").flatten()
    norm = np.linalg.norm(vec) + 1e-6
    return vec / norm


def _embed_if(img: np.ndarray) -> np.ndarray | None:
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
    Detect faces, compare to known. Returns list of (x, y, w, h, name, confidence).
    Only returns matches above threshold. Green box = enrolled.
    """
    results = []
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    except Exception:
        return results

    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    if cascade.empty():
        return results

    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(50, 50))
    for (x, y, w, h) in faces:
        face_crop = frame[y:y + h, x:x + w]
        best_name = None
        best_score = 0.0

        # InsightFace preferred
        app = _get_insightface()
        if app is not None:
            emb = _embed_if(face_crop)
            if emb is not None:
                for name, ref_path in known_faces:
                    cache_key = f"if:{ref_path}"
                    enc = _embeddings_cache.get(cache_key)
                    if enc is None:
                        ref_img = cv2.imread(ref_path)
                        if ref_img is not None:
                            enc = _embed_if(ref_img)
                            if enc is not None:
                                _embeddings_cache[cache_key] = enc
                    if enc is not None:
                        sim = float(np.dot(emb, enc))
                        if sim > best_score and sim >= CONFIDENCE_THRESHOLD:
                            best_score = sim
                            best_name = name

        # OpenCV fallback
        if best_name is None:
            face_emb = _embed_cv(face_crop)
            for name, ref_path in known_faces:
                cache_key = f"cv:{ref_path}"
                enc = _embeddings_cache.get(cache_key)
                if enc is None:
                    ref_img = cv2.imread(ref_path)
                    if ref_img is not None:
                        enc = _embed_cv(ref_img)
                        _embeddings_cache[cache_key] = enc
                if enc is not None:
                    dist = float(np.linalg.norm(face_emb - enc))
                    score = max(0.0, 1.0 - dist)
                    if score > best_score and score >= CONFIDENCE_THRESHOLD:
                        best_score = score
                        best_name = name

        if best_name:
            results.append((x, y, w, h, best_name, best_score))

    return results


# ============== MJPEG HTTP Server ==============
from http.server import HTTPServer, BaseHTTPRequestHandler


class StreamHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path in ("/", "/stream"):
            self._send_stream()
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
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
                    time.sleep(0.03)
                    continue
                _, jpg = cv2.imencode(".jpg", frame)
                self.wfile.write(b"--frame\r\n")
                self.wfile.write(b"Content-Type: image/jpeg\r\n")
                self.wfile.write(f"Content-Length: {len(jpg)}\r\n".encode())
                self.wfile.write(b"\r\n")
                self.wfile.write(jpg.tobytes())
                self.wfile.write(b"\r\n")
                time.sleep(0.03)
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass


def run_stream_server():
    server = HTTPServer(("0.0.0.0", STREAM_PORT), StreamHandler)
    try:
        server.serve_forever()
    except Exception:
        pass
    finally:
        server.shutdown()


# ============== Main loop ==============
def main():
    global _latest_frame
    load_camera_config()
    known = load_known_faces()
    print(f"Livestream Server — port {STREAM_PORT}")
    print(f"Video: {VIDEO_SOURCE}")
    print(f"Known faces: {len(known)} {[n for n, _ in known]}")
    print(f"Face engine: {'InsightFace' if _get_insightface() else 'OpenCV'}")
    print("Dashboard: http://localhost:3000 — Live Feed uses this stream")
    print("Press Ctrl+C to stop.\n")

    # Start HTTP server
    thread = threading.Thread(target=run_stream_server, daemon=True)
    thread.start()

    frame_interval = 1.0 / TARGET_FPS
    last_frame_time = 0
    cap = None

    while True:
        try:
            if cap is None or not cap.isOpened():
                cap = cv2.VideoCapture(VIDEO_SOURCE)
                if not cap.isOpened():
                    print(f"[WARN] Cannot open camera. Retry in {RECONNECT_DELAY}s...")
                    time.sleep(RECONNECT_DELAY)
                    continue

            ret, frame = cap.read()
            if not ret:
                cap.release()
                cap = None
                print(f"[WARN] Frame read failed. Reconnecting in {RECONNECT_DELAY}s...")
                time.sleep(RECONNECT_DELAY)
                continue

            now = time.time()
            if now - last_frame_time < frame_interval:
                continue
            last_frame_time = now

            # Mirror for webcam
            frame = cv2.flip(frame, 1)

            # Face detection + identification
            matches = find_match(frame, known)
            for (x, y, w, h, name, conf) in matches:
                # Green box for enrolled face
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 3)
                label = f"{name} ({conf:.0%})"
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
                cv2.rectangle(frame, (x, y - th - 10), (x + tw + 8, y), (0, 255, 0), -1)
                cv2.putText(frame, label, (x + 4, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

            with _frame_lock:
                _latest_frame = frame.copy()

        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"[WARN] {e}")
            if cap is not None:
                cap.release()
                cap = None
            time.sleep(RECONNECT_DELAY)

    if cap is not None:
        cap.release()
    print("Done.")


if __name__ == "__main__":
    main()
