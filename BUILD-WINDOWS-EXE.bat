@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required to build the Windows desktop app.
  echo Install Node.js 22 or newer from https://nodejs.org/ and reopen this file.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)"
if errorlevel 1 (
  echo Please install Node.js 22 or newer.
  pause
  exit /b 1
)
echo Installing pinned AULA Studio desktop dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo Dependency installation failed. Check your internet connection and try again.
  pause
  exit /b 1
)
echo Approving the pinned native build scripts required by this project...
call npm install-scripts approve uiohook-napi electron-winstaller
if errorlevel 1 (
  echo Could not approve dependency install scripts.
  echo Run: npm install-scripts approve uiohook-napi electron-winstaller
  pause
  exit /b 1
)
echo Running offline protocol, effect, and packaging tests...
call npm test
if errorlevel 1 (
  echo Tests failed. The portable EXE will not be built.
  pause
  exit /b 1
)
echo Building the single Windows x64 portable EXE...
call npm run dist:win
if errorlevel 1 (
  echo Build failed. The uiohook-napi native module may need Visual Studio C++ Build Tools.
  echo Install Visual Studio Build Tools with Desktop development with C++ and a Windows SDK,
  echo then reopen this file and run it again.
  pause
  exit /b 1
)
echo.
echo Build complete:
echo   release\AULA-F75-Max-Studio-Portable-0.9.1.exe
echo.
echo This is the standalone portable application. No installer or separate project files are needed to run it.
echo.
pause
endlocal
