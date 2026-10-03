@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [ERROR] Node.js not found.
  echo   Install Node.js 20.19 or newer from https://nodejs.org/ then run this again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo   First run detected. Installing dependencies, this may take a minute...
  echo.
  call npm install --cache .npm-cache
  if errorlevel 1 (
    echo.
    echo   [ERROR] Dependency installation failed. Check your network connection and retry.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo   Starting the game...
echo   Browser will open at http://127.0.0.1:5173/
echo   Close this window to stop the game.
echo.

call npm start

echo.
echo   Game stopped.
pause
