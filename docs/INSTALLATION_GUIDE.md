# SchoolHub – Client PC Installation Guide

Complete step-by-step guide to install SchoolHub on a client’s Windows PC.

---

## 1. Prerequisites

Install these before starting:

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | 18+ (LTS) | https://nodejs.org |
| **Python** | 3.9–3.12 | https://www.python.org/downloads/ or `winget install Python.Python.3.12` |
| **Git** | Latest | https://git-scm.com/download/win (optional if using ZIP) |

During Python install, enable **“Add Python to PATH”**.

---

## 2. Get the Project

### Option A: Clone (if Git is installed)

```powershell
cd C:\
git clone https://github.com/dev-babli/School_Hub.git SchoolHub
cd SchoolHub
```

### Option B: Download ZIP

1. Download the project ZIP from GitHub and extract to `C:\SchoolHub` (or your preferred folder).
2. Open Command Prompt or PowerShell and run:
   ```powershell
   cd C:\SchoolHub
   ```

---

## 3. Run Setup Script

From the project root, run the setup script once. This installs Node.js and Python dependencies.

```powershell
cd C:\SchoolHub
scripts\setup-client.bat
```

This script will:

1. Install Node.js packages (npm install)
2. Create a Python virtual environment
3. Install Python packages (OpenCV, face_recognition, requests)

If you see errors:

- **Node.js not found** → Install Node.js from https://nodejs.org
- **Python not found** → Install Python and ensure “Add to PATH” was selected
- **dlib/face_recognition fails** → Run:  
  `face-recognition-poc\venv\Scripts\pip.exe install cmake`  
  then rerun `scripts\setup-client.bat`

---

## 4. Environment Configuration

1. Copy the example env file:
   ```powershell
   copy .env.example .env.local
   ```

2. Edit ` .env.local` with Notepad or any editor. At minimum, set:

   ```ini
   # Phone for WhatsApp demo (10 digits or 91XXXXXXXXXX)
   NEXT_PUBLIC_DEMO_PHONE=919876543210

   # For demo mode: relaxed threshold, shorter cooldown
   DEMO_MODE=1
   ```

3. **WhatsApp (Twilio Sandbox):**

   - Sign up at https://twilio.com
   - Go to **Try WhatsApp** → Sandbox
   - Note the **join phrase** (e.g. `positive-express`)
   - Add to `.env.local`:

   ```ini
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   NEXT_PUBLIC_TWILIO_SANDBOX_JOIN_PHRASE=your-join-phrase
   ```

   Parents must send **“join &lt;phrase&gt;”** to **+1 415 523 8886** from WhatsApp before they can receive attendance alerts.

---

## 5. First-Time Build (Dashboard)

Build the Next.js app once so you can run it in production mode:

```powershell
cd C:\SchoolHub
npm run build
```

This can take 1–2 minutes.

---

## 6. Enroll Faces (First Time)

Before attendance works, you need at least one enrolled face:

1. Start the Python environment:
   ```powershell
   cd C:\SchoolHub\face-recognition-poc
   venv\Scripts\python.exe enroll_face.py
   ```

2. When asked for the camera source:
   - Type `0` for built-in webcam
   - Type `1` for Hikvision (RTSP) — enter IP, username, password, channel
   - Type `2` for DroidCam — enter IP and port (e.g. `192.168.29.224`, `4747`)

3. Look at the camera; the script will capture your face and ask for your name.

4. This creates:
   - `face-recognition-poc/known_faces/Your_Name.jpg`
   - `face-recognition-poc/students.csv`
   - `face-recognition-poc/camera_config.json`

5. To add more people, run `enroll_face.py` again.

---

## 7. Start the Application

You need two processes running: dashboard and attendance.

### Terminal 1: Dashboard

```powershell
cd C:\SchoolHub
scripts\start-dashboard.bat
```

- Uses `npm run start` (production) if you ran `npm run build`.
- If not built, use: `npm run dev` instead.

Dashboard will be at: **http://localhost:3000**

### Terminal 2: Attendance (Face Recognition)

```powershell
cd C:\SchoolHub
scripts\start-attendance.bat
```

- Opens the camera and starts face recognition.
- Press **q** in this window to stop.

---

## 8. Access the Dashboard

1. Open a browser and go to **http://localhost:3000**
2. Click **Login** (or go to `/auth/login`)
3. Enter any credentials and log in (local auth)
4. Go to **Demo Setup** (or `/admin/demo-setup`):
   - Check that Python Backend, Camera Stream, Enrolled Faces, and WhatsApp are OK
   - Run a WhatsApp test if needed
5. Use **Dashboard** for the main SchoolHub UI and **Live Feed** for the camera.

---

## 9. Quick Reference

| Task | Command |
|------|---------|
| One-time setup | `scripts\setup-client.bat` |
| Build dashboard | `npm run build` |
| Start dashboard | `scripts\start-dashboard.bat` or `npm run dev` |
| Start attendance | `scripts\start-attendance.bat` |
| Enroll new face | `cd face-recognition-poc` then `venv\Scripts\python.exe enroll_face.py` |
| Reset cooldowns | Use the **Reset Cooldowns** button in Demo Setup |

---

## 10. Troubleshooting

| Issue | Solution |
|-------|----------|
| **“Node.js not found”** | Install Node.js and restart the terminal |
| **“Python not found”** | Install Python with “Add to PATH” enabled |
| **face_recognition install fails** | Run: `venv\Scripts\pip.exe install cmake`, then retry setup |
| **Camera not detected** | Use `0` for webcam; for Hikvision, use `1` and enter RTSP credentials; for DroidCam, use `2` and ensure same Wi‑Fi |
| **Dashboard blank / hangs** | Clear browser cache; ensure no firewall blocking localhost |
| **WhatsApp not sending** | Parents must send “join &lt;phrase&gt;” to +1 415 523 8886 first |
| **Port 3000 in use** | Change port: `set PORT=3001 && npm run dev` |
| **Port 5000 in use** | Edit `face-recognition-poc/camera_config.json` and set another `stream_port` |

---

## 11. Optional: Hikvision Camera (RTSP)

Use a Hikvision IP camera when the camera and client PC are on the same Wi‑Fi.

1. Find the camera IP on your router or Hikvision SADP tool.
2. Run `enroll_face.py` or `attendance_poc.py` and choose **1** (Hikvision) when asked for camera type.
3. Enter:
   - **IP** (e.g. `192.168.1.100`)
   - **Username** (usually `admin`)
   - **Password**
   - **Channel** (`101` = main stream, `102` = sub stream)
4. Config is saved to `camera_config.json`. Example:

   ```json
   {
     "video_source": "rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101",
     "stream_port": 5000
   }
   ```

5. For manual config, copy `camera_config.json.example` and edit the RTSP URL.

---

## 12. Optional: DroidCam (Phone as Camera)

1. Install **DroidCam** (phone) and **DroidCam Client** (PC).
2. Connect phone and PC to the same Wi‑Fi.
3. Start DroidCam on the phone; note the IP and port (e.g. `192.168.29.224:4747`).
4. When running `enroll_face.py`, choose **2** (DroidCam/IP webcam) and enter that IP and port.

---

## 13. File Structure After Install

```
C:\SchoolHub\
├── .env.local              ← Your config (create from .env.example)
├── node_modules/           ← Node packages (created by setup)
├── face-recognition-poc/
│   ├── venv/               ← Python env (created by setup)
│   ├── known_faces/        ← Enrolled face images
│   ├── students.csv        ← Name → phone mapping
│   └── camera_config.json  ← Camera settings
└── scripts/
    ├── setup-client.bat    ← Run once
    ├── start-dashboard.bat ← Start dashboard
    └── start-attendance.bat← Start face recognition
```
