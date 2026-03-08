# Deployment Guide

## 0. Recommended Client Setup (Single Windows PC)

For most school clients, run everything on **one Windows 10/11 PC** on the same Wi‑Fi as the DroidCam phone.

### One-time setup

1. Install **Node.js 20+** and **Python 3.12** on the PC (ensure `py --version` works in PowerShell).
2. Copy the project folder to a local path, e.g. `C:\SmartAttendance`.
3. Open **PowerShell** and run:

   ```powershell
   cd C:\SmartAttendance\scripts
   .\setup-client.bat
   ```

   This will:

   - install Node dependencies (`npm install`)
   - create a Python venv under `face-recognition-poc\venv`
   - install Python deps from `face-recognition-poc\requirements.txt`

4. Configure `.env.local` in the project root (copy from `.env.example`) with your WhatsApp provider and demo phone. Optionally set `ATTENDANCE_API_KEY` and `NEXT_PUBLIC_ATTENDANCE_API_KEY` (same value) for API write protection; if set, also add `ATTENDANCE_API_KEY` to the environment when running the Python attendance engine.

### Daily operation (operator mode)

1. On the **phone**, open the **DroidCam** app and keep it running.
2. On the PC, start the dashboard:

   ```powershell
   cd C:\SmartAttendance\scripts
   .\start-dashboard.bat
   ```

   - This serves the UI at `http://localhost:3000/admin/dashboard`.

3. In a second PowerShell window, start the attendance engine:

   ```powershell
   cd C:\SmartAttendance\scripts
   .\start-attendance.bat
   ```

   - This runs `attendance_poc.py` using the camera settings from `face-recognition-poc\camera_config.json`.

4. Open the dashboard in a browser (on the same PC or another on the LAN):

   ```text
   http://<PC_IP>:3000/admin/dashboard
   ```

5. To **enroll a new face**, use the **“Enroll Face (Python Script)”** card on the dashboard:

   - Enter student name and parent WhatsApp number (optional)
   - Click **Start enrollment** (Python window opens)
   - Ask the student to face the DroidCam camera until the scan completes
   - The new face will appear in **Enrolled Faces** and will be recognized by the attendance engine

6. To **stop** the system at the end of the day:

   - Close the attendance Python window
   - In the dashboard terminal, press **Ctrl+C** to stop `npm run start`

For troubleshooting, you can run:

```powershell
cd C:\SmartAttendance\scripts
.\health-check.bat
```

which checks the dashboard and camera stream endpoints.

For known limitations, see [docs/LIMITATIONS.md](docs/LIMITATIONS.md).  
For middleman demo flow, see [docs/DEMO_FLOW.md](docs/DEMO_FLOW.md).

---

## 1. Vercel Deployment (Frontend & Backend)

The Next.js app (Dashboard + API) can be deployed to Vercel for free. For a detailed walkthrough, see [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md).

### Steps:

1.  **Push code to GitHub:**
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
    git push -u origin main
    ```

2.  **Deploy on Vercel:**
    - Go to [vercel.com](https://vercel.com) -> **Add New Project**.
    - Import your GitHub repo.
    - **Environment Variables:** Add these in the Vercel dashboard:
        - `TWILIO_ACCOUNT_SID` = `...`
        - `TWILIO_AUTH_TOKEN` = `...`
        - `NEXT_PUBLIC_DEMO_PHONE` = `91...`
        - `NEXT_PUBLIC_TWILIO_SANDBOX_JOIN_PHRASE` = `positive-express` (your sandbox join word from Twilio Console)
    - **Vercel KV (optional):** For persistent attendance logs on Vercel, add a Redis/KV store from the Vercel Marketplace and set `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without KV, logs are in-memory (ephemeral).
    - Click **Deploy**.

3.  **Vercel vs Python:** The dashboard and APIs run on Vercel. The **Python attendance engine must run separately** (local PC, Render, or EC2) because Vercel cannot run long-running OpenCV loops. Set `ATTENDANCE_API_URL` in Python to your Vercel URL.

4.  **Get URL:**
    - Vercel will give you a URL like `https://smart-attendance.vercel.app`.
    - Use this URL in your Python script (`ATTENDANCE_API_URL`).

## 2. Cloud VM Deployment (AI Engine)

The Python script (`attendance_rtsp_opencv.py`) needs to run on a machine that can access the camera stream. Since Vercel is serverless (short timeouts), you need a VM (AWS EC2, DigitalOcean, or a local PC).

### Steps:

1.  **Provision VM:** Ubuntu 22.04 (t3.small or similar).
2.  **Install Dependencies:**
    ```bash
    sudo apt update
    sudo apt install python3-pip python3-venv libgl1-mesa-glx
    ```
3.  **Clone Repo & Setup:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
    cd YOUR_REPO/face-recognition-poc
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    pip install opencv-python-headless  # Headless for server
    ```
4.  **Run Scripts:**
    ```bash
    export ATTENDANCE_API_URL="https://smart-attendance.vercel.app"
    export VIDEO_SOURCE="rtsp://..."
    
    # Run in background (use tmux or screen)
    python3 attendance_rtsp_opencv.py
    ```

## 3. Camera Access (Tailscale VPN)

To access the Dubai camera securely without Pinggy timeouts:

1.  **Install Tailscale** on the Dubai PC (connected to the camera).
2.  **Install Tailscale** on your Cloud VM (or local demo laptop).
3.  **Connect:** Both machines will be on the same private VPN mesh.
4.  **Access:** Use the Dubai PC's Tailscale IP or subnet routing to access the camera RTSP stream directly (e.g., `rtsp://100.x.y.z:554/...`).

This removes the 60-minute limit and provides a stable, permanent connection.
