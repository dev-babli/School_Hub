@echo off
setlocal
cd /d "%~dp0.."

if not exist "package.json" (
  echo Could not find package.json. Make sure this script is inside the project scripts\ folder.
  pause
  goto :eof
)

if not exist "node_modules" (
  echo node_modules folder not found. Run scripts\setup-client.bat first.
  pause
  goto :eof
)

echo Starting dashboard on http://localhost:3000 ...
echo Press Ctrl+C in this window to stop.
echo.
call npm run start

endlocal

