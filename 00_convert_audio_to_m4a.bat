@echo off
setlocal
cd /d "%~dp0"

echo Rhythm Fruit Aim - Convert runtime audio to M4A
echo.
echo This scans every audio\ file and processes only the ones that are missing
echo from audio\loudness-manifest.json or whose hash no longer matches it
echo (loudness-normalized AAC/M4A in place, source removed when applicable).
echo Files already recorded in the manifest are skipped to avoid AAC re-encode loss.
echo Use --force to re-normalize everything regardless of manifest state.
echo.

python --version >nul 2>&1
if errorlevel 1 (
  echo Python was not found. Please install Python and try again.
  pause
  exit /b 1
)

ffmpeg -version >nul 2>&1
if errorlevel 1 (
  echo ffmpeg was not found. Please install ffmpeg and try again.
  pause
  exit /b 1
)

python scripts\convert_audio_to_m4a.py
if errorlevel 1 (
  echo Audio conversion failed.
  pause
  exit /b 1
)

echo.
echo Done. Runtime audio is now normalized to .m4a.
pause
