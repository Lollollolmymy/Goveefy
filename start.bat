@echo off
REM Goveefy Startup — Quick launcher for Windows
REM Checks configuration and starts the backend with nice formatting
REM Run: start.bat

setlocal enabledelayedexpansion

cls
echo.
echo ════════════════════════════════════════════════════════════
echo ♫  Goveefy Backend Launcher
echo ════════════════════════════════════════════════════════════
echo.

REM Check if secrets.json exists
if not exist "secrets.json" (
    echo ❌ ERROR: secrets.json not found!
    echo.
    echo Please run the installer first:
    echo   powershell -ExecutionPolicy Bypass -File install.ps1
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exist
if not exist "node_modules" (
    echo ⚠️  node_modules not found, running npm install...
    call npm install
    if !errorlevel! neq 0 (
        echo ❌ npm install failed
        pause
        exit /b 1
    )
    echo.
)

REM Display configuration info
echo 📋 Configuration:
echo.

REM Check if Node.js can read the config (simple validation)
node -e "try{const s=require('./secrets.json');console.log('   ✓ API key configured');console.log('   ✓ '+s.DEVICES.length+' device(s) configured');s.DEVICES.forEach((d,i)=>console.log('      • '+d.name+' ('+d.sku+')'));}catch(e){console.log('   ⚠️  Error reading secrets.json');}" 2>nul

echo.
echo ════════════════════════════════════════════════════════════
echo ✅ Starting Goveefy backend...
echo ════════════════════════════════════════════════════════════
echo.
echo Dashboard:  http://localhost:3000
echo WebSocket:  ws://localhost:8080
echo.
echo Press Ctrl+C to stop
echo.
echo ════════════════════════════════════════════════════════════
echo.

node govee-backend.js
