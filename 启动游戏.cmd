@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 goto :no_node

rem Gate on vite's shim rather than the node_modules folder: an interrupted
rem install leaves the folder behind without .bin, and a folder check would
rem then skip installing forever, leaving the user with no way forward.
if exist "node_modules\.bin\vite.cmd" goto :launch

echo.
echo   Preparing dependencies. This may take a minute...
echo.
call npm install --cache .npm-cache
if %errorlevel% neq 0 goto :install_failed

:launch
echo.
echo   Starting the game...
echo   A browser window will open automatically.
echo   Close this window to stop the game.
echo.

call npm start
if %errorlevel% neq 0 goto :start_failed

echo.
echo   Game stopped.
pause
exit /b 0

:no_node
echo.
echo   [ERROR] Node.js not found.
echo   Install Node.js 20.19 or newer from https://nodejs.org/ then run this again.
echo.
pause
exit /b 1

:install_failed
echo.
echo   [ERROR] Dependency installation failed.
echo   Check your network connection and run this script again.
echo   If it keeps failing, delete the node_modules folder and run it again.
echo.
pause
exit /b 1

:start_failed
echo.
echo   [ERROR] The game did not start. The message above says why.
echo.
pause
exit /b 1
