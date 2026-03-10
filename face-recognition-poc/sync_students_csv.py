#!/usr/bin/env python3
"""
Sync students.csv from known_faces.
Adds any person in known_faces/ who is missing from students.csv.
Use when students.csv is not updating after enrollment (e.g. camera failed before CSV write).

Usage: python sync_students_csv.py
       python sync_students_csv.py --phone 919876543210
"""

import argparse
import csv
from pathlib import Path

POC_DIR = Path(__file__).resolve().parent
KNOWN_FACES_DIR = POC_DIR / "known_faces"
STUDENTS_CSV = POC_DIR / "students.csv"
EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp")


def get_names_from_known_faces() -> set[str]:
    names = set()
    if not KNOWN_FACES_DIR.exists():
        return names
    for item in KNOWN_FACES_DIR.iterdir():
        if item.is_dir():
            if any(f.suffix.lower() in EXTENSIONS for f in item.iterdir() if f.is_file()):
                names.add(item.name.replace("_", " "))
        elif item.suffix.lower() in EXTENSIONS:
            names.add(item.stem.replace("_", " "))
    return names


def get_existing_names() -> set[str]:
    names = set()
    if not STUDENTS_CSV.exists():
        return names
    with open(STUDENTS_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            n = (row.get("name") or "").strip()
            if n:
                names.add(n)
    return names


def add_to_csv(name: str, phone: str, tenant_id: str) -> None:
    fieldnames = ["name", "student_id", "phone", "tenant_id"]
    rows = []
    if STUDENTS_CSV.exists():
        with open(STUDENTS_CSV, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fn = reader.fieldnames or fieldnames
            for r in reader:
                rows.append(r)
            fieldnames = fn
    existing_ids = []
    for r in rows:
        try:
            existing_ids.append(int(r.get("student_id") or 0))
        except ValueError:
            pass
    next_id = str(max(existing_ids, default=0) + 1)
    rows.append({"name": name, "student_id": next_id, "phone": phone, "tenant_id": tenant_id})
    rows.sort(key=lambda r: int(r.get("student_id") or 9999))

    STUDENTS_CSV.parent.mkdir(parents=True, exist_ok=True)
    with open(STUDENTS_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"  Added: {name} (phone: {phone})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phone", default="971582553710", help="Default phone for new entries")
    ap.add_argument("--tenant", default="delhi", help="Default tenant_id")
    args = ap.parse_args()

    known = get_names_from_known_faces()
    existing = get_existing_names()
    to_add = known - existing

    if not known:
        print("No faces in known_faces/. Run enroll_face.py first.")
        return
    if not to_add:
        print(f"students.csv already has all {len(known)} person(s) from known_faces. Nothing to add.")
        return

    print(f"Adding {len(to_add)} missing to students.csv: {', '.join(sorted(to_add))}")
    for name in sorted(to_add):
        add_to_csv(name, args.phone, args.tenant)
    print(f"Done. students.csv updated.")


if __name__ == "__main__":
    main()
