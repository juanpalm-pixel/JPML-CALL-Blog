@echo off
echo ====================================
echo   Starting Abair STT Proxy (Docker)
echo ====================================
echo.

cd "%~dp0"

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking for existing containers...
docker-compose ps

echo.
echo [2/3] Starting proxy server...
docker-compose up -d

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [3/3] Testing connection...
    timeout /t 3 /nobreak >nul
    
    curl -s http://localhost:3001/ >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo   SUCCESS! Proxy server is running!
        echo ========================================
        echo.
        echo   URL: http://localhost:3001
        echo   Status: curl http://localhost:3001/
        echo.
        echo   To stop:  docker-compose down
        echo   To view logs: docker-compose logs -f
        echo.
    ) else (
        echo.
        echo [WARNING] Container started but not responding yet.
        echo Wait a few seconds and test: http://localhost:3001/
        echo.
    )
    
    echo Press any key to view logs (Ctrl+C to exit)...
    pause >nul
    docker-compose logs -f
) else (
    echo.
    echo [ERROR] Failed to start container.
    echo.
    echo Try these commands manually:
    echo   1. docker-compose build
    echo   2. docker-compose up -d
    echo.
    pause
)
