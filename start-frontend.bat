@echo off
echo ========================================
echo  MuvLog - Frontend (React + Vite)
echo ========================================
echo.

cd /d C:\Users\Dell\portal_entregador\portal_entregador\portal-frontend

echo Verificando node_modules...
if not exist "node_modules" (
    echo Instalando dependencias...
    npm install
)

echo.
echo Iniciando frontend na porta 5173...
echo Acesse: http://localhost:5173
echo.
npm run dev

pause
