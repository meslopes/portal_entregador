@echo off
title Portal Entregador
echo Iniciando Backend...
start "Backend" cmd /k "cd /d %~dp0portal-backend && python main.py"
timeout /t 3 /nobreak >nul
echo Iniciando Frontend...
start "Frontend" cmd /k "cd /d %~dp0portal-frontend && npm run dev -- --host"
echo Sistema iniciado!
echo Note: http://localhost:5173
echo Celular: http://192.168.1.24:5173
pause
