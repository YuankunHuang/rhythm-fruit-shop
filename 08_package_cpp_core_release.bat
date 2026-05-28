@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

echo Rhythm Fruit Shop - Package C++ Release (Windows x64)
echo.
echo This will:
echo   1. Configure CMake (preset win64-vcpkg)
echo   2. Build Release target rfs_demo  -^>  RhythmFruitShop.exe
echo   3. Copy exe + runtime DLLs into dist\RhythmFruitShop-win64
echo   4. Optimize and copy assets (mp3 re-encode, cover resize, json minify)
echo   5. Create dist\RhythmFruitShop-win64.zip
echo.

set "CMAKE="
set "VS_INSTALL="
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"

if exist "!VSWHERE!" (
  for /f "usebackq delims=" %%I in (`"!VSWHERE!" -latest -requires Microsoft.Component.MSBuild -property installationPath`) do (
    if not defined VS_INSTALL set "VS_INSTALL=%%I"
  )
  if defined VS_INSTALL (
    if exist "!VS_INSTALL!\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe" (
      set "CMAKE=!VS_INSTALL!\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"
    )
  )
)

if not defined CMAKE (
  for %%V in (18 2022) do (
    for %%E in (Community Professional Enterprise BuildTools) do (
      if not defined CMAKE if exist "%ProgramFiles%\Microsoft Visual Studio\%%V\%%E\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe" (
        set "CMAKE=%ProgramFiles%\Microsoft Visual Studio\%%V\%%E\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"
        if not defined VS_INSTALL set "VS_INSTALL=%ProgramFiles%\Microsoft Visual Studio\%%V\%%E"
      )
    )
  )
)

if not defined CMAKE (
  where cmake >nul 2>&1
  if not errorlevel 1 set "CMAKE=cmake"
)

if not defined CMAKE (
  echo [ERROR] cmake not found.
  echo Install "Desktop development with C++" in Visual Studio, or add cmake to PATH.
  pause
  exit /b 1
)
echo Using CMake: !CMAKE!

if not defined VCPKG_ROOT (
  if defined VS_INSTALL if exist "!VS_INSTALL!\VC\vcpkg" (
    set "VCPKG_ROOT=!VS_INSTALL!\VC\vcpkg"
  )
)
if not defined VCPKG_ROOT (
  echo [ERROR] VCPKG_ROOT is not set and could not be inferred from Visual Studio.
  echo Set VCPKG_ROOT to your vcpkg root, or install vcpkg with Visual Studio C++ workload.
  pause
  exit /b 1
)
echo Using VCPKG_ROOT: !VCPKG_ROOT!

if defined VS_INSTALL if exist "!VS_INSTALL!\VC\Auxiliary\Build\vcvars64.bat" (
  echo Activating MSVC environment...
  call "!VS_INSTALL!\VC\Auxiliary\Build\vcvars64.bat" >nul
) else (
  echo [WARN] vcvars64.bat not found; ensure cl.exe and ninja are on PATH.
)

if defined VS_INSTALL if exist "!VS_INSTALL!\Common7\IDE\CommonExtensions\Microsoft\CMake\Ninja\ninja.exe" (
  set "PATH=!VS_INSTALL!\Common7\IDE\CommonExtensions\Microsoft\CMake\Ninja;!PATH!"
)
echo.

set "CPP_CORE=cpp_core"
set "BUILD_ROOT=%CPP_CORE%\out\build\win64-vcpkg"
set "OUT=dist\RhythmFruitShop-win64"
set "ZIP=dist\RhythmFruitShop-win64.zip"

if not exist "%CPP_CORE%\CMakePresets.json" (
  echo [ERROR] Missing %CPP_CORE%\CMakePresets.json
  pause
  exit /b 1
)

echo [1/5] CMake configure...
pushd "%CPP_CORE%"
"!CMAKE!" --preset win64-vcpkg
if errorlevel 1 (
  echo [ERROR] CMake configure failed.
  popd
  pause
  exit /b 1
)

echo.
echo [2/5] Build Release (rfs_demo)...
"!CMAKE!" --build --preset win64-release-build --target rfs_demo
if errorlevel 1 (
  echo [ERROR] Release build failed.
  popd
  pause
  exit /b 1
)
popd

echo.
echo [3-5/5] Stage release folder and zip...
python --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python is required for release staging.
  echo Install Python 3 and re-run this script.
  pause
  exit /b 1
)

python scripts\package_cpp_core_release.py --build-root "%BUILD_ROOT%" --out "%OUT%" --zip "%ZIP%"
if errorlevel 1 (
  echo [ERROR] Release staging failed.
  pause
  exit /b 1
)

echo.
echo Done.
echo Folder: %CD%\%OUT%
echo Zip:    %CD%\%ZIP%
echo.
echo Test before sharing:
echo   cd /d "%OUT%"
echo   RhythmFruitShop.exe
echo.
pause
