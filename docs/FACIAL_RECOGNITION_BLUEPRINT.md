# Smart School Attendance System — Facial Recognition AI Blueprint

**Document Version:** 1.0  
**Date:** February 2025  
**Role:** Lead AI/Computer Vision Engineer & Solutions Architect

---

## Executive Summary

This blueprint outlines the technical architecture for building a custom Facial Recognition AI module that consumes RTSP video from a Hikvision DS-2CD1643G2-LIZSU surveillance camera, identifies students, logs attendance, and triggers WhatsApp notifications to parents. The camera provides only basic motion detection—**no built-in facial recognition**—so we must build the "AI Brain" in software.

---

## 1. AI Model Research & Recommendations

### 1.1 Open-Source / Self-Hosted (Python/Local GPU)

| Framework | Accuracy | Speed (FPS) | Ease of Integration | Notes |
|-----------|----------|-------------|---------------------|-------|
| **InsightFace** | ★★★★★ (SOTA) | ~15–30 FPS (GPU) | Medium | SCRFD detector + ArcFace; NIST-FRVT ranked; ONNX Runtime backend |
| **DeepFace** | ★★★★☆ | ~2–5 FPS | Easy | Wrapper over multiple backends (VGG-Face, ArcFace, etc.); good for prototyping |
| **face_recognition** (dlib) | ★★★☆☆ | ~1–3 FPS | Very Easy | HOG/CNN; simple API; **minimal recent development** |
| **CompreFace** (Exadel) | ★★★★☆ | ~5–10 FPS | Easy | Docker-based; REST API; good for microservices |
| **OpenCV DNN** | ★★☆☆☆ | ~10–20 FPS | Medium | Built-in face detector; no built-in recognition; requires custom pipeline |

#### Detailed Comparison

**InsightFace**
- **Pros:** State-of-the-art (ArcFace, SCRFD); 4.5ms inference with TensorRT; actively maintained; NIST benchmark leader
- **Cons:** ONNX setup; model licensing (non-commercial for some); larger model size (~326MB buffalo_l)
- **Best for:** Production-grade accuracy and speed

**DeepFace**
- **Pros:** Single API for multiple backends; easy to swap models; good documentation
- **Cons:** Slower; heavier dependencies; accuracy varies by backend
- **Best for:** Rapid PoC and experimentation

**face_recognition**
- **Pros:** Simplest API; minimal setup; widely used
- **Cons:** Slow; less accurate than modern models; project largely unmaintained
- **Best for:** Quick demos, not production

**CompreFace**
- **Pros:** REST API; Docker deployment; no Python code for integration
- **Cons:** Requires running a separate service; less control over pipeline
- **Best for:** Teams preferring API-first architecture

---

### 1.2 Commercial / Cloud API

| Service | Pricing (approx.) | Pros | Cons |
|---------|-------------------|------|------|
| **AWS Rekognition** | $0.001/image (1M tier); $0.0008 (next 4M) | Scalable; no infra; 1K free/month | Bandwidth cost; latency; data leaves premises |
| **Azure Face API** | ~$1/1K transactions (S0 tier) | Good accuracy; enterprise support | Similar cloud concerns |
| **Google Cloud Vision** | $1.50/1K (Face Detection) | Part of GCP ecosystem | Face recognition features limited |

#### Cloud Cost Estimate (School Use Case)

- **Assumption:** 500 students, 2 entries/day, 5 FPS sampling → ~3,000 frames/day → ~90K frames/month
- **AWS Rekognition:** ~$90/month (image analysis) + bandwidth (~$5–15)
- **Latency:** 200–500ms per API call; not ideal for real-time
- **Bandwidth:** Each frame ~50–200KB → ~9–18GB/month upload

**Recommendation:** Cloud APIs are viable for **batch processing** or **manual fallback** (unknown faces), but **not** for real-time RTSP processing due to latency and cost.

---

### 1.3 Recommended Model for PoC

**Primary Recommendation: DeepFace (ArcFace backend)**

| Criterion | Rationale |
|-----------|-----------|
| **Ease of setup** | `pip install deepface`; minimal config |
| **Accuracy** | ArcFace backend matches InsightFace quality |
| **PoC speed** | 3–5 FPS sufficient for 3–5 FPS sampling target |
| **Known-faces matching** | Built-in `verify()` and `find()` APIs |
| **Path to production** | Can swap to InsightFace later with similar embedding approach |

**Production Recommendation: InsightFace**

- For production, migrate to InsightFace for higher FPS and TensorRT optimization.
- Same embedding-based workflow; minimal code changes.

---

## 2. System Architecture & Pipeline

### 2.1 High-Level Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Hikvision      │     │  Frame Extractor │     │  Face Detection │
│  RTSP Stream    │────▶│  (3-5 FPS)       │────▶│  & Recognition  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  WhatsApp API   │◀────│  Attendance      │◀────│  Debouncer      │
│  (Twilio/Meta)  │     │  Logger          │     │  (Cooldown)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### 2.2 Frame Extraction (3–5 FPS)

**Problem:** Full 30 FPS would overload CPU/GPU and is unnecessary for attendance.

**Solution:**

```python
# Pseudocode: Frame sampling
TARGET_FPS = 4  # 4 frames per second
FRAME_INTERVAL = 1.0 / TARGET_FPS  # 0.25 seconds

cap = cv2.VideoCapture(rtsp_url)
last_capture_time = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break
    now = time.time()
    if now - last_capture_time >= FRAME_INTERVAL:
        process_frame(frame)  # Send to face recognition
        last_capture_time = now
    else:
        cap.grab()  # Skip frame without decoding (saves CPU)
```

**Alternative: FFmpeg subprocess**

- Use `ffmpeg -i rtsp://... -vf fps=4 -f rawvideo -pix_fmt bgr24 -` for efficient H.264 decoding
- Pipe output to OpenCV or process raw bytes
- Better for H.264 streams where OpenCV struggles

**Key Settings for Hikvision DS-2CD1643G2-LIZSU:**
- RTSP URL: `rtsp://user:pass@ip:554/Streaming/Channels/101`
- Use `-rtsp_transport tcp` for stability
- Resolution: 1080p or 720p (lower = faster)

### 2.3 Debouncing Strategy

**Problem:** A student in frame for 10 seconds → 40+ frames → 40 attendance entries and 40 WhatsApp messages.

**Solution: Per-Identity Cooldown**

```python
# Debounce: One attendance per student per cooldown window
ATTENDANCE_COOLDOWN_SECONDS = 300  # 5 minutes (adjust per school policy)

last_attendance = {}  # {student_id: timestamp}

def should_log_attendance(student_id: str) -> bool:
    now = time.time()
    if student_id not in last_attendance:
        return True
    if now - last_attendance[student_id] >= ATTENDANCE_COOLDOWN_SECONDS:
        return True
    return False

def log_attendance(student_id: str, name: str):
    if not should_log_attendance(student_id):
        return  # Skip duplicate
    last_attendance[student_id] = time.time()
    # ... save to DB, trigger WhatsApp
```

**Additional Safeguards:**
- **Confidence threshold:** Only log if similarity > 0.85 (or 85%)
- **Consecutive frames:** Require 2–3 consecutive matches before logging (reduces false positives)
- **Face quality filter:** Reject blurry or occluded faces (use face quality score if available)

---

## 3. Manual Attendance Fallback

### 3.1 Handling Unknown Faces & Low Confidence

| Scenario | Action |
|----------|--------|
| **No face detected** | Ignore frame |
| **Face detected, no match** | Save crop to "Unknown Faces" queue |
| **Match confidence 0.70–0.85** | Flag for review; optionally log with "needs confirmation" |
| **Match confidence > 0.85** | Auto-log attendance; trigger WhatsApp |

### 3.2 Unknown Faces Workflow

1. **Capture:** When an unknown face is detected, save:
   - Face crop (image)
   - Timestamp
   - Camera ID / location
   - Embedding vector (for later matching)

2. **Queue:** Store in DB table `unknown_faces` with status `pending_review`

3. **Admin UI:** Dashboard showing:
   - Grid of unknown face thumbnails from the morning
   - Search/filter by time range, camera
   - Click a face → modal with:
     - Larger preview
     - Search box: "Assign to student"
     - Dropdown or search of student names
     - On assign: link face to student, log attendance, trigger WhatsApp, mark as resolved

### 3.3 UI Concept (Wireframe)

```
┌─────────────────────────────────────────────────────────────┐
│  Unknown Faces — Morning Rush (7:00 AM - 9:00 AM)           │
├─────────────────────────────────────────────────────────────┤
│  [Filter: All Cameras ▼]  [Date: 2025-02-17]  [Refresh]     │
├─────────────────────────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                 │
│  │ 🧑 │ │ 🧑 │ │ 🧑 │ │ 🧑 │ │ 🧑 │ │ 🧑 │  ...            │
│  │7:02│ │7:05│ │7:08│ │7:12│ │7:15│ │7:18│                 │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                 │
│    [Assign]     [Assign]     [Assign]                        │
├─────────────────────────────────────────────────────────────┤
│  Selected: Face at 7:05 AM — Camera: Main Entrance          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Larger face preview]                              │   │
│  │  Assign to: [Search student...        ▼]            │   │
│  │  [Rahul Sharma] [Priya Patel] [Amit Kumar] ...       │   │
│  │  [Confirm & Send WhatsApp]                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Technical Implementation

- **Backend:** API `POST /api/unknown-faces/:id/assign` with `{ student_id }`
- **On assign:** Update `unknown_faces` status; insert attendance log; call WhatsApp API; optionally add face embedding to student's known faces for future auto-recognition

---

## 4. Proof of Concept (PoC) Code & Setup

### 4.1 PoC Requirements

- Python 3.9+
- Webcam (to simulate RTSP) or RTSP URL
- Folder of known face images (one image per person, filename = name)

### 4.2 Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install opencv-python-headless deepface

# Optional: For faster performance (GPU)
# pip install onnxruntime-gpu
```

### 4.3 Folder Structure

```
attendance-poc/
├── known_faces/          # Put 1 photo per person; filename = "FirstName_LastName.jpg"
│   ├── John_Doe.jpg
│   └── Jane_Smith.jpg
├── attendance_poc.py
└── requirements.txt
```

### 4.4 PoC Script

See `attendance_poc.py` in the `face-recognition-poc/` folder (created below).

---

## 5. Production Migration to InsightFace + TensorRT

### 5.1 When to Migrate

Migrate from DeepFace to InsightFace when:
- Multiple cameras or higher FPS required (e.g. 10+ FPS)
- GPU available for TensorRT acceleration
- Production deployment with latency targets

### 5.2 Migration Steps

1. **Install InsightFace**
   ```bash
   pip install insightface onnxruntime-gpu  # or onnxruntime for CPU
   ```

2. **Replace DeepFace calls with InsightFace**
   - Use `FaceAnalysis(providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])`
   - Load model: `app.prepare(ctx_id=0, det_size=(640, 640))`
   - Detect: `faces = app.get(frame)`; each face has `embedding` (512-dim vector)
   - Compare: cosine similarity between embeddings (no per-face verify loop)

3. **Pre-compute known face embeddings**
   - One-time: load each known face image, run `app.get()`, store embedding in file or DB
   - At runtime: compare live embedding to stored embeddings (vector DB or brute-force for &lt;1000 faces)

4. **TensorRT optimization (optional)**
   - Export SCRFD/ArcFace to TensorRT via ONNX-TensorRT
   - Expect ~4.5ms inference per frame

5. **Update PoC script**
   - Replace `find_match()` to use InsightFace embeddings
   - Keep debouncing, cooldown, and API integration logic unchanged

### 5.3 Code Changes Summary

| Component   | DeepFace (PoC)           | InsightFace (Production)              |
|------------|---------------------------|---------------------------------------|
| Detection  | `extract_faces()`         | `app.get()` → `bbox`, `embedding`     |
| Matching   | `verify()` per known face | Cosine similarity on embeddings       |
| Storage    | Image files               | Embedding vectors (numpy/pickle/DB)   |
| Inference  | 2–5 FPS CPU               | 15–30 FPS GPU                         |

---

## 6. Implemented (Current State)

- PoC with students.csv + attendance-event API integration
- Unknown Faces backend (store, GET/POST APIs, assign API)
- Unknown Faces admin UI at `/admin/unknown-faces`
- PoC reports unknown faces to API when no match found

---

*End of Blueprint*
