@echo off
setlocal
cd /d "%~dp0"

echo Rhythm Fruit Aim - Convert runtime audio to M4A
echo.
echo This converts all non-M4A files under audio\ to loudness-normalized AAC/M4A in place,
echo removes the old source files after successful conversion,
echo writes audio\loudness-manifest.json,
echo then rewrites charts and index metadata to point at the new .m4a files.
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
