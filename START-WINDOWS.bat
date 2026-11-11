@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "AULA Studio local server" /min cmd /c "py -3 -m http.server 8765 --bind 127.0.0.1"
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    start "AULA Studio local server" /min cmd /c "python -m http.server 8765 --bind 127.0.0.1"
  ) else (
    echo Python 3 was not found. Install Python 3, then launch this file again.
    pause
    exit /b 1
  )
)
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8765"
echo AULA Studio is running at http://127.0.0.1:8765
 echo Close the local server command window to stop it.
endlocal