@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

echo Rhythm Fruit Shop - Package C++ Release (Windows x64)
echo.
echo This will:
echo   1. Configure CMake (preset x64-debug)
echo   2. Build Release target rfs_demo  -^>  RhythmFruitShop.exe
echo   3. Copy exe + runtime DLLs into dist\RhythmFruitShop-win64
echo   4. Optimize and copy assets (mp3 re-encode, cover resize, json minify)
echo   5. Create dist\RhythmFruitShop-win64.zip
echo.

set "CMAKE=cmake"
where cmake >nul 2>&1
if errorlevel 1 (
  set "CMAKE="
  set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
  if exist "!VSWHERE!" (
    for /f "usebackq delims=" %%I in (`"!VSWHERE!" -latest -requires Microsoft.Component.MSBuild -find Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe`) do (
      if not defined CMAKE set "CMAKE=%%I"
    )
  )
  if not defined CMAKE (
    for %%V in (18 2022) do (
      for %%E in (Community Professional Enterprise BuildTools) do (
        if not defined CMAKE if exist "%ProgramFiles%\Microsoft Visual Studio\%%V\%%E\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe" (
          set "CMAKE=%ProgramFiles%\Microsoft Visual Studio\%%V\%%E\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"
        )
      )
    )
  )
)
if not defined CMAKE (
  echo [ERROR] cmake not found.
  echo Install "Desktop development with C++" in Visual Studio, or add cmake to PATH.
  pause
  exit /b 1
)
echo Using CMake: !CMAKE!
echo.

set "CPP_CORE=cpp_core"
set "BUILD_ROOT=%CPP_CORE%\out\build\x64-Debug"
set "EXE=%BUILD_ROOT%\Release\RhythmFruitShop.exe"
set "VCPKG_BIN=%BUILD_ROOT%\vcpkg_installed\x64-windows\bin"
set "OUT=dist\RhythmFruitShop-win64"
set "ASSETS_SRC=%CPP_CORE%\assets"

if not exist "%CPP_CORE%\CMakePresets.json" (
  echo [ERROR] Missing %CPP_CORE%\CMakePresets.json
  pause
  exit /b 1
)

echo [1/5] CMake configure...
pushd "%CPP_CORE%"
"!CMAKE!" --preset x64-debug
if errorlevel 1 (
  echo [ERROR] CMake configure failed.
  popd
  pause
  exit /b 1
)

echo.
echo [2/5] Build Release (rfs_demo)...
"!CMAKE!" --build --preset x64-release-build --target rfs_demo
if errorlevel 1 (
  echo [ERROR] Release build failed.
  popd
  pause
  exit /b 1
)
popd

if not exist "%EXE%" (
  echo [ERROR] Expected exe not found:
  echo   %EXE%
  pause
  exit /b 1
)

if not exist "%VCPKG_BIN%" (
  echo [ERROR] vcpkg bin folder not found:
  echo   %VCPKG_BIN%
  pause
  exit /b 1
)

if not exist "%ASSETS_SRC%" (
  echo [ERROR] Assets folder not found:
  echo   %ASSETS_SRC%
  pause
  exit /b 1
)

echo.
echo [3/5] Stage share folder: %OUT%
if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%" || exit /b 1

copy /y "%EXE%" "%OUT%\" >nul
if errorlevel 1 (
  echo [ERROR] Failed to copy exe.
  pause
  exit /b 1
)

echo Copying runtime DLLs from vcpkg...
set "DLL_COUNT=0"
for %%F in ("%VCPKG_BIN%\*.dll") do (
  copy /y "%%~fF" "%OUT%\" >nul
  set /a DLL_COUNT+=1
)
if !DLL_COUNT! EQU 0 (
  echo [ERROR] No DLLs found in %VCPKG_BIN%
  pause
  exit /b 1
)
echo   copied !DLL_COUNT! DLL(s^)

echo.
echo [4/5] Optimize and copy assets...
python --version >nul 2>&1
if errorlevel 1 (
  echo [WARN] Python not found; copying assets without optimization.
  xcopy /E /I /Y /Q "%ASSETS_SRC%" "%OUT%\assets\" >nul
  if errorlevel 1 (
    echo [ERROR] Failed to copy assets.
    pause
    exit /b 1
  )
) else (
  python scripts\package_cpp_core_share.py --target "%OUT%\assets" --source "%ASSETS_SRC%"
  if errorlevel 1 (
    echo [ERROR] Asset staging failed.
    pause
    exit /b 1
  )
)

> "%OUT%\PLAY.txt" (
  echo Rhythm Fruit Shop - Windows x64
  echo.
  echo 1. Unzip this folder anywhere.
  echo 2. Double-click RhythmFruitShop.exe
  echo 3. Keep assets\ next to the exe.
  echo.
  echo Controls:
  echo   D F J K     - lanes
  echo   Up/Down     - song select
  echo   Left/Right  - difficulty
  echo   Enter       - confirm
  echo   Esc         - back / pause
  echo.
  echo If the game fails to start, install Microsoft Visual C++ Redistributable x64.
)

echo.
echo [5/5] Create zip...
set "ZIP=dist\RhythmFruitShop-win64.zip"
if exist "%ZIP%" del /f /q "%ZIP%"

powershell -NoProfile -Command "Compress-Archive -Path '%OUT%\*' -DestinationPath '%ZIP%' -Force" >nul 2>&1
if errorlevel 1 (
  echo [WARN] Zip step skipped ^(PowerShell Compress-Archive failed^).
  echo        Share the folder: %OUT%
) else (
  echo Created: %ZIP%
)

echo.
echo Done.
echo Folder: %CD%\%OUT%
echo.
echo Test before sharing:
echo   cd /d "%OUT%"
echo   RhythmFruitShop.exe
echo.
pause
