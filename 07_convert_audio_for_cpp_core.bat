@echo off
setlocal
cd /d "%~dp0"

echo Rhythm Fruit Shop - Convert runtime audio for cpp_core (MP3 192kbps)
echo.
echo Reads audio\ (already normalized by 00) and writes .mp3 to cpp_core\assets\audio\.
echo Single ffmpeg pass per file (MP3 192kbps). Use --normalize-audio only if source was not run through 00.
echo Use --force to re-encode all files regardless of manifest state.
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

python scripts\convert_audio_for_cpp_core.py %*
if errorlevel 1 (
  echo Audio conversion failed.
  pause
  exit /b 1
)

echo.
echo Done. cpp_core runtime audio is under cpp_core\assets\audio\ as .mp3.
pause
