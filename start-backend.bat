@echo off
echo ========================================
echo  MuvLog - Backend (Flask)
echo ========================================
echo.

cd /d C:\Users\Dell\portal_entregador\portal_entregador\portal-backend

echo Ativando ambiente virtual...
call venv\Scripts\activate.bat

echo Verificando dependencias...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo ERRO: Flask nao encontrado no venv!
    echo Execute: pip install -r requirements.txt
    pause
    exit /b 1
)

echo.
echo Iniciando backend na porta 5000...
echo Acesse: http://localhost:5000/api/health
echo.
python main.py

pause
