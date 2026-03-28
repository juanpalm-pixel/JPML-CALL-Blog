@echo off
echo ====================================
echo   Stopping Abair STT Proxy (Docker)
echo ====================================
echo.

cd "%~dp0"

docker-compose down

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Proxy server stopped successfully.
    echo.
) else (
    echo.
    echo [ERROR] Failed to stop container.
    echo.
)

pause
