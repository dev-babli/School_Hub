# Known Limitations

This document lists current limitations of the Smart Attendance system for operator and deployment reference.

## Camera & Hardware

- **Single camera only:** The system supports one camera stream at a time (DroidCam or RTSP). Multi-camera deployments are not supported.
- **Camera dependency:** If the camera disconnects, the attendance engine must be restarted. The dashboard Live Feed will show an error until the Python process is running again.

## WhatsApp

- **24-hour window for free-form messages:** Twilio sandbox free-form messages require the recipient to have messaged the sandbox within the last 24 hours. Outside that window, the system falls back to template messages (e.g. appointment reminder). See [Twilio WhatsApp docs](https://www.twilio.com/docs/whatsapp) for details.
- **One provider at a time:** Either Twilio or Meta WhatsApp Cloud API can be configured. The system tries Twilio first, then Meta. Both cannot be used simultaneously for the same message.

## Data & Scale

- **students.csv as source of truth:** Student data is read from `face-recognition-poc/students.csv`. No database. Large files (e.g. 10,000+ rows) may slow API responses; consider pagination or caching for high-volume deployments.
- **Local file storage:** Attendance logs and unknown faces are stored in `data/attendanceLogs.json` and `data/unknownFaces.json`. No automatic backup or replication.

## API & Security

- **Optional API key:** When `ATTENDANCE_API_KEY` is set, write APIs require the `X-API-Key` header. When unset, APIs are open. For LAN deployments, consider setting the key.
- **Dashboard auth:** Supabase auth is available but currently disabled. The dashboard is accessible without login when auth is off.

## Face Recognition

- **OpenCV-based PoC:** The current `attendance_poc.py` uses OpenCV + NumPy for face matching. For higher accuracy, consider migrating to InsightFace or DeepFace (see [FACIAL_RECOGNITION_BLUEPRINT.md](FACIAL_RECOGNITION_BLUEPRINT.md)).
- **Confidence threshold:** Default 0.6. Adjust in `attendance_poc.py` (`CONFIDENCE_THRESHOLD`) for stricter or looser matching.
- **Auto-enroll of unknowns:** Unknown faces can be auto-enrolled as `Guest_<id>` when enabled. Manual assignment via Unknown Faces UI is the alternative.

## Deployment Scripts

- **Windows-focused:** `setup-client.bat`, `start-dashboard.bat`, `start-attendance.bat`, and `health-check.bat` are written for Windows. Linux/macOS users should use equivalent shell commands or scripts.
- **No automatic restart:** If the attendance engine or dashboard crashes, it does not auto-restart. Operators must restart manually.
