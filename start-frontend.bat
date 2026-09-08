@echo off
title MuvLog - Frontend (React + Vite)
echo ========================================
echo  MuvLog - Frontend (React + Vite)
echo ========================================
echo.

cd /d C:\Users\Dell\portal_entregador\portal_entregador\portal-frontend

echo [1/2] Verificando dependencias...
if not exist "node_modules" (
    echo node_modules nao encontrado. Instalando...
    npm install
    if errorlevel 1 (
        echo ERRO: Falha ao instalar dependencias
        pause
        exit /b 1
    )
)

echo [2/2] Iniciando frontend na porta 5173...
echo.
echo =============================================
echo  FRONTEND RODANDO - NAO FECHE ESTA JANELA
echo  Acesse: http://localhost:5173
echo =============================================
echo.
npm run dev

echo.
echo Frontend parou. Pressione qualquer tecla para fechar...
pause >nul
