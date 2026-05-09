@echo off
setlocal
cd /d "%~dp0"

echo Rhythm Fruit Aim - Batch import and clean 3K osu!mania drafts
echo.
echo Expected draft layout:
echo   imports\service-id\mug\service.osu
echo or, for full tracks:
echo   imports\song-id\mug\easy.osu
echo   imports\song-id\mug\normal.osu
echo   imports\song-id\mug\hard.osu
echo   imports\song-id\mug\expert.osu
echo.
echo This step imports drafts into charts\service or charts\tracks and applies cleanup:
echo   - remove notes inside hold notes
echo   - keep only one rhythm point at the same timestamp
echo Existing chart JSON files are skipped by default.
echo Use: python scripts\import_all_osu_mania.py --overwrite
echo only when you intentionally want to replace existing charts.
echo.

python --version >nul 2>&1
if errorlevel 1 (
  echo Python was not found. Please install Python and try again.
  pause
  exit /b 1
)

python scripts\import_all_osu_mania.py
if errorlevel 1 (
  echo Batch import failed.
  pause
  exit /b 1
)

echo.
echo Done.
pause
