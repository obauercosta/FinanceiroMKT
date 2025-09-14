@echo off
title FinanceiroMKT - Iniciando Sistema
color 0A

echo.
echo ========================================
echo    FinanceiroMKT - Sistema Financeiro
echo    Para Marketing Digital
echo ========================================
echo.

:: Verificar se estamos no diretório correto
if not exist "package.json" (
    echo [ERRO] Execute este arquivo na pasta do FinanceiroMKT!
    echo.
    pause
    exit /b 1
)

:: Verificar Node.js
echo [INFO] Verificando Node.js...
node --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Por favor, instale o Node.js de:
    echo https://nodejs.org
    echo.
    echo Apos instalar, execute este arquivo novamente.
    echo.
    pause
    exit /b 1
)

:: Verificar npm
echo [INFO] Verificando npm...
npm --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] npm nao encontrado!
    echo.
    echo Por favor, reinstale o Node.js
    echo.
    pause
    exit /b 1
)

:: Criar diretórios necessários
echo [INFO] Criando diretorios necessarios...
if not exist "data" mkdir data
if not exist "logs" mkdir logs

:: Verificar dependências
echo [INFO] Verificando dependencias...
if not exist "node_modules" (
    echo [INFO] Instalando dependencias pela primeira vez...
    echo Isso pode levar alguns minutos...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias!
        echo.
        echo Tentando solucoes alternativas...
        
        :: Limpar cache
        echo [INFO] Limpando cache do npm...
        call npm cache clean --force
        
        :: Tentar novamente
        echo [INFO] Tentando instalar novamente...
        call npm install --force
        
        if %errorlevel% neq 0 (
            echo [ERRO] Nao foi possivel instalar as dependencias!
            echo.
            echo Solucoes possiveis:
            echo 1. Execute como administrador
            echo 2. Verifique sua conexao com a internet
            echo 3. Desative temporariamente o antivirus
            echo.
            pause
            exit /b 1
        )
    )
    echo [OK] Dependencias instaladas com sucesso!
) else (
    echo [OK] Dependencias ja instaladas
)

:: Verificar se a porta 3000 está livre
echo [INFO] Verificando porta 3000...
netstat -an | find "3000" >nul
if %errorlevel% equ 0 (
    echo [AVISO] Porta 3000 ja esta em uso!
    echo.
    echo Tentando liberar a porta...
    
    :: Tentar matar processos na porta 3000
    for /f "tokens=5" %%a in ('netstat -ano ^| find "3000"') do (
        taskkill /PID %%a /F >nul 2>nul
    )
    
    timeout /t 2 >nul
)

:: Iniciar aplicativo
echo.
echo [INFO] Iniciando FinanceiroMKT...
echo.
echo ========================================
echo    O aplicativo sera aberto em breve
echo    Login: admin@financeiromkt.com
echo    Senha: admin123
echo ========================================
echo.

:: Função para reiniciar em caso de erro
:restart
call npm start
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] O aplicativo encerrou com erro!
    echo.
    echo Tentando reiniciar automaticamente...
    echo.
    timeout /t 5 >nul
    goto restart
)

echo.
echo [INFO] Aplicativo encerrado.
echo.
echo Pressione qualquer tecla para reiniciar ou feche esta janela para sair.
pause >nul
goto restart
