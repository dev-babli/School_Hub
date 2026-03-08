# QA Test Strategy — Smart Attendance (Full Project)

**Document Version:** 1.0  
**Date:** February 2025  
**Scope:** End-to-end testing of face recognition attendance, dashboard, APIs, deployment scripts, and WhatsApp integration on a single Windows PC.

---

## 1. Test Strategy & Risk Assessment

### Approach

Testing is structured across six dimensions: functional (happy and negative paths), boundary/edge cases, usability, accessibility, security, and performance. Highest-risk areas are:

| Risk Area | Priority | Rationale |
|-----------|----------|-----------|
| Camera / RTSP reliability | High | Single point of failure; no camera = no attendance |
| WhatsApp provider failure | High | Unclear error surfacing; operator may not know why messages fail |
| students.csv / known_faces mismatch | High | EnrolledFacesCard "CSV ✓ Photo ✗" requires manual remediation |
| API routes unauthenticated | Medium | Dashboard/API exposed on LAN with no auth on API |
| Batch script idempotency | Medium | Re-running setup or partial failures may leave inconsistent state |
| Large students.csv / logs | Medium | File I/O and polling may degrade with scale |

### Test Environments

- Windows 10/11 (single PC)
- Node.js 20+, Python 3.12
- DroidCam or RTSP (per [camera_config.json](../face-recognition-poc/camera_config.json))

---

## 2. Core Test Cases

| Test ID | Type | Scenario Description | Expected Result |
|---------|------|----------------------|-----------------|
| TC-01 | Functional | Run `setup-client.bat` on fresh project | node_modules, venv created; npm install and pip install succeed |
| TC-02 | Functional | Run `start-dashboard.bat` after setup | Dashboard serves at http://localhost:3000; no errors in console |
| TC-03 | Functional | Run `start-attendance.bat` after setup | Python window opens; camera feed starts; no immediate crash |
| TC-04 | Functional | Known face in frame | Python logs recognition; attendance-event API receives POST; log appears in Notifications table |
| TC-05 | Functional | Unknown face in frame | Face auto-enrolled as Guest_&lt;id&gt;; or unknown face reported to API and visible in /admin/unknown-faces |
| TC-06 | Functional | POST /api/attendance-event with valid body | 200; log created; WhatsApp sent (if provider configured); status updated |
| TC-07 | Functional | POST /api/attendance-event with missing student_name | 400; error message; no log created |
| TC-08 | Functional | GET /api/attendance-logs?tenant_id=delhi | 200; logs array and stats returned; tenant filter applied |
| TC-09 | Functional | GET /api/enrolled-faces | 200; students array with hasPhoto per row; CSV names mapped to known_faces |
| TC-10 | Functional | GET /api/unknown-faces | 200; unknown faces list; filterable by status |
| TC-11 | Functional | POST /api/unknown-faces/:id/assign with valid student_id | 200; face assigned; attendance logged; WhatsApp sent |
| TC-12 | Functional | POST /api/unknown-faces/:id/assign with invalid student_id | 404; error; no changes |
| TC-13 | Functional | GET /api/camera-stream (attendance running) | MJPEG stream or {"available":true} when check=1 |
| TC-14 | Functional | Navigate to /admin/dashboard | Dashboard loads; stats, charts, Live Feed, EnrolledFaces, EnrollFace cards visible |
| TC-15 | Functional | Navigate to /admin/face | Face page loads; Live Feed, Face Scan, EnrolledFaces, EnrollmentInfo, EnrollFace cards visible |
| TC-16 | Functional | Click "Start Face Scan" on Face page | FaceScanAnalysis modal opens; pose guidance shown |
| TC-17 | Functional | Run health-check.bat with dashboard + attendance running | Dashboard OK; camera-stream check returns available:true |
| TC-18 | Negative | Start attendance without dashboard | Python runs; API calls to localhost:3000 fail; no crash; attendance still logged locally if applicable |
| TC-19 | Negative | Start dashboard without attendance | Dashboard loads; Live Feed / camera-stream shows error or "stream not available" |
| TC-20 | Negative | No Twilio/Meta in .env | attendance-event returns status:failed; error: "No WhatsApp provider configured"; no fake success |
| TC-21 | Negative | students.csv missing | enrolled-faces returns empty; Python uses demo phone; no crash |

---

## 3. Edge Cases & "Break It" Scenarios

| ID | Scenario | Purpose |
|----|----------|---------|
| EC-01 | **Empty students.csv** (only header row) | Verify enrolled-faces returns empty; Python does not crash; attendance still logs with demo phone |
| EC-02 | **students.csv with 10,000+ rows** | Measure load time for enrolled-faces, students APIs; check for timeouts or memory issues |
| EC-03 | **Malformed students.csv** (missing commas, mixed encodings, BOM) | Verify parseCSVLine handles gracefully; no uncaught exception; partial data or empty result |
| EC-04 | **known_faces/ with 500+ images** | Measure recognition latency; frame interval; CPU usage; potential slowdown in attendance_poc.py |
| EC-05 | **Special characters in student name** (e.g. O'Brien, José, 中文) | Verify CSV parsing, filename mapping (spaces→underscores), and API responses |
| EC-06 | **Camera disconnected mid-session** | Python should handle reconnect or exit cleanly; dashboard Live Feed shows error; health-check reflects unavailable |
| EC-07 | **Corrupt attendanceLogs.json** (invalid JSON) | Verify demoStore handles or recreates; no 500 on attendance-logs |
| EC-08 | **Simultaneous POSTs to attendance-event** (10 concurrent) | All should be processed; no duplicate IDs; WhatsApp rate limits may apply |
| EC-09 | **Assign unknown face with student_id of already-resolved face** | API should reject or handle idempotently; no double WhatsApp |
| EC-10 | **Very long phone number** (50+ digits) or **invalid format** | Validate Twilio/Meta API response; UI shows clear error |
| EC-11 | **Disk full during enrollment** | Known face write fails; error surfaced; no silent corruption |
| EC-12 | **camera_config.json with invalid RTSP URL** | Python should fail fast with clear message; no silent retry loop |

---

## 4. Security & Performance Vulnerabilities

### Security

- **API routes unauthenticated:** All `/api/*` routes bypass auth (middleware excludes `api`). Anyone on LAN can POST attendance-event, assign unknown faces, or read logs.
- **Path traversal:** `face-photo` and `enrolled-faces` derive paths from user-controlled `name`; validate/sanitize to prevent `../` or absolute paths.
- **students.csv injection:** CSV content flows into API responses; ensure no raw injection into HTML (React escapes by default; confirm no `dangerouslySetInnerHTML`).
- **Credentials in .env.local:** Local file; ensure not committed. No hardcoded secrets in code.
- **CORS:** Default Next.js CORS; if dashboard is on different origin, verify CORS allows expected origins only.

### Performance

- **Polling interval:** Dashboard polls attendance-logs every 2s; under high event volume this may add load; consider 5s or websocket for production.
- **Camera stream proxy:** `/api/camera-stream` proxies Python MJPEG; single connection; multiple tabs may increase load.
- **Synchronous CSV read:** `studentsConfig` uses `readFileSync`; blocks event loop on each request; consider caching with TTL for high traffic.
- **No pagination:** attendance-logs and unknown-faces return full lists; large datasets may cause slow responses and UI lag.
- **Python frame processing:** 4 FPS target; CPU-bound; long-running may accumulate memory if OpenCV/numpy leak; monitor over 24h soak.

---

## 5. Performance & Soak Tests

| Test ID | Scenario | Duration | Success Criteria |
|---------|----------|----------|------------------|
| PT-01 | Dashboard + attendance running idle | 4 hours | No crash; memory stable; Live Feed remains responsive |
| PT-02 | Continuous recognition (known face in frame) | 1 hour | Cooldown respected; no duplicate logs; CPU usage acceptable |
| PT-03 | Simulated 100 attendance events (POST loop) | ~5 min | All logged; stats correct; no 500s; WhatsApp rate limits handled |
| PT-04 | 50 unknown faces reported in quick succession | ~2 min | All stored; Unknown Faces page loads; assign works |
| PT-05 | Re-run setup-client.bat after partial failure (e.g. npm install interrupted) | Single run | Idempotent; completes without corruption |
| PT-06 | Start attendance before dashboard is ready | 30s | Python retries or fails gracefully; no crash |

---

## 6. Usability & Accessibility Checks

### Usability

- **Sidebar navigation:** Dashboard, Overview, Students, Unknown Faces, Face, Profile clearly labeled; active route highlighted.
- **Empty states:** Notifications table shows message when no events; EnrolledFaces shows guidance when no students.
- **Error feedback:** WhatsApp failure surfaced in Notifications table (status badge); no silent failure.
- **Campus selector:** CampusContext allows switching tenant; logs table filters by selected campus.
- **Enroll Face flow:** Script instructions visible; "Start enrollment" clearly calls enroll script; operator knows to keep camera still.

### Accessibility (WCAG)

- **Keyboard navigation:** Tab through sidebar, buttons, tables; no keyboard traps.
- **Focus indicators:** Visible focus ring on interactive elements (Chakra default).
- **Color contrast:** Status badges (pending, sent, delivered, failed) distinguishable; text meets 4.5:1 for normal text.
- **ARIA labels:** Buttons (e.g. "Start Face Scan") have accessible names; tables have proper headers.
- **Screen reader:** Table headers associated with cells; live region for toast notifications.
- **Motion:** No critical information conveyed by animation alone; reduce-motion respected if implemented.

---

## 7. Dev/Design Recommendations

1. **Add API authentication:** Protect `/api/*` with API key or session; at minimum require auth for write operations (attendance-event, assign).
2. **Validate and sanitize `name` in face-photo:** Prevent path traversal; reject `../` and absolute paths.
3. **Cache students.csv:** Use in-memory cache with short TTL (e.g. 30s) to avoid blocking on every request.
4. **Add pagination to attendance-logs and unknown-faces:** Limit default page size; support offset or cursor.
5. **Improve WhatsApp error surfacing:** Show provider-specific error (e.g. "Twilio: Invalid phone") in UI; link to docs for common fixes.
6. **Health-check.bat robustness:** Ensure curl is available; add fallback for Windows without curl; exit codes for CI.
7. **Setup-client.bat:** Add checks for Node 20+ and Python 3.12; fail fast with clear messages.
8. **Accessibility audit:** Run axe or Lighthouse a11y; fix critical issues (focus order, aria-labels, contrast).
9. **Soak test in CI:** Optional nightly job to run attendance + dashboard for 1h; alert on crash or memory growth.
10. **Document known limitations:** e.g. "Single camera; no multi-camera support"; "WhatsApp 24h window for free-form messages."

---

## References

- [DEPLOYMENT.md](../DEPLOYMENT.md)
- [CLIENT_VALIDATION_CHECKLIST.md](CLIENT_VALIDATION_CHECKLIST.md)
- [FACIAL_RECOGNITION_BLUEPRINT.md](FACIAL_RECOGNITION_BLUEPRINT.md)
