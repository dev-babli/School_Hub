#!/usr/bin/env python3
"""
Enroll the face currently in front of the camera.
Scans and analyses the face (size, sharpness, stability) then saves to known_faces/
and adds to students.csv. Use this to enroll "Soumeet" with student_id 1 so
attendance_poc.py recognizes this face.

All scripts use the same camera (see camera_config.json).

Usage:
  1. Run: python enroll_face.py
  2. Use saved camera or enter IP/port when prompted
  3. Look at the camera; face is analysed and captured when stable and good quality
  4. Enter name (or Enter for "Soumeet") — will be saved with student_id 1 if name is Soumeet
"""

import csv
import os
import time
from pathlib import Path

import cv2
import numpy as np

from camera_config import load_camera_config, prompt_camera_config, save_camera_config

POC_DIR = Path(__file__).resolve().parent
KNOWN_FACES_DIR = POC_DIR / "known_faces"
STUDENTS_CSV = POC_DIR / "students.csv"
STABLE_SECONDS = 2.0
MIN_FACE_SIZE = (80, 80)
# Quality: minimum Laplacian variance (blur check); face must be this sharp
MIN_SHARPNESS = 80
# Default enrollment name and fixed ID for primary user
DEFAULT_ENROLL_NAME = "Soumeet"
DEFAULT_ENROLL_ID = 1


def _analyse_face_quality(face_crop_gray: np.ndarray) -> tuple[bool, float, str]:
    """
    Analyse face crop: sharpness (blur) and size.
    Returns (ok, sharpness_value, message).
    """
    if face_crop_gray.size == 0:
        return False, 0.0, "No face region"
    h, w = face_crop_gray.shape
    if w < MIN_FACE_SIZE[0] or h < MIN_FACE_SIZE[1]:
        return False, 0.0, "Face too small - move closer"
    # Laplacian variance as sharpness (higher = sharper)
    lap = cv2.Laplacian(face_crop_gray, cv2.CV_64F)
    sharpness = lap.var()
    if sharpness < MIN_SHARPNESS:
        return False, sharpness, f"Too blurry (hold still) — sharpness {sharpness:.0f}"
    return True, sharpness, f"OK — sharpness {sharpness:.0f}"


def add_to_students_csv(
    name: str,
    student_id: int | None = None,
    phone: str = "971582553710",
    tenant_id: str = "delhi",
) -> None:
    """Add or update student. If student_id is set (e.g. 1 for Soumeet), use it."""
    fieldnames = ["name", "student_id", "phone", "tenant_id"]
    rows = []
    if STUDENTS_CSV.exists():
        with open(STUDENTS_CSV, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fn = reader.fieldnames or fieldnames
            for r in reader:
                if (r.get("name") or "").strip() == name:
                    r["phone"] = phone
                    r["tenant_id"] = tenant_id
                    if student_id is not None:
                        r["student_id"] = str(student_id)
                rows.append(r)
            fieldnames = fn

    if not any((r.get("name") or "").strip() == name for r in rows):
        if student_id is not None:
            sid = str(student_id)
        else:
            ids = []
            for r in rows:
                try:
                    ids.append(int(r.get("student_id") or 0))
                except ValueError:
                    pass
            sid = str(max(ids, default=0) + 1)
        rows.append({
            "name": name,
            "student_id": sid,
            "phone": phone,
            "tenant_id": tenant_id,
        })
    # Keep rows sorted by student_id for consistency
    def _sid(r):
        try:
            return int(r.get("student_id") or 0)
        except ValueError:
            return 9999
    rows.sort(key=_sid)
    with open(STUDENTS_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)


def main():
    non_interactive = os.environ.get("ENROLL_NON_INTERACTIVE") == "1"
    video_source, sp = load_camera_config()
    if video_source is None:
        if non_interactive:
            print("No camera_config.json found. Run enroll_face.py once from terminal to configure camera.")
            return
        video_source, _ = prompt_camera_config(ask_stream_port=False)
    else:
        if not non_interactive:
            use = input("  Use saved camera? (Y/n) [Y]: ").strip().lower()
            if use in ("n", "no"):
                video_source, _ = prompt_camera_config(ask_stream_port=False)

    KNOWN_FACES_DIR.mkdir(parents=True, exist_ok=True)

    # Open camera with retries (IP/URL can take a moment)
    cap = cv2.VideoCapture(video_source)
    for attempt in range(2):
        if cap.isOpened():
            break
        cap.release()
        time.sleep(2)
        cap = cv2.VideoCapture(video_source)
    if not cap.isOpened():
        print("\nCould not open camera. Tips:")
        print("  • DroidCam: open the app on your phone, ensure PC and phone are on the same Wi‑Fi.")
        print("  • Test in browser: http://192.168.29.224:4747/video (use your saved IP if different).")
        print("  • Use webcam: run again and enter 0 for IP, or say yes below.")
        try_webcam = input("\nTry webcam (0) instead? [y/N]: ").strip().lower()
        if try_webcam in ("y", "yes"):
            video_source = 0
            save_camera_config(video_source)
            cap = cv2.VideoCapture(0)
        if not cap or not cap.isOpened():
            print("Failed to open camera. Exiting.")
            return

    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    if cascade.empty():
        print("Failed to load Haar cascade.")
        return

    print("Look at the camera. Face will be scanned and analysed (size, sharpness), then captured when stable.")
    print("Press 'q' to quit without saving.\n")

    stable_since = None
    last_rect = None
    captured_frame = None
    captured_rect = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = cascade.detectMultiScale(
            gray, scaleFactor=1.2, minNeighbors=6, minSize=MIN_FACE_SIZE
        )

        if len(faces) == 1:
            x, y, w, h = faces[0]
            rect = (x, y, x + w, y + h)
            # Analyse quality
            pad = 10
            y1, y2 = max(0, y - pad), min(gray.shape[0], y + h + pad)
            x1, x2 = max(0, x - pad), min(gray.shape[1], x + w + pad)
            crop = gray[y1:y2, x1:x2]
            ok, sharpness, msg = _analyse_face_quality(crop)
            if last_rect is not None:
                if (
                    abs(rect[0] - last_rect[0]) < 30
                    and abs(rect[1] - last_rect[1]) < 30
                    and abs(rect[2] - last_rect[2]) < 30
                    and abs(rect[3] - last_rect[3]) < 30
                ):
                    if ok:
                        if stable_since is None:
                            stable_since = time.time()
                        elif (time.time() - stable_since) >= STABLE_SECONDS:
                            captured_frame = frame.copy()
                            captured_rect = rect
                            break
                    else:
                        stable_since = None
                else:
                    stable_since = None
            else:
                stable_since = time.time() if ok else None
            last_rect = rect
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(frame, msg, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        else:
            stable_since = None
            last_rect = None
            msg = "Only one face in frame" if len(faces) > 1 else "Face the camera"
            cv2.putText(frame, msg, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)

        cv2.imshow("Enroll Face", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            cap.release()
            cv2.destroyAllWindows()
            print("Quit without saving.")
            return

    cap.release()
    cv2.destroyAllWindows()

    if captured_frame is None or captured_rect is None:
        print("No face captured.")
        return

    x1, y1, x2, y2 = captured_rect
    pad = 20
    h, w = captured_frame.shape[:2]
    y1 = max(0, y1 - pad)
    x1 = max(0, x1 - pad)
    y2 = min(h, y2 + pad)
    x2 = min(w, x2 + pad)
    face_crop = captured_frame[y1:y2, x1:x2]
    # Final quality check
    gray_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    ok, sharpness, msg = _analyse_face_quality(gray_crop)
    print(f"  Analysis: {msg}")

    default_phone = os.environ.get("ENROLL_PHONE", "").strip() or "971582553710"
    if os.environ.get("ENROLL_NON_INTERACTIVE") == "1":
        name = os.environ.get("ENROLL_NAME", DEFAULT_ENROLL_NAME).strip() or DEFAULT_ENROLL_NAME
        phone = default_phone
    else:
        name = input(f"Enter name for this person [{DEFAULT_ENROLL_NAME}]: ").strip()
        if not name:
            name = DEFAULT_ENROLL_NAME
        phone_in = input(f"Enter parent WhatsApp number [{default_phone}]: ").strip()
        phone = phone_in if phone_in else default_phone
    file_name = name.replace(" ", "_") + ".jpg"
    out_path = KNOWN_FACES_DIR / file_name
    cv2.imwrite(str(out_path), face_crop)
    print(f"Saved face image: {out_path}")

    # Enroll with name, phone, tenant
    enroll_id = DEFAULT_ENROLL_ID if name == DEFAULT_ENROLL_NAME else None
    add_to_students_csv(name, student_id=enroll_id, phone=phone)
    print(f"Added to {STUDENTS_CSV}: {name}" + (f" (student_id={enroll_id})" if enroll_id is not None else ""))

    print("\nDone. Run:  python attendance_poc.py  — this face will be recognized and attendance sent once.")
    print("(All scripts use the same camera from camera_config.json)")


if __name__ == "__main__":
    main()
