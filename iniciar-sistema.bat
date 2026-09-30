@echo off
echo ========================================
echo  Portal Entregador (muv.log) - Startup
echo ========================================
echo.

echo [1/2] Iniciando Backend (Flask) na porta 5000...
start "Backend - muv.log" cmd /k "cd /d C:\Users\Dell\portal_entregador\portal_entregador\portal-backend && python main.py"

echo [2/2] Iniciando Frontend (Vite) na porta 5173...
start "Frontend - muv.log" cmd /k "cd /d C:\Users\Dell\portal_entregador\portal_entregador\portal-frontend && npm run dev"

echo.
echo Sistema iniciado!
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo   Rede:     http://192.168.1.4:5173
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
