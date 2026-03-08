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
py -3.12 --version >nul 2>&1
if %errorlevel% neq 0 (
  py --version >nul 2>&1
  if %errorlevel% neq 0 (
    echo ERROR: Python 3.12 not found. Install from https://python.org or run: winget install Python.Python.3.12
    pause
    exit /b 1
  )
  echo WARNING: Python 3.12 recommended. Proceeding with available Python.
) else (
  for /f "tokens=2 delims= " %%a in ('py -3.12 --version 2^>nul') do echo   Python: %%a
)

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
if not exist "venv" (
  py -3.12 -m venv venv 2>nul
  if %errorlevel% neq 0 (
    echo Trying py -m venv venv...
    py -m venv venv
  )
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

