@echo off
setlocal
cd /d "%~dp0"

echo Rhythm Fruit Shop - Import osu!mania charts for C++ repo
echo.
echo Expected import layout:
echo   imports\song-id\mug\easy.osz
echo   imports\song-id\mug\normal.osz
echo   imports\song-id\mug\hard.osz
echo   imports\song-id\mug\expert.osz
echo.
echo Output (default sibling repo):
echo   ..\rhythm-fruit-shop-cpp\assets\charts\song-id.rfs.json
echo   ..\rhythm-fruit-shop-cpp\assets\charts\catalog.json
echo.
echo Note: Place audio files in the C++ repo at assets\audio\song-id.mp3 beforehand.
echo Note: Place cover images at assets\covers\song_id\cover.png beforehand.
echo.
echo Options:
echo   --song SONG_ID       Import only one song
echo   --overwrite          Re-parse and overwrite existing chart data
echo   --refresh-catalog    Rebuild catalog.json from existing .rfs.json (fast, no .osz needed)
echo   --cpp-repo PATH      Override C++ repo location
echo.

python --version >nul 2>&1
if errorlevel 1 (
  echo Python was not found. Please install Python and try again.
  pause
  exit /b 1
)

python scripts\import_for_cpp.py %*
if errorlevel 1 (
  echo Import failed.
  pause
  exit /b 1
)

echo.
echo Done. Rebuild rfs_demo in the C++ repo to pick up catalog changes.
pause
