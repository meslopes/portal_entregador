@echo off
title MuvLog - Backend (Flask)
echo ========================================
echo  MuvLog - Backend (Flask)
echo ========================================
echo.

cd /d C:\Users\Dell\portal_entregador\portal_entregador\portal-backend

echo [1/3] Ativando ambiente virtual...
if not exist "venv\Scripts\activate.bat" (
    echo ERRO: venv nao encontrado em portal-backend\venv
    echo Execute: python -m venv venv
    pause
    exit /b 1
)
call venv\Scripts\activate.bat

echo [2/3] Verificando Flask...
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo ERRO: Flask nao encontrado! Instalando...
    pip install -r requirements.txt
)

echo [3/3] Iniciando backend na porta 5000...
echo.
echo =============================================
echo  BACKEND RODANDO - NAO FECHE ESTA JANELA
echo  Acesse: http://localhost:5000/api/health
echo =============================================
echo.
python main.py

echo.
echo Backend parou. Pressione qualquer tecla para fechar...
pause >nul
