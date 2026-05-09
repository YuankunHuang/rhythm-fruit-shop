@echo off
setlocal
cd /d "%~dp0"

echo Rhythm Fruit Aim - Sync charts to game
echo.
echo This refreshes charts\manifest.json and song/service metadata in data\songs.json.
echo It reads charts\service and charts\tracks recursively.
echo It does not clean or rewrite note data; do final manual edits before this step.
echo Run this after editing charts with tools\chart_editor.html.
echo.

python --version >nul 2>&1
if errorlevel 1 (
  echo Python was not found. Please install Python and try again.
  pause
  exit /b 1
)

python scripts\sync_charts_to_game.py
if errorlevel 1 (
  echo Sync failed.
  pause
  exit /b 1
)

echo.
echo Done.
pause
