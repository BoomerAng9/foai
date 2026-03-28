Param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('shadow', 'enforced', 'hardened', 'rollback')]
    [string]$Phase,
    [string]$BackendUrl,
    [string]$ToolUrl,
    [string]$SandboxUrl,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
    Write-Host "Usage: ./scripts/policy_uat.ps1 -Phase <shadow|enforced|hardened|rollback> [-BackendUrl URL] [-ToolUrl URL] [-SandboxUrl URL]"
    Write-Host "Examples:"
    Write-Host "  ./scripts/policy_uat.ps1 -Phase shadow"
    Write-Host "  ./scripts/policy_uat.ps1 -Phase enforced -BackendUrl http://localhost:8000"
    exit 0
}

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$EnvFile = Join-Path $RootDir "docker/.stack.env"

if (-not (Test-Path $EnvFile)) {
    throw "Missing docker/.stack.env"
}

function Read-EnvFile {
    param([string]$Path)
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

function Get-ExpectedFlags {
    param([string]$TargetPhase)
    switch ($TargetPhase) {
        'shadow' {
            return @{
                POLICY_LAYERS_ENABLED = 'true'
                POLICY_LAYERS_SHADOW_MODE = 'true'
                POLICY_LAYERS_EMIT_DEBUG_EVENTS = 'true'
                VITE_POLICY_DEBUG_EVENTS = 'true'
            }
        }
        'enforced' {
            return @{
                POLICY_LAYERS_ENABLED = 'true'
                POLICY_LAYERS_SHADOW_MODE = 'false'
                POLICY_LAYERS_EMIT_DEBUG_EVENTS = 'true'
                VITE_POLICY_DEBUG_EVENTS = 'false'
            }
        }
        'hardened' {
            return @{
                POLICY_LAYERS_ENABLED = 'true'
                POLICY_LAYERS_SHADOW_MODE = 'false'
                POLICY_LAYERS_EMIT_DEBUG_EVENTS = 'false'
                VITE_POLICY_DEBUG_EVENTS = 'false'
            }
        }
        'rollback' {
            return @{
                POLICY_LAYERS_ENABLED = 'false'
                POLICY_LAYERS_SHADOW_MODE = 'false'
                POLICY_LAYERS_EMIT_DEBUG_EVENTS = 'false'
                VITE_POLICY_DEBUG_EVENTS = 'false'
            }
        }
    }
}

function Check-HttpOk {
    param(
        [string]$Name,
        [string]$Url
    )
    try {
        $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
        if ($resp.StatusCode -eq 200) {
            Write-Host "PASS health $Name $Url"
            return $true
        }
        Write-Host "FAIL health $Name $Url code=$($resp.StatusCode)"
        return $false
    }
    catch {
        Write-Host "FAIL health $Name $Url error=$($_.Exception.Message)"
        return $false
    }
}

$envMap = Read-EnvFile $EnvFile
$backendPort = if ($envMap.ContainsKey('BACKEND_PORT')) { $envMap['BACKEND_PORT'] } else { '8000' }
$toolPort = if ($envMap.ContainsKey('TOOL_SERVER_PORT')) { $envMap['TOOL_SERVER_PORT'] } else { '1236' }
$sandboxPort = if ($envMap.ContainsKey('SANDBOX_SERVER_PORT')) { $envMap['SANDBOX_SERVER_PORT'] } else { '8100' }

if ([string]::IsNullOrWhiteSpace($BackendUrl)) { $BackendUrl = "http://localhost:$backendPort" }
if ([string]::IsNullOrWhiteSpace($ToolUrl)) { $ToolUrl = "http://localhost:$toolPort" }
if ([string]::IsNullOrWhiteSpace($SandboxUrl)) { $SandboxUrl = "http://localhost:$sandboxPort" }

Write-Host "Running policy UAT for phase '$Phase'"
Write-Host ""

$failed = $false
$expectedFlags = Get-ExpectedFlags $Phase
foreach ($entry in $expectedFlags.GetEnumerator()) {
    $key = $entry.Key
    $expected = $entry.Value
    $actual = if ($envMap.ContainsKey($key)) { $envMap[$key] } else { '' }
    if ($actual -eq $expected) {
        Write-Host "PASS env $key=$actual"
    }
    else {
        Write-Host "FAIL env $key expected '$expected' got '$actual'"
        $failed = $true
    }
}

Write-Host ""
if (-not (Check-HttpOk -Name 'backend' -Url "$BackendUrl/health")) { $failed = $true }
if (-not (Check-HttpOk -Name 'tool-server' -Url "$ToolUrl/health")) { $failed = $true }
if (-not (Check-HttpOk -Name 'sandbox-server' -Url "$SandboxUrl/health")) { $failed = $true }

Write-Host ""
Write-Host "Manual chat UAT matrix (record PASS/FAIL):"
Write-Host "1) Coding prompt          : \"Build a Python FastAPI endpoint with validation and tests.\""
Write-Host "2) Research prompt        : \"Summarize tradeoffs between Redis streams and Kafka for event fanout.\""
Write-Host "3) Deploy prompt          : \"Write a safe zero-downtime deployment plan for Docker Compose services.\""
Write-Host "4) Debug prompt           : \"Diagnose intermittent 502 from reverse proxy to backend with actionable checks.\""
Write-Host "5) Product/design prompt  : \"Design an MVP onboarding flow with 3 screens and success metrics.\""
Write-Host "6) Security prompt        : \"Harden API auth flow and list top 5 abuse vectors with mitigations.\""
Write-Host "7) Data prompt            : \"Propose a schema + index strategy for chat history at scale.\""
Write-Host "8) Incident prompt        : \"Create a 30-minute incident response runbook for service outage.\""
Write-Host "9) Agent policy prompt    : \"Explain which policy layers are likely active and why.\""
Write-Host "10) Regression prompt     : \"Repeat prompt #1 and compare quality/latency to previous phase baseline.\""
Write-Host ""
Write-Host "Acceptance gates:"
Write-Host "- Shadow: diagnostics visible, output quality unchanged."
Write-Host "- Enforced: no quality regressions, no health regressions."
Write-Host "- Hardened: stable outputs with debug events disabled."

if ($failed) {
    throw "UAT prechecks failed. Resolve failures before phase sign-off."
}

Write-Host "UAT prechecks passed. Continue with manual prompt matrix for final sign-off."
