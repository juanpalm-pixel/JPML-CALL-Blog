@echo off
echo ====================================================================
echo   Starting Local Web Server for Irish E-Reader
echo ====================================================================
echo.
echo This will start a local web server to avoid CORS errors.
echo.
echo Once started, open your browser and go to:
echo    http://localhost:8000/project/
echo.
echo Press Ctrl+C to stop the server when done.
echo.
echo ====================================================================
echo.

cd "%~dp0"
python -m http.server 8000
