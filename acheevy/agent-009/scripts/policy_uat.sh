#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
ENV_FILE="$ROOT_DIR/docker/.stack.env"

TARGET_PHASE=""
BACKEND_URL=""
TOOL_URL=""
SANDBOX_URL=""

usage() {
  cat <<USAGE
Usage: scripts/policy_uat.sh --phase <shadow|enforced|hardened|rollback> [--backend-url URL] [--tool-url URL] [--sandbox-url URL]

Examples:
  scripts/policy_uat.sh --phase shadow
  scripts/policy_uat.sh --phase enforced --backend-url http://localhost:8000
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --phase)
      TARGET_PHASE=${2:-}
      shift 2
      ;;
    --backend-url)
      BACKEND_URL=${2:-}
      shift 2
      ;;
    --tool-url)
      TOOL_URL=${2:-}
      shift 2
      ;;
    --sandbox-url)
      SANDBOX_URL=${2:-}
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$TARGET_PHASE" ]]; then
  echo "Missing required argument: --phase" >&2
  usage
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

get_env_value() {
  local key=$1
  local default=${2:-}
  local value
  value=$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 | cut -d '=' -f 2- || true)
  if [[ -z "$value" ]]; then
    printf '%s' "$default"
  else
    printf '%s' "$value"
  fi
}

expect_flags() {
  case "$TARGET_PHASE" in
    shadow)
      echo "POLICY_LAYERS_ENABLED=true"
      echo "POLICY_LAYERS_SHADOW_MODE=true"
      echo "POLICY_LAYERS_EMIT_DEBUG_EVENTS=true"
      echo "VITE_POLICY_DEBUG_EVENTS=true"
      ;;
    enforced)
      echo "POLICY_LAYERS_ENABLED=true"
      echo "POLICY_LAYERS_SHADOW_MODE=false"
      echo "POLICY_LAYERS_EMIT_DEBUG_EVENTS=true"
      echo "VITE_POLICY_DEBUG_EVENTS=false"
      ;;
    hardened)
      echo "POLICY_LAYERS_ENABLED=true"
      echo "POLICY_LAYERS_SHADOW_MODE=false"
      echo "POLICY_LAYERS_EMIT_DEBUG_EVENTS=false"
      echo "VITE_POLICY_DEBUG_EVENTS=false"
      ;;
    rollback)
      echo "POLICY_LAYERS_ENABLED=false"
      echo "POLICY_LAYERS_SHADOW_MODE=false"
      echo "POLICY_LAYERS_EMIT_DEBUG_EVENTS=false"
      echo "VITE_POLICY_DEBUG_EVENTS=false"
      ;;
    *)
      echo "Invalid phase: $TARGET_PHASE" >&2
      exit 1
      ;;
  esac
}

check_flag() {
  local pair=$1
  local key=${pair%%=*}
  local expected=${pair#*=}
  local actual
  actual=$(get_env_value "$key")
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS env $key=$actual"
  else
    echo "FAIL env $key expected '$expected' got '$actual'"
    return 1
  fi
}

check_http() {
  local name=$1
  local url=$2
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)
  if [[ "$code" == "200" ]]; then
    echo "PASS health $name $url"
  else
    echo "FAIL health $name $url code=$code"
    return 1
  fi
}

backend_port=$(get_env_value BACKEND_PORT 8000)
tool_port=$(get_env_value TOOL_SERVER_PORT 1236)
sandbox_port=$(get_env_value SANDBOX_SERVER_PORT 8100)

BACKEND_URL=${BACKEND_URL:-"http://localhost:${backend_port}"}
TOOL_URL=${TOOL_URL:-"http://localhost:${tool_port}"}
SANDBOX_URL=${SANDBOX_URL:-"http://localhost:${sandbox_port}"}

echo "Running policy UAT for phase '$TARGET_PHASE'"
echo ""

FAILED=0
while IFS= read -r pair; do
  if ! check_flag "$pair"; then
    FAILED=1
  fi
done < <(expect_flags)

echo ""
if ! check_http backend "$BACKEND_URL/health"; then
  FAILED=1
fi
if ! check_http tool-server "$TOOL_URL/health"; then
  FAILED=1
fi
if ! check_http sandbox-server "$SANDBOX_URL/health"; then
  FAILED=1
fi

cat <<MATRIX

Manual chat UAT matrix (record PASS/FAIL):
1) Coding prompt          : "Build a Python FastAPI endpoint with validation and tests."
2) Research prompt        : "Summarize tradeoffs between Redis streams and Kafka for event fanout."
3) Deploy prompt          : "Write a safe zero-downtime deployment plan for Docker Compose services."
4) Debug prompt           : "Diagnose intermittent 502 from reverse proxy to backend with actionable checks."
5) Product/design prompt  : "Design an MVP onboarding flow with 3 screens and success metrics."
6) Security prompt        : "Harden API auth flow and list top 5 abuse vectors with mitigations."
7) Data prompt            : "Propose a schema + index strategy for chat history at scale."
8) Incident prompt        : "Create a 30-minute incident response runbook for service outage."
9) Agent policy prompt    : "Explain which policy layers are likely active and why."
10) Regression prompt     : "Repeat prompt #1 and compare quality/latency to previous phase baseline."

Acceptance gates:
- Shadow: diagnostics visible, output quality unchanged.
- Enforced: no quality regressions, no health regressions.
- Hardened: stable outputs with debug events disabled.

MATRIX

if [[ "$FAILED" -ne 0 ]]; then
  echo "UAT prechecks failed. Resolve failures before phase sign-off." >&2
  exit 1
fi

echo "UAT prechecks passed. Continue with manual prompt matrix for final sign-off."
