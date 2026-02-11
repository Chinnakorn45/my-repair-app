# Quick Start for ระบบแจ้งซ่อม มรส.

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "ระบบแจ้งซ่อม มรส. - System Startup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is running
Write-Host "🔍 Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    $psqlCheck = & psql -U postgres -c "SELECT 1;" 2>$null
    Write-Host "✅ PostgreSQL is running!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  PostgreSQL might not be running. Please start PostgreSQL before continuing." -ForegroundColor Red
    Write-Host ""
    Write-Host "To start PostgreSQL on Windows:" -ForegroundColor Yellow
    Write-Host "  1. Open Services (services.msc)" -ForegroundColor Yellow
    Write-Host "  2. Find 'postgresql-x64-XX' service" -ForegroundColor Yellow
    Write-Host "  3. Right-click and select 'Start'" -ForegroundColor Yellow
    Write-Host ""
    pause
}

# Initialize Database
Write-Host ""
Write-Host "1️⃣  Initializing Database..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\backend"

# Check if database exists
$dbCheck = & psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'repair_db';" 2>$null
if ($dbCheck -match "1") {
    Write-Host "Database 'repair_db' already exists" -ForegroundColor Yellow
    Write-Host "Reinitializing database..." -ForegroundColor Yellow
}

# Run init-db.js
& node init-db.js

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Database initialization failed!" -ForegroundColor Red
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Make sure PostgreSQL is running" -ForegroundColor Yellow
    Write-Host "  2. Check .env file has correct credentials" -ForegroundColor Yellow
    Write-Host "  3. Ensure 'repair_db' database exists" -ForegroundColor Yellow
    Write-Host ""
    Pop-Location
    pause
    exit 1
}

Write-Host ""
Write-Host "✅ Database initialized successfully!" -ForegroundColor Green

# Start Backend Server
Write-Host ""
Write-Host "2️⃣  Starting Backend Server (port 5000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; node server.js"
Write-Host "✅ Backend server started" -ForegroundColor Green

# Start Frontend
Write-Host ""
Write-Host "3️⃣  Starting Frontend Server (port 5173)..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
Pop-Location
Push-Location "$PSScriptRoot\frontend"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"
Write-Host "✅ Frontend server started" -ForegroundColor Green

Pop-Location

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✨ Both servers started successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Frontend URL:" -ForegroundColor Yellow
Write-Host "   http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔌 Backend URL:" -ForegroundColor Yellow
Write-Host "   http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "👤 Test Credentials:" -ForegroundColor Yellow
Write-Host "   User:       user1 / password123" -ForegroundColor Cyan
Write-Host "   Technician: tech1 / password123" -ForegroundColor Cyan
Write-Host "   Supervisor: supervisor1 / password123" -ForegroundColor Cyan
Write-Host "   Admin:      admin1 / password123" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   - Frontend may take 10-15 seconds to load first time" -ForegroundColor Cyan
Write-Host "   - Both windows will stay open for monitoring logs" -ForegroundColor Cyan
Write-Host "   - Press Ctrl+C in either window to stop the server" -ForegroundColor Cyan
Write-Host ""

# Keep this window open
Write-Host "Press any key to open the application..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open browser automatically
Write-Host ""
Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"
