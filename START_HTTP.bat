@echo off
setlocal
cd /d "%~dp0"
set PORT=8817
where python >nul 2>nul
if errorlevel 1 (
  echo Python 3 is required. Install from https://www.python.org/ then retry.
  pause
  exit /b 1
)
echo.
echo Rhythm Fruit Shop - local preview
echo URL: http://127.0.0.1:%PORT%/
echo.
echo Do NOT open index.html directly - browsers block ES modules on file://
echo Press Ctrl+C in this window to stop the server.
echo.
start "" cmd /c "ping -n 2 127.0.0.1 >nul && start http://127.0.0.1:%PORT%/"
python -m http.server %PORT%
