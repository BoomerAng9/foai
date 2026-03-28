Param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('shadow', 'enforced', 'hardened', 'rollback')]
    [string]$Phase,
    [switch]$Build,
    [switch]$WithTunnel,
    [switch]$NoDeploy,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
    Write-Host "Usage: ./scripts/policy_rollout.ps1 -Phase <shadow|enforced|hardened|rollback> [-Build] [-WithTunnel] [-NoDeploy]"
    Write-Host "Examples:"
    Write-Host "  ./scripts/policy_rollout.ps1 -Phase shadow -Build"
    Write-Host "  ./scripts/policy_rollout.ps1 -Phase enforced -Build"
    Write-Host "  ./scripts/policy_rollout.ps1 -Phase hardened"
    Write-Host "  ./scripts/policy_rollout.ps1 -Phase rollback -Build"
    exit 0
}

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$EnvFile = Join-Path $RootDir "docker/.stack.env"
$EnvExample = Join-Path $RootDir "docker/.stack.env.example"
$PublishScript = Join-Path $RootDir "scripts/publish_stack.ps1"

if (-not (Test-Path $EnvFile)) {
    Copy-Item $EnvExample $EnvFile
    throw "Created docker/.stack.env from template. Fill required credentials, then rerun."
}

function Set-EnvValue {
    param(
        [string]$Path,
        [string]$Key,
        [string]$Value
    )

    $lines = Get-Content $Path
    $found = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        $trim = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trim) -or $trim.StartsWith('#')) {
            continue
        }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) {
            continue
        }
        $name = $line.Substring(0, $idx).Trim()
        if ($name -eq $Key) {
            $lines[$i] = "$Key=$Value"
            $found = $true
        }
    }

    if (-not $found) {
        $lines += "$Key=$Value"
    }

    Set-Content -Path $Path -Value $lines
}

switch ($Phase) {
    'shadow' {
        Set-EnvValue -Path $EnvFile -Key 'POLICY_LAYERS_ENABLED' -Value 'true'
        Set-EnvValue -Path $EnvFile -Key 'POLICY_LAYERS_SHADOW_MODE' -Value 'true'
        Set-EnvValue -Path $EnvFile -Key 'POLICY_LAYERS_EMIT_DEBUG_EVENTS' -Value 'true'
        Set-EnvValue -Path $EnvFile -Key 'VITE_POLICY_DEBUG_EVENTS' -Value 'true'
    }
    'enforced' {
        Set-EnvValue -Path $EnvFile -Key 'POLICY_LAYERS_ENABLED' -Value 'true'
        Set-EnvValue -Path $EnvFile -Key 'POLICY_LAYERS_SHADOW_MODE' -Value 'false'
        Set-EnvValue -Path $EnvFile -Key 'POLICY_LAYERS_EMIT_DEBUG_EVENTS' -Value 'true'
        Set-EnvValue -Path $EnvFile -Key 'VITE_POLICY_DEBUG_EVENTS' -Value 'false'
    }
    'hardened' {
        Set-EnvValue -Path $EnvFile -Key 'POLICY_LAYERS_ENABLED' -Value 'true'
        Set-EnvValue -Path $EnvFile -Key 'POLICY_LAYERS_SHADOW_MODE' -Value 'false'
        Set-EnvValue -Path $EnvFile -Key 'POLICY_LAYERS_EMIT_DEBUG_EVENTS' -Value 'false'
        Set-EnvValue -Path $EnvFile -Key 'VITE_POLICY_DEBUG_EVENTS' -Value 'false'
    }
    'rollback' {
        Set-EnvValue -Path $EnvFile -Key 'POLICY_LAYERS_ENABLED' -Value 'false'
        Set-EnvValue -Path $EnvFile -Key 'POLICY_LAYERS_SHADOW_MODE' -Value 'false'
        Set-EnvValue -Path $EnvFile -Key 'POLICY_LAYERS_EMIT_DEBUG_EVENTS' -Value 'false'
        Set-EnvValue -Path $EnvFile -Key 'VITE_POLICY_DEBUG_EVENTS' -Value 'false'
    }
}

Write-Host "Applied policy phase '$Phase' in docker/.stack.env"

if ($NoDeploy) {
    Write-Host "Skipping deploy (-NoDeploy)."
    exit 0
}

$publishArgs = @()
if ($Build) { $publishArgs += '-Build' }
if ($WithTunnel) { $publishArgs += '-WithTunnel' }

& $PublishScript @publishArgs
