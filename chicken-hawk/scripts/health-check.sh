#!/usr/bin/env bash
# =============================================================================
# Chicken Hawk — Fleet Health Checker
# Checks all Lil_Hawk endpoints and the Gateway.
# Usage: bash scripts/health-check.sh
# =============================================================================
set -euo pipefail

# Load .env if present
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

GATEWAY_URL="${GATEWAY_URL:-http://localhost:${GATEWAY_PORT:-8000}}"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
OK="\033[0;32m✓\033[0m"
FAIL="\033[0;31m✗\033[0m"
WARN="\033[0;33m?\033[0m"

check() {
  local name="$1"
  local url="$2"
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${url}" 2>/dev/null || echo "000")
  if [[ "${http_code}" == "200" ]]; then
    echo -e "  ${OK}  ${name} (${url})"
  elif [[ "${http_code}" == "000" ]]; then
    echo -e "  ${FAIL}  ${name} — unreachable (${url})"
  else
    echo -e "  ${WARN}  ${name} — HTTP ${http_code} (${url})"
  fi
}

# ---------------------------------------------------------------------------
# Gateway
# ---------------------------------------------------------------------------
echo ""
echo "🦅  Chicken Hawk Health Check"
echo "────────────────────────────────────────"
echo "Gateway:"
check "Gateway API"    "${GATEWAY_URL}/health"
check "SimStudio UI"   "http://localhost:${SIMSTUDIO_PORT:-3001}"

# ---------------------------------------------------------------------------
# Lil_Hawk Fleet
# ---------------------------------------------------------------------------
echo ""
echo "Lil_Hawk Fleet:"
check "Lil_TRAE_Hawk"   "${TRAE_HAWK_URL:-http://localhost:7001}/health"
check "Lil_Coding_Hawk" "${CODING_HAWK_URL:-http://localhost:7002}/health"
check "Lil_Agent_Hawk"  "${AGENT_HAWK_URL:-http://localhost:7003}/health"
check "Lil_Flow_Hawk"   "${FLOW_HAWK_URL:-http://localhost:5678}/healthz"
check "Lil_Sand_Hawk"   "${SAND_HAWK_URL:-http://localhost:7005}/health"
check "Lil_Memory_Hawk" "${MEMORY_HAWK_URL:-http://localhost:7006}/health"
check "Lil_Graph_Hawk"  "${GRAPH_HAWK_URL:-http://localhost:7007}/health"
check "Lil_Back_Hawk"   "${BACK_HAWK_URL:-http://localhost:7008}/health"
check "Lil_Viz_Hawk"    "${VIZ_HAWK_URL:-http://localhost:7009}/health"
check "Lil_Deep_Hawk"   "${DEEP_HAWK_URL:-http://localhost:7010}/health"

echo ""
echo "────────────────────────────────────────"
echo "Done."
