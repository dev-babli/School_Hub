@echo off
echo === Smart Attendance - Stop Instructions ===
echo.
echo This script does NOT forcibly kill processes to avoid closing other Node/Python apps.
echo To stop the system safely:
echo.
echo   1) Close the "attendance_poc.py" window (Python attendance engine).
echo   2) In the dashboard terminal window, press Ctrl+C to stop "npm run start".
echo.
echo After both windows are closed, the system is fully stopped.
echo.
pause

