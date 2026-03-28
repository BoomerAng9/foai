<#
.SYNOPSIS
Deploys the ACHEEVY repositories from myclaw-vps to aims-vps.

.DESCRIPTION
This script handles the cross-VPS migration by automating:
1. Copying the cloned backend repos from myclaw-vps to the local machine dynamically.
2. Pushing the backend repos, landing page, and docker-compose.yml to aims-vps.
3. Starting the deployment on aims-vps.
#>

param (
    [string]$AimsVPS = "aims-vps",
    [string]$DeployDir = "/root/acheevy-deployment"
)

Write-Host "Starting native ACHEEVY Deployment Sequence on $AimsVPS..." -ForegroundColor Cyan

# 1. Create necessary dirs on aims-vps
Write-Host "`n[1/3] Initializing directory structure and pushing deployment configs..." -ForegroundColor Yellow
ssh $AimsVPS "mkdir -p ${DeployDir}/backend ${DeployDir}/frontend"

# Push docker-compose, frontend, and setup script
scp "$PSScriptRoot\docker-compose.yml" "${AimsVPS}:${DeployDir}/"
scp "$PSScriptRoot\index.html" "${AimsVPS}:${DeployDir}/frontend/"
scp "$PSScriptRoot\build_and_rebrand.sh" "${AimsVPS}:${DeployDir}/"

# 2. Run remote git cloning and rebranding script
Write-Host "`n[2/3] Executing native clone and ACHEEVY rebranding on $AimsVPS..." -ForegroundColor Yellow
ssh $AimsVPS "chmod +x ${DeployDir}/build_and_rebrand.sh && ${DeployDir}/build_and_rebrand.sh"

# 3. Start the runtime
Write-Host "`n[3/3] Building containers and starting the ACHEEVY runtime..." -ForegroundColor Yellow
ssh $AimsVPS "cd $DeployDir && docker compose up -d --build"

Write-Host "`nDeployment Sequence Complete! ACHEEVY is now building and spinning up on AIMS-VPS natively." -ForegroundColor Green
Write-Host "Services exposed:"
Write-Host " - Frontend UI: acheevy.digital / www.acheevy.digital"
Write-Host " - Agent Orchestrator: agent.acheevy.digital / port 8001"
Write-Host " - Common Ground: port 8002-8004"
