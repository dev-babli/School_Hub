#!/usr/bin/env python3
"""
Smart Attendance - RTSP Face Recognition (Pinggy Tunnel)
========================================================
Reads live RTSP stream from Hikvision camera (via Pinggy tunnel),
identifies enrolled students, and triggers attendance log with debouncing.

CRITICAL: OPENCV_FFMPEG_CAPTURE_OPTIONS must be set BEFORE cv2.VideoCapture()
to ensure stable RTSP over the international tunnel (TCP transport).

Usage:
  1. Create folder: student_faces/
  2. Add photos: student_faces/John_Doe.jpg, student_faces/Jane_Smith.jpg (filename = person name)
  3. Set CAMERA_PASS below or pass via env ATTENDANCE_CAMERA_PASS
  4. Run: python attendance_rtsp_pinggy.py

Press 'q' to quit.
"""

import os
import sys
import time
import requests
import json
from datetime import datetime
from pathlib import Path

# CRITICAL: Force TCP transport for Pinggy/international tunnel BEFORE OpenCV
# Without this, the stream will drop frames and fail over long distances
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import cv2
import face_recognition

# ==========================================
# 1. MASTER CONFIGURATION
# ==========================================
CAMERA_USER = "admin"
CAMERA_PASS = os.environ.get("ATTENDANCE_CAMERA_PASS", "YOUR_PASSWORD")

# Pinggy tunnel (Dubai camera -> your local machine)
PINGGY_HOST = "ietvx-2-50-174-173.a.free.pinggy.link"
PINGGY_PORT = "41789"
RTSP_PATH = "/Streaming/Channels/102"
RTSP_URL = f"rtsp://admin:Swayam631$ZMn756@{PINGGY_HOST}:{PINGGY_PORT}{RTSP_PATH}"

# Student faces folder (filename stem = person name, e.g. John_Doe.jpg -> "John Doe")
SCRIPT_DIR = Path(__file__).parent
STUDENT_FACES_DIR = SCRIPT_DIR / "student_faces"

# Recognition
FACE_MATCH_TOLERANCE = 0.55  # Lower = stricter (0.6 default; 0.5-0.55 reduces false positives)
TARGET_FPS = 3  # Process 3 frames/sec to reduce CPU load on full video

# Debouncing: log each person at most once per COOLDOWN_SECONDS
COOLDOWN_SECONDS = 300  # 5 minutes

# API Configuration (set ATTENDANCE_API_URL=http://localhost:3001 if Next.js runs on 3001)
API_BASE = os.environ.get("ATTENDANCE_API_URL", "http://localhost:3000")
API_URL = f"{API_BASE.rstrip('/')}/api/attendance-event"
DEFAULT_PHONE = "917077805321"  # User's phone number

# ==========================================
# 2. STATE MANAGEMENT (DEBOUNCING)
# ==========================================
last_seen_dict = {}  # {student_name: timestamp}
last_frame_time = 0
frame_interval = 1.0 / TARGET_FPS

# Pre-loaded face encodings: [(name, encoding), ...]
known_face_encodings = []
known_face_names = []


def load_student_faces():
    """Load and encode known faces from student_faces/ folder."""
    global known_face_encodings, known_face_names
    known_face_encodings = []
    known_face_names = []

    if not STUDENT_FACES_DIR.exists():
        print(f"[ERROR] Folder '{STUDENT_FACES_DIR}' not found. Create it and add photos.")
        return False

    extensions = (".jpg", ".jpeg", ".png", ".bmp")
    count = 0

    for path in sorted(STUDENT_FACES_DIR.iterdir()):
        if path.suffix.lower() not in extensions:
            continue
        name = path.stem.replace("_", " ")  # John_Doe.jpg -> John Doe

        try:
            img = face_recognition.load_image_file(str(path))
            encodings = face_recognition.face_encodings(img)
            if not encodings:
                print(f"[WARN] No face found in {path.name}, skipping.")
                continue
            known_face_encodings.append(encodings[0])
            known_face_names.append(name)
            count += 1
        except Exception as e:
            print(f"[WARN] Failed to load {path.name}: {e}")

    if count == 0:
        print("[ERROR] No valid face images found. Add photos to student_faces/")
        return False

    print(f"[OK] Loaded {count} known faces: {known_face_names}")
    return True


def send_whatsapp_notification(name: str):
    """
    Call the Next.js API to log attendance and trigger WhatsApp.
    """
    timestamp = time.strftime("%I:%M %p")
    print(f"\n[SUCCESS] 🟢 Attendance Logged for {name} at {timestamp}")
    print(f"[API] 💬 Triggering WhatsApp API via {API_URL}...")

    try:
        payload = {
            "student_name": name,
            "phone": DEFAULT_PHONE,
            "time": timestamp,
            "tenant_id": "delhi"  # Default to Delhi for demo
        }
        
        response = requests.post(API_URL, json=payload, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"[API] ✅ Success! Status: {data.get('status')}")
        else:
            print(f"[API] ❌ Failed: {response.text}")
            
    except Exception as e:
        print(f"[API] ⚠️ Error calling API: {e}")


def check_and_log_attendance(student_name: str) -> bool:
    """
    Check debounce; if allowed, log attendance and trigger WhatsApp.
    Returns True if attendance was logged.
    """
    current_time = time.time()
    if student_name not in last_seen_dict or (current_time - last_seen_dict[student_name]) >= COOLDOWN_SECONDS:
        last_seen_dict[student_name] = current_time
        send_whatsapp_notification(student_name)
        return True
    return False


def match_face(frame, face_locations):
    """
    For each face in frame, find best matching student.
    Returns list of (top, right, bottom, left, name_or_None, distance).
    """
    if not face_locations or not known_face_encodings:
        return []

    # Get encodings for all faces in this frame (rgb for face_recognition)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    face_encodings = face_recognition.face_encodings(rgb, face_locations)

    results = []
    for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
        matches = face_recognition.compare_faces(
            known_face_encodings, face_encoding, tolerance=FACE_MATCH_TOLERANCE
        )
        name = None
        best_distance = float("inf")

        if True in matches:
            distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            best_idx = min(range(len(distances)), key=lambda i: distances[i])
            if matches[best_idx]:
                name = known_face_names[best_idx]
                best_distance = float(distances[best_idx])

        results.append((top, right, bottom, left, name, best_distance))

    return results


# ==========================================
# 3. MAIN VIDEO LOOP
# ==========================================
def main():
    print("=" * 60)
    print("Smart Attendance - Dubai Camera via Pinggy Tunnel")
    print("=" * 60)
    print(f"Connecting to: {PINGGY_HOST}:{PINGGY_PORT}")
    print(f"Stream: {RTSP_PATH}")
    print(f"Debounce: {COOLDOWN_SECONDS}s | Match tolerance: {FACE_MATCH_TOLERANCE}")
    print("Press 'q' to quit.\n")

    if not load_student_faces():
        sys.exit(1)

    cap = cv2.VideoCapture(RTSP_URL)

    if not cap.isOpened():
        print("[ERROR] Connection failed. Check:")
        print("  - Pinggy tunnel is running (60-min sessions expire)")
        print("  - RTSP URL and password are correct")
        print("  - OPENCV_FFMPEG_CAPTURE_OPTIONS is set (rtsp_transport;tcp)")
        sys.exit(1)

    print("[OK] Stream active. Commencing AI analysis...\n")
    global last_frame_time
    last_frame_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[WARN] Frame read failed. Stream may have dropped.")
            break

        now = time.time()
        if now - last_frame_time < frame_interval:
            cap.grab()
            continue
        last_frame_time = now

        # Resize for faster processing (optional but helps on low-end machines)
        small = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
        rgb_small = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(rgb_small, model="hog")
        # Scale back to original frame coordinates
        scale = 2
        face_locations_full = [
            (top * scale, right * scale, bottom * scale, left * scale)
            for (top, right, bottom, left) in face_locations
        ]

        matches = match_face(frame, face_locations_full)

        for (top, right, bottom, left, name, _) in matches:
            color = (0, 255, 0) if name else (0, 0, 255)
            label = name if name else "Unknown"

            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            cv2.rectangle(frame, (left, top - 35), (right, top), color, cv2.FILLED)
            cv2.putText(
                frame, label, (left + 6, top - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2
            )

            if name:
                check_and_log_attendance(name)

        cv2.imshow("Smart Attendance (Dubai Feed)", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Done.")


if __name__ == "__main__":
    main()
