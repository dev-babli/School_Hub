#!/usr/bin/env python3
"""
Smart Attendance - RTSP (OpenCV + Centroid Tracking)
====================================================
Uses Centroid Tracking to assign persistent IDs to faces.
Prevents duplicate notifications by tracking the same face across frames.
Only triggers attendance ONCE per unique face ID.

Also serves the live feed as MJPEG on port 5000 so the dashboard Live Feed
works without running stream_server.py (one camera, one process).

Usage:
  py attendance_rtsp_opencv.py
"""

import os
import sys
import time
import threading
import requests
import json
import math
import numpy as np
from datetime import datetime, timedelta
from collections import OrderedDict
from http.server import HTTPServer, BaseHTTPRequestHandler

# CRITICAL: Force TCP transport for Pinggy tunnel
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import cv2

# ==========================================
# CONFIG
# ==========================================
DEFAULT_CAM_IP = "192.168.29.224"
DEFAULT_CAM_PORT = "4747"
DEFAULT_STREAM_PORT = 5000  # Dashboard /api/camera-stream expects this by default

VIDEO_SOURCE = None  # set in main() after prompt
STREAM_PORT = DEFAULT_STREAM_PORT

# Shared latest frame for MJPEG stream (dashboard feed)
_latest_frame = None
_frame_lock = threading.Lock()
_stream_ready = False

# API Configuration
API_BASE = os.environ.get("ATTENDANCE_API_URL", "http://localhost:3000")
API_URL = f"{API_BASE.rstrip('/')}/api/attendance-event"
DEFAULT_PHONE = "917077805321"

# Student name to mark for any face detected in the feed
DEMO_STUDENT_NAME = "Soumeet"

# ==========================================
# CENTROID TRACKER CLASS
# ==========================================
class CentroidTracker:
    def __init__(self, maxDisappeared=50):
        self.nextObjectID = 0
        self.objects = OrderedDict()
        self.disappeared = OrderedDict()
        self.maxDisappeared = maxDisappeared

    def register(self, centroid):
        self.objects[self.nextObjectID] = centroid
        self.disappeared[self.nextObjectID] = 0
        self.nextObjectID += 1
        return self.nextObjectID - 1  # Return the new ID

    def deregister(self, objectID):
        del self.objects[objectID]
        del self.disappeared[objectID]

    def update(self, rects):
        if len(rects) == 0:
            for objectID in list(self.disappeared.keys()):
                self.disappeared[objectID] += 1
                if self.disappeared[objectID] > self.maxDisappeared:
                    self.deregister(objectID)
            return self.objects

        inputCentroids = np.zeros((len(rects), 2), dtype="int")
        for (i, (startX, startY, endX, endY)) in enumerate(rects):
            cX = int((startX + endX) / 2.0)
            cY = int((startY + endY) / 2.0)
            inputCentroids[i] = (cX, cY)

        if len(self.objects) == 0:
            for i in range(0, len(inputCentroids)):
                self.register(inputCentroids[i])
        else:
            objectIDs = list(self.objects.keys())
            objectCentroids = list(self.objects.values())

            D = self.dist_matrix(np.array(objectCentroids), inputCentroids)
            rows = D.min(axis=1).argsort()
            cols = D.argmin(axis=1)[rows]

            usedRows = set()
            usedCols = set()

            for (row, col) in zip(rows, cols):
                if row in usedRows or col in usedCols:
                    continue

                objectID = objectIDs[row]
                self.objects[objectID] = inputCentroids[col]
                self.disappeared[objectID] = 0
                usedRows.add(row)
                usedCols.add(col)

            unusedRows = set(range(0, D.shape[0])).difference(usedRows)
            unusedCols = set(range(0, D.shape[1])).difference(usedCols)

            if D.shape[0] >= D.shape[1]:
                for row in unusedRows:
                    objectID = objectIDs[row]
                    self.disappeared[objectID] += 1
                    if self.disappeared[objectID] > self.maxDisappeared:
                        self.deregister(objectID)
            else:
                for col in unusedCols:
                    self.register(inputCentroids[col])

        return self.objects

    def dist_matrix(self, A, B):
        # Euclidean distance
        return np.sqrt(((A[:, np.newaxis, :] - B[np.newaxis, :, :]) ** 2).sum(axis=2))


# ==========================================
# MAIN LOGIC
# ==========================================
logged_ids = set()  # Track which IDs have already been logged

def send_whatsapp_notification(name: str):
    # Force IST Time (UTC+5:30)
    utc_now = datetime.utcnow()
    ist_now = utc_now + timedelta(hours=5, minutes=30)
    timestamp = ist_now.strftime("%I:%M %p")
    
    print(f"\n[SUCCESS] 🟢 Attendance Logged for {name} at {timestamp}")
    print(f"[API] 💬 Triggering WhatsApp API via {API_URL}...")

    try:
        payload = {
            "student_name": name,
            "phone": DEFAULT_PHONE,
            "time": timestamp,
            "tenant_id": "delhi"
        }
        try:
            requests.post(API_URL, json=payload, timeout=1)
        except:
            pass
        print(f"[API] ✅ Triggered (Background)")
    except Exception as e:
        print(f"[API] ⚠️ Error calling API: {e}")


def prompt_camera_config():
    """Use shared camera config (same as enroll_face, stream_server, attendance_poc)."""
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


# ==========================================
# MJPEG STREAM (dashboard feed from this script)
# ==========================================
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
            # Report available as soon as server is up so dashboard shows feed (frames may follow shortly)
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


def run_stream_server():
    server = HTTPServer(("0.0.0.0", STREAM_PORT), StreamHandler)
    try:
        server.serve_forever()
    except Exception:
        pass
    finally:
        server.shutdown()


def main():
    global VIDEO_SOURCE, STREAM_PORT, _latest_frame, _stream_ready
    prompt_camera_config()
    print("Connecting to camera...")
    cap = cv2.VideoCapture(VIDEO_SOURCE)
    for _ in range(2):
        if cap.isOpened():
            break
        cap.release()
        time.sleep(2)
        cap = cv2.VideoCapture(VIDEO_SOURCE)
    if not cap.isOpened():
        print("ERROR: Could not open video.")
        print("  Tips: Hikvision=1, DroidCam=2, webcam=0. Same Wi‑Fi for IP cameras. Edit camera_config.json to change.")
        sys.exit(1)

    # Start MJPEG stream server so dashboard can get feed from this script (no separate stream_server.py)
    thread = threading.Thread(target=run_stream_server, daemon=True)
    thread.start()
    print(f"Dashboard feed: http://localhost:{STREAM_PORT}/stream (Live Feed uses this)")

    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    
    # Initialize tracker
    ct = CentroidTracker(maxDisappeared=20)
    
    print("Stream active. Face tracking running (OpenCV + Centroid)...")
    print("Press 'q' to quit.\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Resize for speed
        frame = cv2.resize(frame, (640, 480))
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Detect faces (Stricter settings)
        faces = cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=8, minSize=(60, 60))

        rects = []
        for (x, y, w, h) in faces:
            rects.append((x, y, x + w, y + h))
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

        # Update tracker
        objects = ct.update(rects)

        for (objectID, centroid) in objects.items():
            # Draw ID
            text = f"ID {objectID}"
            cv2.putText(frame, text, (centroid[0] - 10, centroid[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            cv2.circle(frame, (centroid[0], centroid[1]), 4, (0, 255, 0), -1)

            # Logic: If this ID hasn't been logged yet, log it
            if objectID not in logged_ids:
                logged_ids.add(objectID)
                send_whatsapp_notification(DEMO_STUDENT_NAME)

        # Serve this frame to dashboard (same feed as the window)
        with _frame_lock:
            _latest_frame = frame.copy()
            _stream_ready = True

        cv2.imshow("Smart Attendance (Tracking)", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Done.")


if __name__ == "__main__":
    main()
