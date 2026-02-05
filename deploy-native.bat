@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 AutoShorts Non-Docker Production Deployment
echo ================================================
echo.

set "PROJECT_DIR=%~dp0"
set "BACKEND_DIR=%PROJECT_DIR%backend"
set "FRONTEND_DIR=%PROJECT_DIR%frontend"
set "PUBLIC_DIR=%BACKEND_DIR%\public\frontend"
set "BACKUP_DIR=%PROJECT_DIR%backups"
set "TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"

echo 📅 Timestamp: %TIMESTAMP%
echo.

REM Create directories
if not exist "%PUBLIC_DIR%" mkdir "%PUBLIC_DIR%"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if not exist "%BACKEND_DIR%\logs" mkdir "%BACKEND_DIR%\logs"
if not exist "%BACKEND_DIR%\public\renders" mkdir "%BACKEND_DIR%\public\renders"
if not exist "%BACKEND_DIR%\public\images" mkdir "%BACKEND_DIR%\public\images"

REM Backup database
if exist "%BACKEND_DIR%\autoshorts.db" (
    echo [✓] Creating database backup...
    copy "%BACKEND_DIR%\autoshorts.db" "%BACKUP_DIR%\autoshorts_%TIMESTAMP%.db" >nul
    echo [✓] Database backed up to %BACKUP_DIR%\autoshorts_%TIMESTAMP%.db
)

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
) else (
    echo [✓] Backend dependencies already installed
)

REM Build backend
echo [✓] Building backend...
call npm run build
if errorlevel 1 (
    echo [✗] Backend build failed
    exit /b 1
)
echo [✓] Backend built successfully

REM Cleanup old backups (keep last 7 days)
echo [✓] Cleaning up old backups...
forfiles /p "%BACKUP_DIR%" /m autoshorts_*.db /d -7 /c "cmd /c del @path" 2>nul

REM Kill existing processes on ports
echo [✓] Stopping existing processes on ports 3001 and 80...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :80 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul

REM Start backend
echo [✓] Starting backend...
start "AutoShorts Backend" /MIN cmd /c "npm run start > logs\backend.log 2>&1"
echo [✓] Backend started

REM Wait for backend to start
timeout /t 10 /nobreak >nul

REM Health check
echo [✓] Performing health checks...
set "HEALTHY=0"
for /l %%i in (1,1,30) do (
    curl -sf http://localhost:3001/api/health >nul 2>&1
    if !errorlevel! equ 0 (
        set "HEALTHY=1"
        echo [✓] Backend is healthy
        goto :health_ok
    )
    echo   Attempt %%i/30...
    timeout /t 2 /nobreak >nul
)

:health_ok
if %HEALTHY% equ 0 (
    echo [✗] Backend health check failed
    echo [⚠] Check logs at: %BACKEND_DIR%\logs\backend.log
    exit /b 1
)

REM Check frontend
curl -sf http://localhost:3001/ >nul 2>&1
if !errorlevel! equ 0 (
    echo [✓] Frontend is accessible
) else (
    echo [⚠] Frontend health check returned non-200 status
)

echo.
echo ===============================================
echo [✓] Deployment completed successfully!
echo ===============================================
echo.
echo 🌐 Application URLs:
echo    Frontend ^& Backend: http://localhost:3001
echo    API Health: http://localhost:3001/api/health
echo.
echo 📝 Logs:
echo    Backend: %BACKEND_DIR%\logs\backend.log
echo.
echo 🛑 To stop the application:
echo    taskkill /FI "WINDOWTITLE eq AutoShorts Backend" /F
echo.

endlocal
exit /b 0
