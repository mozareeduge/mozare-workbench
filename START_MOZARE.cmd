@echo off
REM START_MOZARE.cmd - double-click entry point for the Mozare Workbench (TASK-P09-01).
REM Runs the preflight, then scripts/start-mozare.ps1 (loopback web app + optional
REM context/evidence server), and leaves the console open on failure for guidance.
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\start-mozare.ps1"
set MOZARE_EXIT=%ERRORLEVEL%
if not "%MOZARE_EXIT%"=="0" (
  echo.
  echo [mozare] START_MOZARE.cmd exited with code %MOZARE_EXIT%. See the messages above for guidance.
  pause
)
endlocal & exit /b %MOZARE_EXIT%
