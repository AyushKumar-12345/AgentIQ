@echo off
title AgentIQ Launcher
echo ===================================================
echo  Starting AgentIQ Enterprise Knowledge Assistant
echo ===================================================
echo.

:: 1. Launch Backend Server in a new window
echo [1/3] Launching FastAPI Backend on http://localhost:8000 ...
start "AgentIQ Backend (Port 8000)" cmd /k "cd /d %~dp0 && .\.venv\Scripts\python.exe run_backend.py"

:: Wait 2 seconds for backend initialization
timeout /t 2 /nobreak >nul

:: 2. Launch Frontend Dev Server in a new window
echo [2/3] Launching Vite React Frontend on http://localhost:5173 ...
start "AgentIQ Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Wait 2 seconds for frontend initialization
timeout /t 2 /nobreak >nul

:: 3. Open browser
echo [3/3] Opening AgentIQ in your default browser...
start http://localhost:5173

echo.
echo ===================================================
echo  AgentIQ is running!
echo  - Web Application: http://localhost:5173
echo  - API Docs:        http://localhost:8000/docs
echo ===================================================

