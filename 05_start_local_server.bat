@echo off
setlocal
cd /d "%~dp0"

echo Rhythm Fruit Aim - Local server
echo.
echo Starting server at http://localhost:8080/
echo Keep this window open while testing the game.
echo Press Ctrl+C to stop.
echo.

python --version >nul 2>&1
if errorlevel 1 (
  echo Python was not found. Please install Python and try again.
  pause
  exit /b 1
)

netstat -ano | findstr /R ":8080 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo Port 8080 is in use. Releasing...
  powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; Write-Host 'Killed PID' $_ }"
  timeout /t 1 /nobreak >nul
)

python -m http.server 8080
pause
