# FinanceiroMKT - Sistema Financeiro para Marketing Digital
# Executável PowerShell com tratamento de erros

param(
    [switch]$Force,
    [switch]$Debug
)

# Configurações
$AppName = "FinanceiroMKT"
$AppVersion = "1.0.0"
$RequiredNodeVersion = "16.0.0"

# Cores para output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Header {
    Write-ColorOutput "`n========================================" "Cyan"
    Write-ColorOutput "    $AppName - Sistema Financeiro" "Cyan"
    Write-ColorOutput "    Para Marketing Digital v$AppVersion" "Cyan"
    Write-ColorOutput "========================================`n" "Cyan"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERRO] $Message" "Red"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" "Yellow"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[OK] $Message" "Green"
}

function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            return $false
        }
        
        $version = $nodeVersion.TrimStart('v')
        $required = [Version]$RequiredNodeVersion
        $current = [Version]$version
        
        if ($current -lt $required) {
            Write-Error "Node.js versão $version encontrada, mas versão $RequiredNodeVersion ou superior é necessária"
            return $false
        }
        
        Write-Success "Node.js $version encontrado"
        return $true
    }
    catch {
        return $false
    }
}

function Test-NPM {
    try {
        $npmVersion = npm --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            return $false
        }
        
        Write-Success "npm $npmVersion encontrado"
        return $true
    }
    catch {
        return $false
    }
}

function Install-Dependencies {
    Write-Info "Verificando dependências..."
    
    if (-not (Test-Path "package.json")) {
        Write-Error "Arquivo package.json não encontrado!"
        return $false
    }
    
    if (-not (Test-Path "node_modules") -or $Force) {
        Write-Info "Instalando dependências..."
        
        try {
            if ($Debug) {
                npm install
            } else {
                npm install 2>$null
            }
            
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Falha ao instalar dependências!"
                return $false
            }
            
            Write-Success "Dependências instaladas com sucesso!"
        }
        catch {
            Write-Error "Erro ao instalar dependências: $($_.Exception.Message)"
            return $false
        }
    } else {
        Write-Success "Dependências já instaladas"
    }
    
    return $true
}

function Initialize-Directories {
    Write-Info "Inicializando diretórios..."
    
    $directories = @("data", "logs", "temp")
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Success "Diretório $dir criado"
        }
    }
}

function Start-Application {
    Write-Info "Iniciando $AppName..."
    
    $maxRetries = 3
    $retryCount = 0
    
    do {
        try {
            if ($Debug) {
                npm start
            } else {
                npm start 2>$null
            }
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Aplicativo encerrado normalmente"
                return $true
            } else {
                $retryCount++
                Write-Error "Falha ao iniciar aplicativo (tentativa $retryCount/$maxRetries)"
                
                if ($retryCount -lt $maxRetries) {
                    Write-Info "Tentando corrigir problemas..."
                    
                    # Limpar cache
                    Write-Info "Limpando cache do npm..."
                    npm cache clean --force 2>$null
                    
                    # Reinstalar dependências
                    Write-Info "Reinstalando dependências..."
                    npm install --force 2>$null
                    
                    Start-Sleep -Seconds 2
                }
            }
        }
        catch {
            $retryCount++
            Write-Error "Erro ao iniciar aplicativo: $($_.Exception.Message)"
            
            if ($retryCount -ge $maxRetries) {
                Write-Error "Máximo de tentativas atingido!"
                return $false
            }
        }
    } while ($retryCount -lt $maxRetries)
    
    return $false
}

function Show-Help {
    Write-Header
    Write-ColorOutput "Uso: .\FinanceiroMKT.ps1 [opções]" "White"
    Write-ColorOutput "`nOpções:" "White"
    Write-ColorOutput "  -Force    Força reinstalação das dependências" "White"
    Write-ColorOutput "  -Debug    Mostra output detalhado" "White"
    Write-ColorOutput "  -Help     Mostra esta ajuda" "White"
    Write-ColorOutput "`nExemplos:" "White"
    Write-ColorOutput "  .\FinanceiroMKT.ps1" "White"
    Write-ColorOutput "  .\FinanceiroMKT.ps1 -Force" "White"
    Write-ColorOutput "  .\FinanceiroMKT.ps1 -Debug" "White"
}

# Função principal
function Main {
    if ($args -contains "-Help" -or $args -contains "--help" -or $args -contains "-h") {
        Show-Help
        return
    }
    
    Write-Header
    
    # Verificar Node.js
    if (-not (Test-NodeJS)) {
        Write-Error "Node.js não encontrado ou versão incompatível!"
        Write-Info "Por favor, instale o Node.js de: https://nodejs.org"
        Read-Host "Pressione Enter para sair"
        exit 1
    }
    
    # Verificar npm
    if (-not (Test-NPM)) {
        Write-Error "npm não encontrado!"
        Write-Info "Por favor, reinstale o Node.js"
        Read-Host "Pressione Enter para sair"
        exit 1
    }
    
    # Instalar dependências
    if (-not (Install-Dependencies)) {
        Write-Error "Falha ao instalar dependências!"
        Read-Host "Pressione Enter para sair"
        exit 1
    }
    
    # Inicializar diretórios
    Initialize-Directories
    
    # Loop principal
    do {
        # Iniciar aplicativo
        $success = Start-Application
        
        if (-not $success) {
            Write-Error "Não foi possível iniciar o aplicativo!"
            Write-Info "Soluções possíveis:"
            Write-Info "1. Verifique se a porta 3000 está livre"
            Write-Info "2. Execute como administrador"
            Write-Info "3. Verifique se o antivírus não está bloqueando"
            Write-Info "4. Verifique se o firewall não está bloqueando"
        }
        
        Write-ColorOutput "`nPressione Enter para reiniciar ou Ctrl+C para sair" "Cyan"
        Read-Host
        
    } while ($true)
}

# Executar função principal
try {
    Main
}
catch {
    Write-Error "Erro inesperado: $($_.Exception.Message)"
    Read-Host "Pressione Enter para sair"
    exit 1
}
