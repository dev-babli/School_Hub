# Face Recognition Attendance (Client Engine)

Local Python engine for the Smart School Attendance System. Runs on a Windows PC, reads the camera feed (DroidCam or webcam), recognizes/enrolls faces, and triggers attendance + WhatsApp via the Next.js API.

## Quick Start (Client Windows PC)

For client deployments, prefer the top-level scripts instead of manual venv management.

1. From the project root (e.g. `C:\SmartAttendance`), run the setup script once:

   ```powershell
   cd C:\SmartAttendance\scripts
   .\setup-client.bat
   ```

2. Configure the camera by enrolling the first face:

   ```powershell
   cd C:\SmartAttendance\face-recognition-poc
   venv\Scripts\python.exe enroll_face.py
   ```

   - Choose camera type: **1**=Hikvision (RTSP), **2**=DroidCam, **0**=webcam
   - Look at the camera until the script captures and asks for a name
   - This creates `camera_config.json`, `known_faces/*.jpg`, and `students.csv`

3. Start the attendance engine:

   ```powershell
   cd C:\SmartAttendance\scripts
   .\start-attendance.bat
   ```

   - This runs `attendance_poc.py` using the camera settings from `camera_config.json`
   - Use the dashboard at `http://<PC_IP>:3000/admin/dashboard` to monitor events

For development or non-Windows use, you can still manage the venv manually as described below.

---

## Manual Setup (Developers)

### 1. Create Virtual Environment

```bash
cd face-recognition-poc
python -m venv venv
```

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Add Known Faces and Students

- **known_faces/**: One photo per person. Filename = person name (use underscore for spaces).
- **students.csv**: Maps name → phone for WhatsApp. Edit to add real parent numbers.

```
known_faces/
├── Rahul_Sharma.jpg
└── Priya_Patel.jpg

students.csv (name,student_id,phone,tenant_id)
Rahul Sharma,1,916371070959,delhi
Priya Patel,2,919876543210,delhi
```

**Tips:**
- Use front-facing, well-lit photos
- Single face per image
- JPG or PNG

### 4. Run Engine

```bash
python attendance_poc.py
```

- Camera source and stream port are read from `camera_config.json` (created by `enroll_face.py`)
- Press **q** to quit

### 5. Expected Output

```
Loaded N known faces: ['Soumeet', 'Guest_2', ...]
Target FPS: 4 | Confidence: 0.6 | Cooldown: 30s
Video: http://192.168.xx.yy:4747/video
Press 'q' to quit.

>>> ATTENDANCE MARKED: Soumeet (confidence: 78.00%)
>>> Triggering WhatsApp API...
```

## Live Feed in Dashboard

The attendance engine (`attendance_poc.py`) exposes an MJPEG stream on the port from `camera_config.json` (default 5000).

- The dashboard proxies this via `/api/camera-stream`
- The **Live Camera Feed** and **Face Scan** components consume the same stream

If the stream is offline, the dashboard shows instructions to run `py attendance_poc.py` from `face-recognition-poc`.

## Integration with Dashboard (Developer Notes)

1. **Start Next.js dashboard:** `npm run dev` (or `npm run start` for production).
2. **Attendance engine:** runs locally and posts events to:
   - `POST /api/attendance-event` (for WhatsApp + logs)
   - `POST /api/unknown-faces` (for manual queue)

## Configuration

Key configuration is controlled via env vars and `camera_config.json`:

| Variable | Default | Description |
|----------|---------|-------------|
| `ATTENDANCE_API_URL` | http://localhost:3000 | Next.js API base; override only if dashboard not on 3000 |
| `TARGET_FPS` | 4 | Frames processed per second |
| `CONFIDENCE_THRESHOLD` | 0.6 | Min similarity to match (0-1) for OpenCV embedding |
| `COOLDOWN_SECONDS` | 30 | Debounce: no duplicate log within N seconds |
| `camera_config.json.video_source` | varies | 0=webcam, `rtsp://...` for Hikvision, `http://ip:port/video` for DroidCam |
| `camera_config.json.stream_port` | 5000 | Port for MJPEG stream consumed by dashboard |

## RTSP (Hikvision) Setup

When prompted for camera type, choose **1** (Hikvision). Enter IP, username, password, and channel (101=main, 102=sub).

Or edit `camera_config.json` manually (see `camera_config.json.example`):

```json
{
  "video_source": "rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101",
  "stream_port": 5000
}
```

**Changing camera IP:** If you change the Hikvision camera IP, edit `camera_config.json` and update the IP in `video_source`. All scripts (enroll_face.py, attendance_poc.py, etc.) read from this file. Or set env: `CAMERA_IP=192.168.x.x` and `CAMERA_PASS=...`.

Camera and PC must be on the same Wi‑Fi.

## Troubleshooting

- **students.csv not updating:** If enrollment runs but `students.csv` stays empty, the camera may have failed to open (check `camera_config.json` IP). If `known_faces/` has images, run: `python sync_students_csv.py` to add those names to the CSV.
- **No known faces:** Create `known_faces/` and add at least one image
- **Camera not found:** Check `VIDEO_SOURCE`; try different indices (1, 2) for multiple cameras
- **Slow performance:** Reduce `TARGET_FPS` to 2; use GPU: `pip install onnxruntime-gpu`
- **DeepFace download fails:** Ensure internet; models cache in `~/.deepface/weights/`

## Next Steps

- Integrate with existing `POST /api/attendance-event` to send real WhatsApp
- Replace webcam with Hikvision RTSP in production
- Migrate to InsightFace for higher FPS (see `docs/FACIAL_RECOGNITION_BLUEPRINT.md`)
