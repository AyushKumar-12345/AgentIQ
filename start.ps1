Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " Starting AgentIQ Enterprise Knowledge Assistant" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Launch Backend
Write-Host "[1/3] Launching FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; `$env:PYTHONPATH='backend'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --port 8000"

Start-Sleep -Seconds 2

# 2. Launch Frontend
Write-Host "[2/3] Launching Vite Frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Start-Sleep -Seconds 2

# 3. Open Browser
Write-Host "[3/3] Opening Browser at http://localhost:5173 ..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "AgentIQ is running! Keep the opened PowerShell windows open." -ForegroundColor Green

