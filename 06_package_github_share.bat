@echo off
setlocal
cd /d "%~dp0"

echo Rhythm Fruit Aim - Package clean GitHub share build
echo.
echo This will rebuild dist\github-share with only playable files:
echo   index.html
echo   audio\  (recursively; encoded to compact M4A in the package)
echo   assets\fruit_notes\
echo   assets\game_art\  (optimized to WebP when Pillow is available)
echo   assets\songs\
echo   charts\  (minified JSON)
echo   README.md
echo.

python --version >nul 2>&1
if errorlevel 1 (
  echo Python was not found. Please install Python and try again.
  pause
  exit /b 1
)

python scripts\package_github_share.py
if errorlevel 1 (
  echo Packaging failed.
  pause
  exit /b 1
)

echo.
echo Done.
echo Upload the contents of dist\github-share to your sharing repository:
echo https://github.com/YuankunHuang/rhythm-fruit-shop
echo.
echo Local folder tip: double-click START_HTTP.bat inside github-share — do not open index.html via file:// ^(ES modules^).
pause
