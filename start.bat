@echo off
echo ======================================
echo ระบบแจ้งซ่อม มรส. - Quick Start
echo ======================================
echo.

echo 1️⃣  Initializing Database...
cd /d "%~dp0backend"
node init-db.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Database initialization failed!
    echo Please make sure PostgreSQL is running.
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Database initialized successfully!
echo.
echo 2️⃣  Starting Backend Server...
start cmd /k "cd /d "%~dp0backend" && node server.js"

echo.
echo 3️⃣  Starting Frontend Development Server...
timeout /t 3 /nobreak
start cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ✅ Both servers started!
echo.
echo 📱 Frontend: http://localhost:5173
echo 🔌 Backend: http://localhost:5000
echo.
echo 👤 Test Credentials:
echo   User:       user1 / password123
echo   Technician: tech1 / password123
echo   Supervisor: supervisor1 / password123
echo   Admin:      admin1 / password123
echo.
pause
