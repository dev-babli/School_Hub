#!/usr/bin/env python3
"""
Enroll a face with minimal capture (3 images: Front, Left, Right).
Shows on-screen instructions: Look at camera, Turn slightly left, Turn slightly right.
Creates a folder per person: known_faces/Asif/img_001.jpg, img_002.jpg, ...
Adds to students.csv for attendance + WhatsApp.

All scripts use the same camera (see camera_config.json).

Usage:
  1. Run: python enroll_face.py
  2. Enter name (e.g. Asif)
  3. Follow on-screen instructions; 3 images captured
  4. Press 'q' to quit without saving
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
STABLE_SECONDS = 0.8  # Faster capture
MIN_FACE_SIZE = (80, 80)
MIN_SHARPNESS = 50  # Slightly lower requirement for budget phones
MIN_IMAGES = 3
DEFAULT_ENROLL_NAME = "Soumeet"
DEFAULT_ENROLL_ID = 1

# On-screen instructions for 3-pose capture
ENROLL_INSTRUCTIONS = [
    "Look at camera (center)",
    "Turn head SLIGHTLY left",
    "Turn head SLIGHTLY right",
]

def _analyse_face_quality(face_crop_gray: np.ndarray) -> tuple[bool, float, str]:
    if face_crop_gray.size == 0:
        return False, 0.0, "No face"
    h, w = face_crop_gray.shape
    if w < MIN_FACE_SIZE[0] or h < MIN_FACE_SIZE[1]:
        return False, 0.0, "Face too small - move closer"
    lap = cv2.Laplacian(face_crop_gray, cv2.CV_64F)
    sharpness = lap.var()
    if sharpness < MIN_SHARPNESS:
        return False, sharpness, f"Too blurry - hold still ({sharpness:.0f})"
    return True, sharpness, f"OK ({sharpness:.0f})"


def add_to_students_csv(
    name: str,
    student_id: int | None = None,
    phone: str = "971582553710",
    tenant_id: str = "delhi",
) -> None:
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
            print("No camera_config.json. Run enroll_face.py once to configure.")
            return
        video_source, _ = prompt_camera_config(ask_stream_port=False)
    else:
        if not non_interactive:
            use = input("  Use saved camera? (Y/n) [Y]: ").strip().lower()
            if use in ("n", "no"):
                video_source, _ = prompt_camera_config(ask_stream_port=False)

    # Get name first
    default_phone = os.environ.get("ENROLL_PHONE", "").strip() or "971582553710"
    if non_interactive:
        name = os.environ.get("ENROLL_NAME", DEFAULT_ENROLL_NAME).strip() or DEFAULT_ENROLL_NAME
        phone = default_phone
    else:
        name = input(f"Enter name for this person [{DEFAULT_ENROLL_NAME}]: ").strip()
        if not name:
            name = DEFAULT_ENROLL_NAME
        phone_in = input(f"Enter parent WhatsApp number [{default_phone}]: ").strip()
        phone = phone_in if phone_in else default_phone

    KNOWN_FACES_DIR.mkdir(parents=True, exist_ok=True)
    person_dir = KNOWN_FACES_DIR / name.replace(" ", "_")
    person_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(video_source)
    for attempt in range(2):
        if cap.isOpened():
            break
        cap.release()
        time.sleep(2)
        cap = cv2.VideoCapture(video_source)
    if not cap.isOpened():
        print("Could not open camera.")
        return

    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    if cascade.empty():
        print("Failed to load Haar cascade.")
        return

    captured_images = []
    last_capture_time = 0
    stable_since = None
    last_rect = None
    
    # Simple instruction index based on count
    # 0 -> Center, 1 -> Left, 2 -> Right

    print(f"\nEnrolling: {name}")
    print(f"Need {MIN_IMAGES} images. Follow the on-screen instructions.")
    print("Press 'q' to quit without saving.\n")

    while len(captured_images) < MIN_IMAGES:
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = cascade.detectMultiScale(
            gray, scaleFactor=1.2, minNeighbors=6, minSize=MIN_FACE_SIZE
        )

        # Instruction based on current count
        instruction_idx = min(len(captured_images), len(ENROLL_INSTRUCTIONS) - 1)
        instruction = ENROLL_INSTRUCTIONS[instruction_idx]

        if len(faces) == 1:
            x, y, w, h = faces[0]
            rect = (x, y, x + w, y + h)
            pad = 10
            y1, y2 = max(0, y - pad), min(gray.shape[0], y + h + pad)
            x1, x2 = max(0, x - pad), min(gray.shape[1], x + w + pad)
            crop = gray[y1:y2, x1:x2]
            ok, sharpness, msg = _analyse_face_quality(crop)

            if last_rect is not None:
                if (
                    abs(rect[0] - last_rect[0]) < 40
                    and abs(rect[1] - last_rect[1]) < 40
                    and abs(rect[2] - last_rect[2]) < 40
                    and abs(rect[3] - last_rect[3]) < 40
                ):
                    if ok:
                        now = time.time()
                        if stable_since is None:
                            stable_since = now
                        elif (now - stable_since) >= STABLE_SECONDS:
                            if now - last_capture_time > 0.5: # 0.5s delay between captures
                                pad2 = 20
                                hf, wf = frame.shape[:2]
                                y1f = max(0, y - pad2)
                                x1f = max(0, x - pad2)
                                y2f = min(hf, y + h + pad2)
                                x2f = min(wf, x + w + pad2)
                                face_crop = frame[y1f:y2f, x1f:x2f]
                                captured_images.append(face_crop)
                                last_capture_time = now
                                stable_since = None
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

        # On-screen instructions
        cv2.rectangle(frame, (0, 0), (frame.shape[1], 100), (40, 40, 40), -1)
        cv2.putText(frame, f"INSTRUCTION: {instruction}", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 255), 2)
        cv2.putText(frame, f"Captured: {len(captured_images)}/{MIN_IMAGES}", (20, 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)
        if len(faces) != 1:
            hint = "Only one face in frame" if len(faces) > 1 else "Face the camera"
            cv2.putText(frame, hint, (20, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 1)

        cv2.imshow("Enroll Face - Follow Instructions", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            cap.release()
            cv2.destroyAllWindows()
            print("Quit without saving.")
            return

    cap.release()
    cv2.destroyAllWindows()

    if len(captured_images) < MIN_IMAGES:
        print(f"Only {len(captured_images)} images. Need {MIN_IMAGES}. Enrollment cancelled.")
        return

    for i, img in enumerate(captured_images):
        out_path = person_dir / f"img_{i + 1:03d}.jpg"
        cv2.imwrite(str(out_path), img)
    print(f"Saved {len(captured_images)} images to {person_dir}")

    enroll_id = DEFAULT_ENROLL_ID if name == DEFAULT_ENROLL_NAME else None
    add_to_students_csv(name, student_id=enroll_id, phone=phone)
    print(f"Added to {STUDENTS_CSV}: {name}")

    print("\nDone. Run:  python attendance_poc.py")
    print("Face will be recognized, green box + name, WhatsApp once per person per day.")


if __name__ == "__main__":
    main()
