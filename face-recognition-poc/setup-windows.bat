@echo off
setlocal

echo === Smart Attendance Face Recognition PoC - Windows Setup ===
echo.
echo 1) Creating virtual environment ".venv" (Python 3.9+ recommended)...

python -m venv .venv
if errorlevel 1 (
  echo Failed to create virtual environment. Make sure Python is installed and on PATH.
  pause
  exit /b 1
)

echo.
echo 2) Activating virtual environment...
call .venv\Scripts\activate.bat

echo.
echo 3) Installing minimal dependencies (OpenCV + requests)...
pip install --upgrade pip
pip install -r requirements-minimal.txt

echo.
echo Setup complete.
echo.
echo To run the demo with your webcam:
echo   cd face-recognition-poc
echo   call .venv\Scripts\activate.bat
echo   set VIDEO_SOURCE=0
echo   py attendance_rtsp_opencv.py
echo.
echo To use DroidCam (WiFi):
echo   set VIDEO_SOURCE=http://YOUR_PHONE_IP:4747/video
echo   py attendance_rtsp_opencv.py
echo.
echo To use an RTSP stream:
echo   set VIDEO_SOURCE=rtsp://YOUR_RTSP_URL
echo   py attendance_rtsp_opencv.py
echo.
pause

endlocal

