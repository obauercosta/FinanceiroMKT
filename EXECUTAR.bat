@echo off
title FinanceiroMKT - Executar Sistema
color 0A

echo.
echo ========================================
echo    FinanceiroMKT - Sistema Financeiro
echo    Para Marketing Digital
echo ========================================
echo.

:: Verificar Node.js
node --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Instale de: https://nodejs.org
    pause
    exit /b 1
)

:: Instalar dependências se necessário
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    npm install
)

:: Criar diretório data
if not exist "data" mkdir data

:: Iniciar aplicativo
echo [INFO] Iniciando aplicativo...
echo.
echo Login: admin@financeiromkt.com
echo Senha: admin123
echo.

npm start

pause
