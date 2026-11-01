@echo off
title BID WARS - IPL Auction Simulator
color 0A

echo ====================================================
echo           🏏 BID WARS - 2026 EDITION
echo ====================================================
echo.
echo Starting Backend Server on port 3001...
start "BID WARS Server (Port 3001)" cmd /c "cd /d "%~dp0server" && npm start"

echo Starting Frontend Dev Server on port 5173...
start "BID WARS Client (Port 5173)" cmd /c "cd /d "%~dp0client" && npm run dev -- --host 0.0.0.0 --port 5173"

echo Waiting for services to initialize...
timeout /t 3 /nobreak >nul

echo Opening BID WARS in your browser...
start http://localhost:5173

echo.
echo [LIVE] Frontend: http://localhost:5173
echo [LIVE] Backend:  http://localhost:3001
echo.
echo Both servers are running in separate minimized terminal windows.
echo To stop them, simply close their terminal windows.
echo ====================================================

