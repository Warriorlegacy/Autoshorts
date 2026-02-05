@echo off
echo Starting AutoShorts...
echo.
echo Starting Backend on port 3001...
start "Backend" cmd /k "cd /d D:\AutoShorts\backend && npm run dev"
echo.
timeout /t 5 /nobreak > nul
echo Starting Frontend on port 5175...
start "Frontend" cmd /k "cd /d D:\AutoShorts\frontend && npm run dev"
echo.
echo Both servers are starting in separate windows!
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5175
echo.
pause