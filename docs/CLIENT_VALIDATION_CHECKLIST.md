# Client Validation Checklist (Single Windows PC)

Use this checklist on a fresh Windows 10/11 machine before handing over to a client.

## 1. Prerequisites

- [ ] Windows 10/11 installed and updated
- [ ] Node.js 20+ installed (`node -v`)
- [ ] Python 3.12 installed (`py --version`)
- [ ] Phone with DroidCam app installed

## 2. First-time Setup

1. [ ] Copy project folder to `C:\SmartAttendance` (or equivalent path).
2. [ ] Open PowerShell and run:

   ```powershell
   cd C:\SmartAttendance\scripts
   .\setup-client.bat
   ```

3. [ ] Create `.env.local` next to `package.json` from `.env.example` and fill in:
   - [ ] `NEXT_PUBLIC_DEMO_PHONE`
   - [ ] Either Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`) or Meta (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`).

## 3. Camera & Enrollment

1. [ ] Start DroidCam on the phone and confirm the preview works.
2. [ ] Open PowerShell:

   ```powershell
   cd C:\SmartAttendance\face-recognition-poc
   venv\Scripts\python.exe enroll_face.py
   ```

3. [ ] Enter DroidCam IP and port when prompted.
4. [ ] Confirm:
   - [ ] A window shows the camera feed.
   - [ ] After holding still, the script captures and asks for a name.
   - [ ] `camera_config.json` is created.
   - [ ] `known_faces\*.jpg` and `students.csv` are created/updated.

## 4. Attendance Engine + Dashboard

1. [ ] Start dashboard:

   ```powershell
   cd C:\SmartAttendance\scripts
   .\start-dashboard.bat
   ```

2. [ ] Start attendance engine in a second window:

   ```powershell
   cd C:\SmartAttendance\scripts
   .\start-attendance.bat
   ```

3. [ ] Open dashboard in a browser:

   ```text
   http://localhost:3000/admin/dashboard
   ```

4. [ ] Verify:
   - [ ] **Live Camera Feed** shows the DroidCam stream.
   - [ ] **Face Scan** uses the same camera.

## 5. End-to-End Attendance

1. [ ] Stand in front of the camera as the enrolled person.
2. [ ] Confirm in the attendance Python window:
   - [ ] The face is recognized by name (not \"Unknown\").
   - [ ] Attendance is logged once per entry (respecting cooldown).
3. [ ] Check dashboard:
   - [ ] New row appears in **Notifications** table with correct name, phone, time.
   - [ ] Status transitions from `pending` → `sent` → `delivered` or `failed`.
4. [ ] Confirm WhatsApp phone receives the message (for at least one test student).

## 6. Unknown Face Handling

1. [ ] Show a **new** face that is not in `known_faces`.
2. [ ] Confirm in Python window:
   - [ ] Face is auto-enrolled as `Guest_<id>` and marked present.
3. [ ] Check **Enrolled Faces** card:
   - [ ] New `Guest_<id>` entry is visible.
4. [ ] On a separate run where auto-enroll is disabled or fails, confirm:
   - [ ] Unknown faces appear on `http://localhost:3000/admin/unknown-faces`.
   - [ ] You can assign an unknown face to a student and that triggers WhatsApp.

## 7. Health & Stop

1. [ ] Run:

   ```powershell
   cd C:\SmartAttendance\scripts
   .\health-check.bat
   ```

   - [ ] Dashboard health returns OK.
   - [ ] Camera stream check returns `{"available":true}` while attendance engine is running.

2. [ ] Stop system by:
   - [ ] Closing the attendance Python window.
   - [ ] Pressing **Ctrl+C** in the dashboard terminal window.

## 8. Handover Notes

- [ ] Confirm with client which phone and number will be used for WhatsApp notifications.
- [ ] Document the exact PC name/IP used to reach the dashboard (e.g. `http://SCHOOL-PC:3000/admin/dashboard`).
- [ ] Confirm client operators can run `start-dashboard.bat` and `start-attendance.bat` without assistance.

