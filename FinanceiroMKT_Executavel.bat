@echo off
setlocal enabledelayedexpansion
title FinanceiroMKT - Sistema Financeiro Completo
color 0A

:: Configurações
set APP_NAME=FinanceiroMKT
set APP_VERSION=1.0.0
set NODE_VERSION_REQUIRED=16.0.0
set PORT=3000

echo.
echo ========================================
echo    %APP_NAME% - Sistema Financeiro
echo    Para Marketing Digital v%APP_VERSION%
echo ========================================
echo.

:: Função para log
:log
echo [%date% %time%] %~1
goto :eof

:: Função para erro
:error
echo [ERRO] %~1
goto :eof

:: Função para sucesso
:success
echo [OK] %~1
goto :eof

:: Função para info
:info
echo [INFO] %~1
goto :eof

:: Verificar se estamos no diretório correto
if not exist "package.json" (
    call :error "Execute este arquivo na pasta do FinanceiroMKT!"
    echo.
    echo Estrutura esperada:
    echo FinanceiroMKT\
    echo ├── package.json
    echo ├── main.js
    echo ├── src\
    echo └── api\
    echo.
    pause
    exit /b 1
)

call :info "Verificando ambiente..."

:: Verificar Node.js
call :info "Verificando Node.js..."
node --version >nul 2>nul
if %errorlevel% neq 0 (
    call :error "Node.js nao encontrado!"
    echo.
    echo Por favor, instale o Node.js de:
    echo https://nodejs.org
    echo.
    echo Versao recomendada: 18.x ou superior
    echo.
    pause
    exit /b 1
)

:: Obter versão do Node.js
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
call :success "Node.js %NODE_VERSION% encontrado"

:: Verificar npm
call :info "Verificando npm..."
npm --version >nul 2>nul
if %errorlevel% neq 0 (
    call :error "npm nao encontrado!"
    echo.
    echo Por favor, reinstale o Node.js
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
call :success "npm %NPM_VERSION% encontrado"

:: Criar diretórios necessários
call :info "Criando diretorios necessarios..."
if not exist "data" (
    mkdir data
    call :success "Diretorio data criado"
)
if not exist "logs" (
    mkdir logs
    call :success "Diretorio logs criado"
)
if not exist "temp" (
    mkdir temp
    call :success "Diretorio temp criado"
)

:: Verificar e instalar dependências
call :info "Verificando dependencias..."
if not exist "node_modules" (
    call :info "Instalando dependencias pela primeira vez..."
    echo Isso pode levar alguns minutos...
    echo.
    
    :: Tentar instalação normal
    call npm install
    if %errorlevel% neq 0 (
        call :error "Falha na instalacao normal!"
        call :info "Tentando solucoes alternativas..."
        
        :: Limpar cache
        call :info "Limpando cache do npm..."
        call npm cache clean --force
        
        :: Tentar com --force
        call :info "Tentando instalacao com --force..."
        call npm install --force
        
        if %errorlevel% neq 0 (
            call :error "Falha na instalacao com --force!"
            
            :: Tentar com --legacy-peer-deps
            call :info "Tentando instalacao com --legacy-peer-deps..."
            call npm install --legacy-peer-deps
            
            if %errorlevel% neq 0 (
                call :error "Nao foi possivel instalar as dependencias!"
                echo.
                echo Solucoes possiveis:
                echo 1. Execute como administrador
                echo 2. Verifique sua conexao com a internet
                echo 3. Desative temporariamente o antivirus
                echo 4. Verifique se ha espaco suficiente no disco
                echo.
                pause
                exit /b 1
            )
        )
    )
    call :success "Dependencias instaladas com sucesso!"
) else (
    call :success "Dependencias ja instaladas"
)

:: Verificar se a porta está livre
call :info "Verificando porta %PORT%..."
netstat -an | find ":%PORT% " >nul
if %errorlevel% equ 0 (
    call :info "Porta %PORT% ja esta em uso!"
    call :info "Tentando liberar a porta..."
    
    :: Tentar matar processos na porta
    for /f "tokens=5" %%a in ('netstat -ano ^| find ":%PORT% "') do (
        taskkill /PID %%a /F >nul 2>nul
    )
    
    timeout /t 3 >nul
)

:: Verificar se o arquivo main.js existe
if not exist "main.js" (
    call :error "Arquivo main.js nao encontrado!"
    echo.
    echo Verifique se todos os arquivos estao presentes:
    echo - main.js
    echo - package.json
    echo - src/index.html
    echo - api/database/database.js
    echo.
    pause
    exit /b 1
)

:: Verificar se o arquivo src/index.html existe
if not exist "src\index.html" (
    call :error "Arquivo src/index.html nao encontrado!"
    echo.
    echo A interface do usuario nao foi encontrada!
    echo.
    pause
    exit /b 1
)

:: Mostrar informações do sistema
echo.
call :info "Informacoes do sistema:"
echo - Node.js: %NODE_VERSION%
echo - npm: %NPM_VERSION%
echo - Porta: %PORT%
echo - Diretorio: %CD%
echo.

:: Função para iniciar aplicativo
:start_app
call :info "Iniciando %APP_NAME%..."
echo.
echo ========================================
echo    O aplicativo sera aberto em breve
echo.
echo    Login: admin@financeiromkt.com
echo    Senha: admin123
echo.
echo    Para parar o aplicativo, feche esta
echo    janela ou pressione Ctrl+C
echo ========================================
echo.

:: Iniciar aplicativo com tratamento de erro
call npm start
set APP_EXIT_CODE=%errorlevel%

if %APP_EXIT_CODE% neq 0 (
    call :error "O aplicativo encerrou com codigo de erro: %APP_EXIT_CODE%"
    echo.
    echo Possiveis causas:
    echo 1. Porta %PORT% ja esta em uso
    echo 2. Erro no banco de dados
    echo 3. Arquivo corrompido
    echo 4. Permissao insuficiente
    echo.
    
    call :info "Tentando reiniciar automaticamente em 5 segundos..."
    echo Pressione Ctrl+C para cancelar
    timeout /t 5 >nul
    goto start_app
) else (
    call :success "Aplicativo encerrado normalmente"
)

echo.
echo ========================================
echo    %APP_NAME% encerrado
echo ========================================
echo.
echo Pressione qualquer tecla para reiniciar
echo ou feche esta janela para sair
pause >nul
goto start_app
