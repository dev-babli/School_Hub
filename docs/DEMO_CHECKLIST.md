# Demo Checklist – Smart Attendance & WhatsApp

## Before Demo

- [ ] **Env** – `.env.local` has `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `NEXT_PUBLIC_TWILIO_SANDBOX_JOIN_PHRASE`
- [ ] **Sandbox** – Client sends **join [phrase]** to +1 415 523 8886 from their WhatsApp
- [ ] **Camera** – Webcam/DroidCam on same Wi‑Fi; `camera_config.json` or env `VIDEO_SOURCE` set
- [ ] **Enrolled faces** – At least one face in `face-recognition-poc/known_faces/`
- [ ] **Demo mode** – Set `DEMO_MODE=1` for relaxed threshold (0.55) and shorter cooldown (10s)
- [ ] **Start services**
  1. `npm run dev` (Next.js)
  2. `scripts\start-attendance.bat` (Python)
- [ ] **Pre-flight** – Demo Setup card: all checks green (Python, Camera, Enrolled face, WhatsApp test send)

## During Demo

1. Open dashboard, confirm "System ready for demo"
2. Show Live Feed; client’s face should be detected
3. Face is recognized → attendance logged → WhatsApp sent
4. If same person needs a repeat: click **Reset Cooldowns**

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Face not detected | Better lighting, face camera directly, check Haar params (1.1, 5) |
| "Face not recognized" | Add face to `known_faces/` and run `enroll_face.py` |
| WhatsApp not sent | Client must send join phrase; Test WhatsApp in Demo Setup |
| Python not running | Run `scripts\start-attendance.bat`; check port 5000 free |
| Same person blocked | Click Reset Cooldowns or set `DEMO_MODE=1` |
