@echo off
title FinanceiroMKT - Sistema Financeiro para Marketing Digital
color 0A

echo.
echo ========================================
echo    FinanceiroMKT - Sistema Financeiro
echo    Para Marketing Digital
echo ========================================
echo.

:: Verificar se Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale o Node.js de: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Verificar se npm está disponível
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] npm nao encontrado!
    echo Por favor, reinstale o Node.js
    echo.
    pause
    exit /b 1
)

:: Verificar se as dependências estão instaladas
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias!
        echo.
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas com sucesso!
    echo.
)

:: Criar diretório data se não existir
if not exist "data" (
    echo [INFO] Criando diretorio de dados...
    mkdir data
)

:: Função para iniciar o aplicativo
:start_app
echo [INFO] Iniciando FinanceiroMKT...
echo.

:: Tentar iniciar o aplicativo
call npm start 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao iniciar o aplicativo!
    echo.
    echo Tentando corrigir problemas...
    
    :: Limpar cache do npm
    echo [INFO] Limpando cache do npm...
    call npm cache clean --force >nul 2>nul
    
    :: Reinstalar dependências
    echo [INFO] Reinstalando dependencias...
    call npm install --force >nul 2>nul
    
    :: Tentar novamente
    echo [INFO] Tentando iniciar novamente...
    call npm start 2>nul
    if %errorlevel% neq 0 (
        echo [ERRO] Nao foi possivel iniciar o aplicativo!
        echo.
        echo Solucoes possiveis:
        echo 1. Verifique se a porta 3000 esta livre
        echo 2. Execute como administrador
        echo 3. Verifique se o antivirus nao esta bloqueando
        echo.
        pause
        exit /b 1
    )
)

echo [INFO] Aplicativo encerrado.
echo.
echo Pressione qualquer tecla para reiniciar ou feche esta janela para sair.
pause >nul
goto start_app
