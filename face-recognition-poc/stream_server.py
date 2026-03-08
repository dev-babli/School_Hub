#!/usr/bin/env python3
"""
MJPEG Stream Server for Smart Attendance
========================================
Serves live video from webcam or RTSP as MJPEG over HTTP.
Dashboard can embed via /api/camera-stream (Next.js proxy) or http://localhost:5000/stream

Usage:
  py stream_server.py

Environment:
  VIDEO_SOURCE: 0 for webcam, or RTSP URL (e.g. rtsp://...)
  STREAM_PORT: 5000 (default)
"""

import os
import sys
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread

# CRITICAL: Force TCP for RTSP before OpenCV
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import cv2

# Config defaults (overridden by prompt or env)
DEFAULT_CAM_IP = "192.168.29.224"
DEFAULT_CAM_PORT = "4747"
DEFAULT_STREAM_PORT = "5000"

VIDEO_SOURCE = None  # set in main() after prompt
STREAM_PORT = 5000
FRAME_SKIP = int(os.environ.get("STREAM_FPS", "10"))  # ~10 FPS for stream

# Shared capture (one per process)
_cap = None


def get_capture():
    global _cap
    if _cap is None:
        _cap = cv2.VideoCapture(VIDEO_SOURCE)
    return _cap


class StreamHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress default logging

    def do_GET(self):
        if self.path in ("/", "/stream"):
            self.send_stream()
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            cap = get_capture()
            self.wfile.write(b'{"ok":' + str(cap.isOpened()).lower().encode() + b'}')
        else:
            self.send_error(404)

    def send_stream(self):
        cap = get_capture()
        if not cap.isOpened():
            self.send_error(503, "Camera not available")
            return

        self.send_response(200)
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        frame_count = 0
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                frame_count += 1
                if frame_count % max(1, 30 // FRAME_SKIP) != 0:
                    continue
                _, jpg = cv2.imencode(".jpg", frame)
                self.wfile.write(b"--frame\r\n")
                self.wfile.write(b"Content-Type: image/jpeg\r\n")
                self.wfile.write(f"Content-Length: {len(jpg)}\r\n".encode())
                self.wfile.write(b"\r\n")
                self.wfile.write(jpg.tobytes())
                self.wfile.write(b"\r\n")
        except (BrokenPipeError, ConnectionResetError):
            pass


def prompt_camera_config():
    """Use shared camera config (same as enroll_face, attendance_poc, attendance_rtsp_opencv)."""
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
        if os.environ.get("VIDEO_SOURCE") is not None:
            raw = os.environ.get("VIDEO_SOURCE", "")
            VIDEO_SOURCE = int(raw) if raw.isdigit() else raw
            STREAM_PORT = int(os.environ.get("STREAM_PORT", str(DEFAULT_STREAM_PORT)))
            return
        print("Camera source (DroidCam / IP webcam, or webcam)")
        ip = input(f"  IP address (or 0 for webcam) [{DEFAULT_CAM_IP}]: ").strip() or DEFAULT_CAM_IP
        if ip == "0" or ip.lower() == "webcam":
            VIDEO_SOURCE = 0
        else:
            port = input(f"  Port [{DEFAULT_CAM_PORT}]: ").strip() or DEFAULT_CAM_PORT
            VIDEO_SOURCE = f"http://{ip}:{port}/video"
        STREAM_PORT = int(input(f"  Stream server port [{DEFAULT_STREAM_PORT}]: ").strip() or str(DEFAULT_STREAM_PORT))


def main():
    global VIDEO_SOURCE, STREAM_PORT
    prompt_camera_config()
    print("=" * 50)
    print("MJPEG Stream Server")
    print("=" * 50)
    print(f"VIDEO_SOURCE: {VIDEO_SOURCE}")
    print(f"Stream URL: http://localhost:{STREAM_PORT}/stream")
    print("Dashboard: Use /api/camera-stream to proxy this")
    print("Press Ctrl+C to stop.\n")

    cap = cv2.VideoCapture(VIDEO_SOURCE)
    if not cap.isOpened():
        print("ERROR: Could not open video source. Check RTSP URL or try VIDEO_SOURCE=0 for webcam.")
        sys.exit(1)
    cap.release()

    server = HTTPServer(("0.0.0.0", STREAM_PORT), StreamHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
