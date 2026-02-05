@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 AutoShorts Production Deployment with PM2
echo ================================================
echo.

set "PROJECT_DIR=%~dp0"
set "BACKEND_DIR=%PROJECT_DIR%backend"
set "FRONTEND_DIR=%PROJECT_DIR%frontend"
set "PUBLIC_DIR=%BACKEND_DIR%\public\frontend"

REM Check if PM2 is installed
echo [✓] Checking PM2 installation...
npm list -g pm2 >nul 2>&1
if errorlevel 1 (
    echo [⚠] PM2 not found. Installing globally...
    npm install -g pm2
)
echo [✓] PM2 is available

REM Build frontend
echo [✓] Building frontend...
cd /d "%FRONTEND_DIR%"
call npm run build
if errorlevel 1 (
    echo [✗] Frontend build failed
    exit /b 1
)
echo [✓] Frontend built successfully

REM Deploy frontend to backend
echo [✓] Deploying frontend to backend...
rmdir /s /q "%PUBLIC_DIR%" 2>nul
xcopy "%FRONTEND_DIR%\dist\*" "%PUBLIC_DIR%\" /e /i /q
echo [✓] Frontend deployed

REM Install backend dependencies
echo [✓] Checking backend dependencies...
cd /d "%BACKEND_DIR%"
if not exist "node_modules" (
    echo [⚠] Installing backend dependencies...
    call npm install --production
)

REM Build backend
echo [✓] Building backend...
call npm run build
if errorlevel 1 (
    echo [✗] Backend build failed
    exit /b 1
)
echo [✓] Backend built successfully

REM Stop existing PM2 instance
echo [✓] Stopping existing PM2 instances...
pm2 stop autoshorts 2>nul
pm2 delete autoshorts 2>nul

REM Start with PM2
echo [✓] Starting application with PM2...
pm2 start ecosystem.config.js --env production
pm2 save

REM Setup startup script
echo [✓] Configuring PM2 startup...
pm2 startup >nul 2>&1

echo.
echo ================================================
echo [✓] PM2 Deployment Complete!
echo ================================================
echo.
echo 🌐 Application: Running on http://localhost:3001
echo.
echo 📊 Commands:
echo    pm2 monit              - Monitor processes
echo    pm2 logs autoshorts    - View logs
echo    pm2 restart autoshorts  - Restart application
echo    pm2 stop autoshorts     - Stop application
echo    pm2 delete autoshorts   - Remove from PM2
echo.
echo 💡 For Windows Service:
echo    Install PM2 Plus or use NSSM for background service
echo.

endlocal
exit /b 0
