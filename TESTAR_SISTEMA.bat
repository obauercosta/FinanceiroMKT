@echo off
title FinanceiroMKT - Teste do Sistema
color 0A

echo.
echo ========================================
echo    FinanceiroMKT - Teste do Sistema
echo ========================================
echo.

:: Verificar Node.js
echo [TESTE] Verificando Node.js...
node --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [FALHA] Node.js nao encontrado!
    pause
    exit /b 1
) else (
    echo [OK] Node.js encontrado
)

:: Verificar npm
echo [TESTE] Verificando npm...
npm --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [FALHA] npm nao encontrado!
    pause
    exit /b 1
) else (
    echo [OK] npm encontrado
)

:: Verificar arquivos principais
echo [TESTE] Verificando arquivos principais...
if not exist "package.json" (
    echo [FALHA] package.json nao encontrado!
    pause
    exit /b 1
) else (
    echo [OK] package.json encontrado
)

if not exist "main.js" (
    echo [FALHA] main.js nao encontrado!
    pause
    exit /b 1
) else (
    echo [OK] main.js encontrado
)

if not exist "src\index.html" (
    echo [FALHA] src\index.html nao encontrado!
    pause
    exit /b 1
) else (
    echo [OK] src\index.html encontrado
)

:: Verificar dependências
echo [TESTE] Verificando dependencias...
if not exist "node_modules" (
    echo [AVISO] Dependencias nao instaladas, instalando...
    call npm install
    if %errorlevel% neq 0 (
        echo [FALHA] Erro ao instalar dependencias!
        pause
        exit /b 1
    )
) else (
    echo [OK] Dependencias encontradas
)

:: Criar diretórios necessários
echo [TESTE] Criando diretorios necessarios...
if not exist "data" mkdir data
if not exist "logs" mkdir logs

:: Testar sintaxe do JavaScript
echo [TESTE] Verificando sintaxe JavaScript...
node -c main.js
if %errorlevel% neq 0 (
    echo [FALHA] Erro de sintaxe em main.js!
    pause
    exit /b 1
) else (
    echo [OK] Sintaxe de main.js OK
)

:: Verificar se a porta está livre
echo [TESTE] Verificando porta 3000...
netstat -an | find "3000" >nul
if %errorlevel% equ 0 (
    echo [AVISO] Porta 3000 ja esta em uso
    echo [INFO] Tentando liberar a porta...
    for /f "tokens=5" %%a in ('netstat -ano ^| find "3000"') do (
        taskkill /PID %%a /F >nul 2>nul
    )
    timeout /t 2 >nul
) else (
    echo [OK] Porta 3000 livre
)

echo.
echo ========================================
echo    TESTE CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo O sistema esta pronto para uso.
echo Execute INICIAR.bat para iniciar o aplicativo.
echo.
pause
