#!/usr/bin/env bash
# =============================================================================
# Chicken Hawk — One-shot bootstrap script
# Run on a fresh VPS to install Docker, Tailscale, and start the fleet.
# Usage: bash scripts/setup.sh [gateway|fleet]
# =============================================================================
set -euo pipefail

ROLE="${1:-fleet}"   # gateway | fleet

echo "🦅  Chicken Hawk bootstrap — role: ${ROLE}"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
require() {
  command -v "$1" &>/dev/null || { echo "ERROR: '$1' is required but not found." >&2; exit 1; }
}

# ---------------------------------------------------------------------------
# Docker
# ---------------------------------------------------------------------------
if ! command -v docker &>/dev/null; then
  echo "→ Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "${USER}" || true
  echo "  Docker installed. You may need to log out and back in."
fi

if ! command -v docker &>/dev/null; then
  echo "ERROR: Docker installation failed." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Tailscale
# ---------------------------------------------------------------------------
if ! command -v tailscale &>/dev/null; then
  echo "→ Installing Tailscale..."
  curl -fsSL https://tailscale.com/install.sh | sh
fi

if [[ -n "${TAILSCALE_AUTH_KEY:-}" ]]; then
  echo "→ Bringing Tailscale up..."
  sudo tailscale up --authkey="${TAILSCALE_AUTH_KEY}" --advertise-tags="tag:${ROLE}" || true
else
  echo "  Skipping Tailscale auth (TAILSCALE_AUTH_KEY not set)."
fi

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "→ Created .env from .env.example — please edit it before continuing."
    exit 0
  else
    echo "ERROR: .env file not found and .env.example missing." >&2
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# Start services
# ---------------------------------------------------------------------------
if [[ "${ROLE}" == "gateway" ]]; then
  echo "→ Starting Chicken Hawk Gateway (VPS-1)..."
  docker compose -f docker-compose.gateway.yml pull --quiet
  docker compose -f docker-compose.gateway.yml up -d
else
  echo "→ Starting Lil_Hawk Fleet (VPS-2)..."
  docker compose pull --quiet
  docker compose up -d
fi

echo ""
echo "✅  Chicken Hawk ${ROLE} is running."
echo "   Run ./scripts/health-check.sh to verify all services."
