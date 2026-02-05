@echo off
chcp 65001 >nul

echo 🛑 Stopping AutoShorts application...
echo.

echo [✓] Stopping backend process...
taskkill /FI "WINDOWTITLE eq AutoShorts Backend" /F >nul 2>nul

echo [✓] Stopping any Node.js processes on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul

echo [✓] Stopping any Node.js processes on port 80...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :80 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul

echo [✓] All AutoShorts processes stopped
echo.

pause
