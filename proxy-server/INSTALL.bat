@echo off
cd "%~dp0"
echo Installing proxy server dependencies...
call npm install
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Installation complete! Run START_PROXY.bat to start the server.
) else (
    echo.
    echo Installation failed. Make sure Node.js is installed.
)
pause
