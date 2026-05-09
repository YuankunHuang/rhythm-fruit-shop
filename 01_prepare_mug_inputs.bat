@echo off
setlocal
cd /d "%~dp0"

echo Rhythm Fruit Aim - Prepare MuG input WAV files
echo.
echo This scans audio\service and audio\tracks recursively,
echo then converts runtime audio to imports\song-id\mug\source.wav.
echo MuG Diffusion can then generate service.osu for service clips,
echo or easy/normal/hard/expert.osu for full tracks.
echo.

python --version >nul 2>&1
if errorlevel 1 (
  echo Python was not found. Please install Python and try again.
  pause
  exit /b 1
)

python scripts\prepare_mug_inputs.py
if errorlevel 1 (
  echo Preparing MuG inputs failed. Make sure ffmpeg is available in PATH.
  pause
  exit /b 1
)

echo.
echo Done.
pause
