#!/usr/bin/env bash
# =============================================================================
# A.I.M.S. VPS2 Deploy Script — OpenSandbox, Plug Engine, Monitoring, nginx
# =============================================================================
# Run this ON VPS2 (srv1318308.hstgr.cloud / 31.97.138.45) after cloning:
#
#   ssh root@31.97.138.45
#   git clone https://github.com/BoomerAng9/Agent-ACHEEVY-009.git /opt/aims
#   cd /opt/aims/deploy/vps2-opensandbox
#   cp .env.example .env && nano .env        # fill in secrets
#   chmod +x deploy-vps2.sh && ./deploy-vps2.sh
#
# On subsequent deploys (CI-triggered or manual):
#   cd /opt/aims && git pull && cd deploy/vps2-opensandbox && ./deploy-vps2.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"
TELEGRAM_DIR="${REPO_ROOT}/deploy/telegram-bridge"

# ─── Colors ─────────────────────────────────────────────────────────────────
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; C='\033[0;36m'; N='\033[0m'
info()   { printf "${G}[VPS2]${N}  %s\n" "$1"; }
warn()   { printf "${Y}[VPS2]${N}  %s\n" "$1"; }
error()  { printf "${R}[VPS2]${N}  %s\n" "$1"; exit 1; }
header() { printf "\n${C}━━━ %s ━━━${N}\n\n" "$1"; }

# ─── Pre-flight ──────────────────────────────────────────────────────────────
header "A.I.M.S. VPS2 Deploy"

[[ -f "${ENV_FILE}" ]] || {
    warn ".env not found — copying from example. Edit it before continuing."
    cp "${ENV_EXAMPLE}" "${ENV_FILE}"
    error "Please edit ${ENV_FILE} and re-run."
}

command -v docker >/dev/null 2>&1 || error "Docker not installed. Run infra/vps-setup.sh first."
command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 || \
    error "Docker Compose v2 not found."

# ─── 1. Create required directories ─────────────────────────────────────────
header "1/5  Prep directories"
mkdir -p /etc/aims/nginx/plugs
mkdir -p /var/www/certbot
mkdir -p "${REPO_ROOT}/data/plug-engine"
mkdir -p "${REPO_ROOT}/data/sandbox-tmp"
info "Directories ready."

# ─── 2. Pull latest code ─────────────────────────────────────────────────────
header "2/5  Git pull"
cd "${REPO_ROOT}"
git fetch --all
git reset --hard origin/main
info "Repo at $(git rev-parse --short HEAD)."

# ─── 3. Build + deploy VPS2 stack ────────────────────────────────────────────
header "3/5  Docker Compose build & up"
cd "${SCRIPT_DIR}"

# Pass repo root as build context for sandbox (needs uv.lock + src/)
export COMPOSE_BUILD_CONTEXT="${REPO_ROOT}"

docker compose \
    --env-file "${ENV_FILE}" \
    -f "${COMPOSE_FILE}" \
    build --pull --no-cache

docker compose \
    --env-file "${ENV_FILE}" \
    -f "${COMPOSE_FILE}" \
    up -d --remove-orphans

info "VPS2 stack deployed."

# ─── 4. Deploy Telegram bridge ───────────────────────────────────────────────
header "4/5  Telegram bridge"

TELE_ENV="${TELEGRAM_DIR}/.env"
if [[ ! -f "${TELE_ENV}" ]]; then
    warn "Telegram .env missing at ${TELE_ENV}"
    warn "Skipping Telegram bridge deployment."
else
    docker build -t aims-telegram-bridge "${TELEGRAM_DIR}"
    docker rm -f aims-telegram-bridge 2>/dev/null || true
    docker run -d \
        --name aims-telegram-bridge \
        --restart unless-stopped \
        --env-file "${TELE_ENV}" \
        --network host \
        aims-telegram-bridge
    info "Telegram bridge running."
fi

# ─── 5. Health checks ────────────────────────────────────────────────────────
header "5/5  Health checks"
sleep 8

check() {
    local name="$1" url="$2"
    if curl -fs --max-time 5 "${url}" >/dev/null 2>&1; then
        info "✅  ${name}"
    else
        warn "⚠️   ${name} — not yet healthy (may still be starting)"
    fi
}

check "OpenSandbox  (10.0.0.2:4400)" "http://10.0.0.2:4400/health"
check "Plug Engine  (10.0.0.2:4200)" "http://10.0.0.2:4200/health"
check "Monitoring   (10.0.0.2:4300)" "http://10.0.0.2:4300/health"
check "nginx        (localhost:80)"   "http://127.0.0.1:80/health"

printf "\n${G}━━━ VPS2 Deploy Complete ━━━${N}\n"
printf "  OpenSandbox API : http://10.0.0.2:4400\n"
printf "  Plug Engine API : http://10.0.0.2:4200\n"
printf "  Public domain   : https://plugmein.cloud\n\n"
