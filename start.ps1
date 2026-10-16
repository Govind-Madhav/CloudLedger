# CloudLedger PowerShell Startup Script
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "                   CloudLedger Platform Launcher                    " -ForegroundColor White
Write-Host "      AWS Student Cloud Usage & Cost Monitoring System             " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Choose startup mode:"
Write-Host "  [1] Run Local Dev Stack (FastAPI Backend + React Vite Frontend)" -ForegroundColor Green
Write-Host "  [2] Run with Docker Compose (PostgreSQL + Backend + Frontend)" -ForegroundColor Yellow
Write-Host "  [3] Run Automated Verification Tests (Pytest + Vite Build)" -ForegroundColor Magenta
Write-Host "  [4] Exit" -ForegroundColor Red
Write-Host ""

$choice = Read-Host "Enter option [1-4] (default is 1)"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

switch ($choice) {
    "1" {
        Write-Host "`nStarting Local Dev Stack..." -ForegroundColor Cyan
        
        # Check / Create Venv
        if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
            Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
            python -m venv venv
            .\venv\Scripts\pip install -r backend/requirements.txt
        }
        
        # Check Node modules
        if (-not (Test-Path "frontend\node_modules")) {
            Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
            Set-Location frontend
            npm install
            Set-Location ..
        }

        # Start Backend in background process or separate terminal
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; .\venv\Scripts\Activate.ps1; `$env:PYTHONPATH='.'; uvicorn backend.app.main:app --reload --port 8000"
        
        # Start Frontend in separate terminal
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

        Start-Sleep -Seconds 2
        Start-Process "http://localhost:5173"

        Write-Host "`nCloudLedger launched successfully!" -ForegroundColor Green
        Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
        Write-Host "Backend API: http://localhost:8000/docs" -ForegroundColor White
        Write-Host "Default Login: admin@cloudledger.edu / Admin@CloudLedger2026" -ForegroundColor White
    }
    "2" {
        Write-Host "`nStarting with Docker Compose..." -ForegroundColor Cyan
        docker compose up --build
    }
    "3" {
        Write-Host "`nRunning Pytest and Frontend Build..." -ForegroundColor Cyan
        $env:PYTHONPATH = "."
        .\venv\Scripts\pytest backend/tests/ -v
        Set-Location frontend
        npm run build
        Set-Location ..
    }
    default {
        Write-Host "Exiting." -ForegroundColor Yellow
    }
}
