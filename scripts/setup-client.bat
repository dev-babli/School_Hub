@echo off
setlocal
echo === Smart Attendance - Client Setup ===

cd /d "%~dp0.."

if not exist "package.json" (
  echo ERROR: This script must be run from the project root ^(scripts\setup-client.bat^).
  pause
  exit /b 1
)

echo.
echo Checking prerequisites...
node -v >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Node.js not found. Install Node.js 20+ from https://nodejs.org
  pause
  exit /b 1
)
for /f "tokens=1 delims=v" %%a in ('node -v 2^>nul') do set NODE_VER=%%a
echo   Node.js: %NODE_VER%

set PY_CMD=
py -3.12 --version >nul 2>&1 && set PY_CMD=py -3.12
if "%PY_CMD%"=="" py -3.11 --version >nul 2>&1 && set PY_CMD=py -3.11
if "%PY_CMD%"=="" py -3.10 --version >nul 2>&1 && set PY_CMD=py -3.10
if "%PY_CMD%"=="" py --version >nul 2>&1 && set PY_CMD=py
if "%PY_CMD%"=="" python --version >nul 2>&1 && set PY_CMD=python
if "%PY_CMD%"=="" python3 --version >nul 2>&1 && set PY_CMD=python3

if "%PY_CMD%"=="" (
  echo ERROR: Python not found. Python is installed but not in PATH.
  echo.
  echo Fix: During Python install, check "Add Python to PATH".
  echo Or reinstall: winget install Python.Python.3.12
  echo Or add manually: set PATH=%%PATH%%;C:\Users\%%USERNAME%%\AppData\Local\Programs\Python\Python312
  pause
  exit /b 1
)
%PY_CMD% --version

echo.
echo [1/3] Installing Node dependencies...
if exist "node_modules" (
  echo node_modules already exists, skipping npm install.
) else (
  call npm install
)

echo.
echo [2/3] Creating Python virtual environment...
cd face-recognition-poc

rem If venv exists, check if it works (copied venvs have wrong paths)
if exist "venv" (
  venv\Scripts\python.exe --version >nul 2>&1
  if %errorlevel% neq 0 (
    echo WARNING: venv broken or from another PC. Removing and recreating...
    rmdir /s /q venv
  )
)

if not exist "venv" (
  %PY_CMD% -m venv venv
  if %errorlevel% neq 0 (
    echo ERROR: Failed to create Python venv.
    cd ..
    pause
    exit /b 1
  )
) else (
  echo venv already exists, skipping creation.
)

echo.
echo [3/3] Installing Python dependencies...
call venv\Scripts\python.exe -m pip install --upgrade pip
call venv\Scripts\pip.exe install -r requirements.txt

echo.
echo Setup complete. Next steps:
echo   1^) Start dashboard: scripts\start-dashboard.bat
echo   2^) Start attendance: scripts\start-attendance.bat
echo.
pause
endlocal

