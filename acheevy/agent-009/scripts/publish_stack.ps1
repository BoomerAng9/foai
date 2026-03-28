Param(
    [switch]$Build,
    [switch]$WithTunnel,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
    Write-Host "Usage: ./scripts/publish_stack.ps1 [-Build] [-WithTunnel]"
    Write-Host "  -Build       Rebuild Docker images before startup"
    Write-Host "  -WithTunnel  Start ngrok tunnel profile (optional)"
    exit 0
}

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$ComposeFile = Join-Path $RootDir "docker/docker-compose.stack.yaml"
$EnvFile = Join-Path $RootDir "docker/.stack.env"
$EnvExample = Join-Path $RootDir "docker/.stack.env.example"
$ProjectName = if ($env:COMPOSE_PROJECT_NAME) { $env:COMPOSE_PROJECT_NAME } else { "ii-agent-stack" }

function Ensure-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

function Read-EnvFile([string]$Path) {
    $map = @{}
    foreach ($line in Get-Content $Path) {
        $trim = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trim) -or $trim.StartsWith('#')) { continue }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { continue }
        $key = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1)
        $map[$key] = $value
    }
    return $map
}

function Is-Placeholder([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $true }
    if ($Value.StartsWith('replace-with-')) { return $true }
    if ($Value.StartsWith('/absolute/path/')) { return $true }
    return $false
}

function Wait-HttpOk([string]$Name, [string]$Url, [int]$Retries = 60) {
    for ($i = 1; $i -le $Retries; $i++) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
                Write-Host "✓ $Name healthy at $Url"
                return
            }
        }
        catch {}
        Start-Sleep -Seconds 2
    }
    throw "$Name did not become healthy at $Url"
}

function Compose([string[]]$Args) {
    $baseArgs = @("compose", "--project-name", $ProjectName, "--env-file", $EnvFile, "-f", $ComposeFile)
    & docker @baseArgs @Args
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed: $($Args -join ' ')"
    }
}

if (-not (Test-Path $EnvFile)) {
    Copy-Item $EnvExample $EnvFile
    throw "Created docker/.stack.env from template. Fill required credentials, then rerun."
}

Ensure-Command docker

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker daemon is not available. Start Docker Engine service and retry."
}

$envMap = Read-EnvFile $EnvFile

$openrouterApiKey = if ($envMap.ContainsKey('OPENROUTER_API_KEY')) { $envMap['OPENROUTER_API_KEY'] } else { '' }
$databaseUrl = if ($envMap.ContainsKey('DATABASE_URL')) { $envMap['DATABASE_URL'] } else { '' }
$sandboxDatabaseUrl = if ($envMap.ContainsKey('SANDBOX_DATABASE_URL')) { $envMap['SANDBOX_DATABASE_URL'] } else { '' }
$googleCreds = if ($envMap.ContainsKey('GOOGLE_APPLICATION_CREDENTIALS')) { $envMap['GOOGLE_APPLICATION_CREDENTIALS'] } else { '' }
$publicToolServerUrl = if ($envMap.ContainsKey('PUBLIC_TOOL_SERVER_URL')) { $envMap['PUBLIC_TOOL_SERVER_URL'] } else { '' }

if (Is-Placeholder $openrouterApiKey) {
    throw "OPENROUTER_API_KEY is missing or placeholder in docker/.stack.env"
}

if ([string]::IsNullOrWhiteSpace($databaseUrl) -or [string]::IsNullOrWhiteSpace($sandboxDatabaseUrl)) {
    throw "DATABASE_URL and SANDBOX_DATABASE_URL must be set in docker/.stack.env"
}

if ([string]::IsNullOrWhiteSpace($publicToolServerUrl)) {
    Write-Warning "PUBLIC_TOOL_SERVER_URL is empty; backend will use internal default http://tool-server:1236"
}

if (Is-Placeholder $googleCreds) {
    Write-Warning "GOOGLE_APPLICATION_CREDENTIALS is placeholder; storage/media features may fail."
}

Write-Host "Starting production stack: $ProjectName"

$upArgs = @("up", "-d")
if ($Build) { $upArgs += "--build" }
$upArgs += @("postgres", "redis", "tool-server", "sandbox-server", "backend", "frontend")
Compose $upArgs

if ($WithTunnel) {
    Write-Host "Starting tunnel profile..."
    Compose @("--profile", "tunnel", "up", "-d", "ngrok")
}

$backendPort = if ($envMap.ContainsKey('BACKEND_PORT')) { $envMap['BACKEND_PORT'] } else { '8000' }
$frontendPort = if ($envMap.ContainsKey('FRONTEND_PORT')) { $envMap['FRONTEND_PORT'] } else { '1420' }
$sandboxPort = if ($envMap.ContainsKey('SANDBOX_SERVER_PORT')) { $envMap['SANDBOX_SERVER_PORT'] } else { '8100' }
$toolPort = if ($envMap.ContainsKey('TOOL_SERVER_PORT')) { $envMap['TOOL_SERVER_PORT'] } else { '1236' }

Wait-HttpOk -Name "backend" -Url "http://localhost:$backendPort/health"
Wait-HttpOk -Name "sandbox-server" -Url "http://localhost:$sandboxPort/health"
Wait-HttpOk -Name "tool-server" -Url "http://localhost:$toolPort/health"

Write-Host ""
Write-Host "Production stack is running."
Write-Host "  Frontend:       http://localhost:$frontendPort"
Write-Host "  Backend:        http://localhost:$backendPort"
Write-Host "  Sandbox:        http://localhost:$sandboxPort"
Write-Host "  Tool server:    http://localhost:$toolPort"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  docker compose --project-name $ProjectName --env-file docker/.stack.env -f docker/docker-compose.stack.yaml ps"
Write-Host "  docker compose --project-name $ProjectName --env-file docker/.stack.env -f docker/docker-compose.stack.yaml logs -f backend"
Write-Host "  docker compose --project-name $ProjectName --env-file docker/.stack.env -f docker/docker-compose.stack.yaml down"
