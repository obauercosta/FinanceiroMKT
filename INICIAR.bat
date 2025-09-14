@echo off
title FinanceiroMKT
color 0A

echo Iniciando FinanceiroMKT...

:: Verificar Node.js
node --version >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Instale de: https://nodejs.org
    pause
    exit /b 1
)

:: Instalar dependências
if not exist "node_modules" (
    echo Instalando dependencias...
    npm install
)

:: Criar pasta data
if not exist "data" mkdir data

:: Iniciar
echo.
echo ========================================
echo    FinanceiroMKT - Sistema Financeiro
echo ========================================
echo.
echo Login: admin@financeiromkt.com
echo Senha: admin123
echo.
echo Aguarde a abertura do aplicativo...
echo.

npm start

echo.
echo Aplicativo encerrado.
pause
