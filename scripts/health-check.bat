@echo off
setlocal
cd /d "%~dp0.."

set EXITCODE=0

echo === Smart Attendance Health Check ===
echo.

echo [1/2] Checking dashboard (http://localhost:3000)...
curl --silent --head http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
  where curl >nul 2>&1
  if %errorlevel% neq 0 (
    echo   curl not found, trying PowerShell...
    powershell -NoProfile -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop; exit 0 } catch { exit 1 }"
  )
)
if %errorlevel% equ 0 (
  echo   Dashboard: OK
) else (
  echo   Dashboard: NOT REACHABLE
  set EXITCODE=1
)

echo.
echo [2/2] Checking camera stream (/api/camera-stream?check=1)...
curl --silent http://localhost:3000/api/camera-stream?check=1 2>nul
if %errorlevel% neq 0 (
  where curl >nul 2>&1
  if %errorlevel% neq 0 (
    echo   curl not found, trying PowerShell...
    powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://localhost:3000/api/camera-stream?check=1' -UseBasicParsing -TimeoutSec 5).Content } catch { '{\"available\":false}' }"
  )
)
echo.

echo If camera check returns {"available":true}, the Python attendance engine is running.
echo.
if %EXITCODE% equ 1 (
  echo Health check FAILED: Dashboard not reachable. Exit code 1.
) else (
  echo Health check done. Exit code 0.
)
endlocal
exit /b %EXITCODE%
