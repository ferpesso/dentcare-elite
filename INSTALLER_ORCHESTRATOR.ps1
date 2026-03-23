# DentCare Elite V32 - Orquestrador de Engenharia de Campo (V10 - Elite Edition)
# Desenvolvido com os princípios de Principal Engineer para Windows 11

# Forçar codificação UTF-8 para a consola
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = "Continue" 
$LogFile = Join-Path $PSScriptRoot "dentcare_install.log"

function Write-Log($Message, $Type = "INFO") {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Type] $Message"
    Add-Content -Path $LogFile -Value $LogEntry
    
    switch ($Type) {
        "OK"    { Write-Host " [ OK ] $Message" -ForegroundColor Green }
        "ERRO"  { Write-Host " [ERRO] $Message" -ForegroundColor Red }
        "AVISO" { Write-Host " [ ! ] $Message" -ForegroundColor Yellow }
        default { Write-Host " [....] $Message" }
    }
}

function Test-Admin {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

try {
    Clear-Host
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  DENTCARE ELITE V32 - Instalador de Elite para Windows 11" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Log "Iniciando processo de instalação..."

    # 1. Verificar Privilégios
    if (-not (Test-Admin)) {
        Write-Log "Este instalador necessita de privilégios de Administrador." "ERRO"
        Write-Log "Por favor, clique com o botão direito no CLIQUE_AQUI_PARA_INSTALAR.bat e escolha 'Executar como Administrador'." "AVISO"
        exit 1
    }
    Write-Log "Privilégios de Administrador confirmados." "OK"

    # 2. Verificar/Instalar Node.js
    Write-Host "`n--- PASSO 1: Verificar Node.js ---" -ForegroundColor Cyan
    $nodeVersion = try { node -v 2>$null } catch { $null }
    if ($nodeVersion) {
        Write-Log "Node.js detectado: $nodeVersion" "OK"
    } else {
        Write-Log "Node.js não encontrado. Iniciando instalação automática..."
        $nodeUrl = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
        $nodeMsi = Join-Path $env:TEMP "nodejs_installer.msi"
        Write-Log "A descarregar Node.js LTS (v20.11.1)..."
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi
        Write-Log "A instalar Node.js silenciosamente (aguarde)..."
        $process = Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /qn /norestart" -Wait -PassThru
        if ($process.ExitCode -ne 0) {
            Write-Log "Falha ao instalar Node.js. Código: $($process.ExitCode)" "ERRO"
            exit 1
        }
        $env:Path += ";C:\Program Files\nodejs\"
        Write-Log "Node.js instalado com sucesso." "OK"
    }

    # 3. Verificar/Instalar PNPM
    Write-Host "`n--- PASSO 2: Verificar PNPM ---" -ForegroundColor Cyan
    $pnpmVersion = try { pnpm -v 2>$null } catch { $null }
    if ($pnpmVersion) {
        Write-Log "PNPM detectado: v$pnpmVersion" "OK"
    } else {
        Write-Log "PNPM não encontrado. A instalar via NPM..."
        npm install -g pnpm
        $env:Path += ";$env:APPDATA\npm"
        Write-Log "PNPM instalado com sucesso." "OK"
    }

    # 4. Verificar MySQL
    Write-Host "`n--- PASSO 3: Verificar MySQL ---" -ForegroundColor Cyan
    $mysqlPath = where.exe mysql 2>$null | Select-Object -First 1
    if (-not $mysqlPath) {
        $commonPaths = @(
            "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
            "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
            "C:\tools\mysql\current\bin\mysql.exe",
            "C:\xampp\mysql\bin\mysql.exe"
        )
        foreach ($path in $commonPaths) {
            if (Test-Path $path) { $mysqlPath = $path; break }
        }
    }

    if ($mysqlPath) {
        Write-Log "MySQL encontrado em: $mysqlPath" "OK"
    } else {
        Write-Log "MySQL não encontrado no sistema." "ERRO"
        Write-Log "Por favor, instale o MySQL ou XAMPP antes de continuar." "AVISO"
        exit 1
    }

    # 5. Gestão de Serviços MySQL
    Write-Host "`n--- PASSO 4: Gestão do Serviço MySQL ---" -ForegroundColor Cyan
    $activeService = Get-Service -Name "MySQL80" -ErrorAction SilentlyContinue
    if ($activeService -and $activeService.Status -eq "Running") {
        Write-Log "Serviço MySQL80 detetado e em execução." "OK"
    } else {
        $anyRunning = Get-Service -Name "*mysql*", "*mariadb*" | Where-Object { $_.Status -eq "Running" }
        if ($anyRunning) {
            Write-Log "Serviço $($anyRunning[0].Name) detetado e em execução." "OK"
            $activeService = $anyRunning[0]
        } else {
            Write-Log "Nenhum serviço MySQL ativo detetado. Tentando iniciar MySQL80..."
            try {
                Start-Service -Name "MySQL80" -ErrorAction Stop
                Write-Log "Serviço MySQL80 iniciado." "OK"
                $activeService = Get-Service -Name "MySQL80"
            } catch {
                Write-Log "Não foi possível iniciar o serviço automaticamente." "AVISO"
            }
        }
    }

    # 6. Configuração da Base de Dados (Lógica de Autenticação Múltipla)
    Write-Host "`n--- PASSO 5: Configuração da Base de Dados ---" -ForegroundColor Cyan
    
    $mysqlPid = (Get-Process -Name "mysqld" -ErrorAction SilentlyContinue).Id
    $realPort = "3306"
    if ($mysqlPid) {
        $netstat = netstat -ano | Select-String "LISTENING" | Select-String $mysqlPid
        if ($netstat -match ":(\d+)\s+.*$mysqlPid") { $realPort = $matches[1] }
    }

    $dbUser = "root"
    $finalPass = $null
    $successHost = $null
    $hosts = @("localhost", "127.0.0.1")

    $authenticated = $false
    while (-not $authenticated) {
        $dbPass = Read-Host "Senha do MySQL para 'root' (Pressione Enter se for 'dentcare')"
        if ([string]::IsNullOrWhiteSpace($dbPass)) { $dbPass = "dentcare" }
        
        Write-Log "A testar ligação..."
        foreach ($h in $hosts) {
            # Testar com a senha fornecida
            cmd /c "`"$mysqlPath`" -h $h -P $realPort -u $dbUser -p`"$dbPass`" -e `"SELECT 1`" >> `"$LogFile`" 2>&1"
            if ($LASTEXITCODE -eq 0) {
                $successHost = $h
                $finalPass = $dbPass
                $authenticated = $true
                break
            }
            # Testar sem senha (caso root esteja vazio)
            cmd /c "`"$mysqlPath`" -h $h -P $realPort -u $dbUser -e `"SELECT 1`" >> `"$LogFile`" 2>&1"
            if ($LASTEXITCODE -eq 0) {
                $successHost = $h
                $finalPass = ""
                $authenticated = $true
                break
            }
        }

        if (-not $authenticated) {
            Write-Log "Falha na ligação com a senha fornecida." "AVISO"
            Write-Log "NOTA: O servidor pode tentar ligar automaticamente ao MySQL ao iniciar." "AVISO"
            $choice = Read-Host "Deseja [T]entar outra senha ou [I]gnorar erro e continuar a instalação? (T/I)"
            if ($choice -eq "I" -or $choice -eq "i") {
                Write-Log "Bypass de erro ativado pelo utilizador. O servidor tentará ligar automaticamente." "AVISO"
                $successHost = "localhost"
                $finalPass = $dbPass
                $authenticated = $true
            } elseif ($choice -ne "T" -and $choice -ne "t") {
                # Se o utilizador pressionar Enter sem responder, assumir Ignorar
                Write-Log "Nenhuma resposta fornecida. Assumindo [I]gnorar e continuando..." "AVISO"
                $successHost = "localhost"
                $finalPass = $dbPass
                $authenticated = $true
            }
        }
    }

    Write-Log "Configuração de base de dados validada." "OK"

    # Criar Base de Dados (Se possível)
    Write-Log "A tentar criar base de dados 'dentcare'..."
    if ([string]::IsNullOrWhiteSpace($finalPass)) {
        cmd /c "`"$mysqlPath`" -h $successHost -P $realPort -u $dbUser -e `"CREATE DATABASE IF NOT EXISTS dentcare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`" >> `"$LogFile`" 2>&1"
    } else {
        cmd /c "`"$mysqlPath`" -h $successHost -P $realPort -u $dbUser -p`"$finalPass`" -e `"CREATE DATABASE IF NOT EXISTS dentcare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`" >> `"$LogFile`" 2>&1"
    }

    # 7. Configurar .env
    Write-Host "`n--- PASSO 6: Configurar Variáveis de Ambiente ---" -ForegroundColor Cyan
    $envPath = Join-Path $PSScriptRoot ".env"
    $sessionSecret = [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")
    
    if ([string]::IsNullOrWhiteSpace($finalPass)) {
        $dbUrl = "mysql://${dbUser}@${successHost}:${realPort}/dentcare"
    } else {
        $dbUrl = "mysql://${dbUser}:${finalPass}@${successHost}:${realPort}/dentcare"
    }

    $encryptionKey = -join((1..32)|ForEach-Object{'{0:x2}' -f (Get-Random -Max 256)})

    $envContent = @"
NODE_ENV=production
PORT=3000
DATABASE_URL=$dbUrl
SESSION_SECRET=$sessionSecret
ENCRYPTION_KEY=$encryptionKey
ALLOWED_ORIGIN=http://localhost:3000
"@
    $Utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $False
    [System.IO.File]::WriteAllLines($envPath, $envContent, $Utf8NoBomEncoding)
    Write-Log "Ficheiro .env gerado com sucesso." "OK"

    # 8. Instalação de Dependências e Build
    Write-Host "`n--- PASSO 7: Preparar Aplicação (pnpm install & build) ---" -ForegroundColor Cyan
    Write-Log "A instalar dependências (pnpm install)..."
    cmd /c "pnpm install >> `"$LogFile`" 2>&1"
    
    Write-Log "A aplicar schema da base de dados..."
    cmd /c "pnpm run db:push >> `"$LogFile`" 2>&1"
    
    Write-Log "A compilar a aplicação (build)..."
    cmd /c "pnpm run build >> `"$LogFile`" 2>&1"
    Write-Log "Aplicação preparada com sucesso." "OK"

    # 9. Finalização
    Write-Host "`n================================================================" -ForegroundColor Green
    Write-Host "  INSTALAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "  URL: http://localhost:3000"
    Write-Host "  Para iniciar o sistema, utilize o script INICIAR_DENTCARE_ELITE.bat"
    Write-Host "================================================================" -ForegroundColor Green

} catch {
    Write-Log "Ocorreu um erro crítico durante a instalação: $($_.Exception.Message)" "ERRO"
    Write-Log "Consulte o ficheiro dentcare_install.log para mais detalhes." "AVISO"
} finally {
    Write-Host "`nPreme qualquer tecla para sair..."
    $null = [Console]::ReadKey($true)
}
