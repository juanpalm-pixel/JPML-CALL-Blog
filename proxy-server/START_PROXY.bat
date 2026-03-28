@echo off
cd "%~dp0"
if not exist "node_modules\" (
    echo Dependencies not installed. Running INSTALL.bat...
    call INSTALL.bat
)
echo Starting proxy server...
node proxy-server.js
