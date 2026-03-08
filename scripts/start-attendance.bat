@echo off
setlocal
cd /d "%~dp0..\face-recognition-poc"

if not exist "venv\Scripts\python.exe" (
  echo Python virtual environment not found. Run scripts\setup-client.bat from the project root first.
  pause
  goto :eof
)

echo Starting attendance engine (camera + recognition)...
echo Ensure the DroidCam app is running on the phone and the camera_config.json is correct.
echo Press Ctrl+C in this window or close it to stop attendance.
echo.
call venv\Scripts\python.exe attendance_poc.py

endlocal

