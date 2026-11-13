@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required to run the desktop build.
  echo Install Node.js from https://nodejs.org/ and reopen this file.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)"
if errorlevel 1 (
  echo Please install Node.js 22 or newer.
  pause
  exit /b 1
)
if not exist node_modules\electron\dist\electron.exe goto installDeps
if not exist node_modules\uiohook-napi\package.json goto installDeps
goto runApp
:installDeps
echo Installing desktop and global reactive-input dependencies. This needs internet on first run...
call npm install --no-audit --no-fund
if errorlevel 1 (echo Dependency installation failed.& pause & exit /b 1)
:runApp
echo Rebuilding global reactive-input support for the pinned Electron runtime...
call npm run rebuild:native
if errorlevel 1 (
  echo Native reactive-input build failed. Install Visual Studio Build Tools with Desktop development with C++ and a Windows SDK.
  pause
  exit /b 1
)
call npm run desktop
endlocal