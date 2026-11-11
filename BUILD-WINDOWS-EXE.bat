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
echo Running offline protocol and effect tests...
call npm test
if errorlevel 1 (
  echo Tests failed. The Windows installer will not be built.
  pause
  exit /b 1
)
echo Building the Windows x64 installer and portable EXE...
call npm run dist:win
if errorlevel 1 (
  echo Build failed. See the error above.
  pause
  exit /b 1
)
echo.
echo Build complete:
echo   release\AULA-F75-Max-Studio-0.8.1-x64.exe
if exist release\AULA-F75-Max-Studio-Portable-0.8.1.exe echo   release\AULA-F75-Max-Studio-Portable-0.8.1.exe
echo.
pause
endlocal