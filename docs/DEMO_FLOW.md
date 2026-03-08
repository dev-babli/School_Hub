# Demo Flow for Middleman / Integrators

This guide helps resellers and integrators run a polished demo for school principals and corporate clients.

---

## Before the Demo

### 1. Twilio Sandbox Setup

1. Sign up at [twilio.com](https://twilio.com) (free trial).
2. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**.
3. In the Sandbox, note the **join phrase** (e.g. `positive-express`).
4. In `.env.local`, set:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `NEXT_PUBLIC_DEMO_PHONE` = your or client’s WhatsApp number for testing
   - `NEXT_PUBLIC_TWILIO_SANDBOX_JOIN_PHRASE` = the sandbox join phrase

### 2. Client Number Must Join Sandbox

Recipients must send `join <sandbox-word>` to **+1 415 523 8886** from WhatsApp before they can receive messages. Do this before the demo.

---

## Demo Steps (3-Step Flow)

### Step 1: System Status

1. Start dashboard: `scripts\start-dashboard.bat`
2. Start attendance engine: `scripts\start-attendance.bat`
3. Open **Demo Setup** or **Dashboard** in the browser.
4. Confirm all indicators are green:
   - **Dashboard:** OK (page loads)
   - **Python Backend:** OK (attendance engine is running)
   - **Camera Stream:** OK

If Python Backend or Camera Stream is red, run `scripts\health-check.bat` and fix any issues.

### Step 2: Twilio Sandbox Onboarding

1. Go to **Demo Setup**.
2. Show the client: “Send **join [word]** to **+1 415 523 8886** from your WhatsApp.”
3. Enter the client’s number and click **Test WhatsApp**.
4. Confirm they receive: “🟢 Test: Smart Attendance demo – WhatsApp is working!”

If the test fails, check Twilio env vars and that the number has joined the sandbox.

### Step 3: Live Event Log

1. Open **Dashboard**.
2. Scroll to the **Notifications** table.
3. When someone stands in front of the camera, their name appears and a WhatsApp message is sent.
4. Show the client their phone receiving: “🟢 Alert: [Name] has safely arrived at [Time].”

---

## Enrollment During Demo

1. Go to **Face** or **Dashboard**.
2. In the **Enroll Face** card, enter:
   - **Name:** e.g. “Priya Sharma”
   - **Phone:** parent’s WhatsApp (must have joined sandbox)
3. Click **Start enrollment**.
4. A Python window opens; ask the client to face the camera and hold still for 2 seconds.
5. The face is saved and appears in **Enrolled Faces**.
6. Next time that person is in frame, attendance is logged and WhatsApp is sent.

---

## Vercel Deployment (Dashboard Only)

For demos where the dashboard is hosted and Python runs locally:

1. Deploy the Next.js app to Vercel.
2. Add env vars (Twilio, demo phone, sandbox join phrase).
3. On the demo laptop, set `ATTENDANCE_API_URL=https://your-app.vercel.app` before running the attendance engine.
4. Set `CAMERA_STREAM_URL=http://<laptop-IP>:5000` in Vercel if the dashboard needs to show the live feed from the laptop.

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| Python Backend not connected | Start `scripts\start-attendance.bat` |
| Test WhatsApp fails | Check Twilio creds; ensure number has joined sandbox |
| Face not recognized | Enroll the face first; ensure good lighting |
| No camera | Start DroidCam on the phone; check `camera_config.json` |
