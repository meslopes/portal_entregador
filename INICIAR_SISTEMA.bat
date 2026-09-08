@echo off
title MuvLog - Iniciando...
echo ========================================
echo  MuvLog - Iniciando Backend + Frontend
echo ========================================
echo.

echo Iniciando Backend (Flask) em nova janela...
start "MuvLog Backend" cmd /c "cd /d C:\Users\Dell\portal_entregador\portal_entregador\portal-backend && call venv\Scripts\activate.bat && python main.py"

echo Aguardando 5 segundos...
timeout /t 5 /nobreak >nul

echo Iniciando Frontend (Vite) em nova janela...
start "MuvLog Frontend" cmd /c "cd /d C:\Users\Dell\portal_entregador\portal_entregador\portal-frontend && npm run dev"

echo.
echo =============================================
echo  DOIS TERMINAIS ABERTOS:
echo  - Backend:  http://localhost:5000
echo  - Frontend: http://localhost:5173
echo  
echo  NAO FECHE OS TERMINAIS ABERTOS
echo  Para parar: feche as janelas dos terminais
echo =============================================
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
