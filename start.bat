@echo off
setlocal enabledelayedexpansion
title CloudLedger - Startup Launcher

echo =====================================================================
echo                    CloudLedger Platform Launcher
echo       AWS Student Cloud Usage & Cost Monitoring System
echo =====================================================================
echo.

echo Choose startup mode:
echo   [1] Run Local Dev Stack (FastAPI Backend + React Vite Frontend)
echo   [2] Run with Docker Compose (PostgreSQL + Backend + Frontend Containers)
echo   [3] Run Automated Verification Tests (Pytest + Vite Build)
echo   [4] Exit
echo.
set /p CHOICE="Enter option [1-4] (default is 1): "

if "%CHOICE%"=="" set CHOICE=1

if "%CHOICE%"=="1" goto LOCAL_DEV
if "%CHOICE%"=="2" goto DOCKER_COMPOSE
if "%CHOICE%"=="3" goto RUN_TESTS
if "%CHOICE%"=="4" goto EXIT
goto INVALID_CHOICE

:LOCAL_DEV
echo.
echo =====================================================================
echo Starting CloudLedger in Local Development Mode...
echo =====================================================================
echo.

:: 1. Verify / Setup Python Virtual Environment
if not exist "venv\Scripts\activate.bat" (
    echo [1/3] Python virtual environment not found. Creating venv...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create Python virtual environment. Ensure Python is installed.
        pause
        exit /b 1
    )
    echo Installing backend dependencies...
    call venv\Scripts\activate.bat
    pip install -r backend\requirements.txt
) else (
    echo [1/3] Virtual environment detected.
)

:: 2. Verify Frontend Dependencies
if not exist "frontend\node_modules" (
    echo [2/3] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
) else (
    echo [2/3] Frontend dependencies detected.
)

:: 3. Launch Backend in Separate Terminal Window
echo [3/3] Launching Backend on http://localhost:8000 ...
start "CloudLedger - FastAPI Backend" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && set PYTHONPATH=. && uvicorn backend.app.main:app --reload --port 8000"

:: 4. Launch Frontend in Separate Terminal Window
echo Launching Frontend on http://localhost:5173 ...
start "CloudLedger - React Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =====================================================================
echo CloudLedger is starting up!
echo.
echo  - Frontend UI:  http://localhost:5173
echo  - Backend API:  http://localhost:8000/docs
echo.
echo Default Administrator Credentials:
echo  - Email:    admin@cloudledger.edu
echo  - Password: Admin@CloudLedger2026
echo =====================================================================
echo.
timeout /t 3 >nul
start http://localhost:5173
goto EXIT

:DOCKER_COMPOSE
echo.
echo =====================================================================
echo Starting CloudLedger via Docker Compose...
echo =====================================================================
echo.
docker compose up --build
goto EXIT

:RUN_TESTS
echo.
echo =====================================================================
echo Running CloudLedger Test Suite...
echo =====================================================================
echo.
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    set PYTHONPATH=.
    pytest backend/tests/ -v
) else (
    python -m pytest backend/tests/ -v
)

echo.
echo Checking Frontend TypeScript Build...
cd frontend
call npm run build
cd ..

echo.
echo =====================================================================
echo Verification Complete.
echo =====================================================================
pause
goto EXIT

:INVALID_CHOICE
echo Invalid option selected. Exiting.
pause
exit /b 1

:EXIT
exit /b 0
