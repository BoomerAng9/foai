#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
ENV_FILE="$ROOT_DIR/docker/.stack.env"
ENV_EXAMPLE="$ROOT_DIR/docker/.stack.env.example"
PUBLISH_SCRIPT="$ROOT_DIR/scripts/publish_stack.sh"

PHASE=""
BUILD_FLAG=""
WITH_TUNNEL_FLAG=""
DEPLOY="true"

usage() {
  cat <<USAGE
Usage: scripts/policy_rollout.sh --phase <shadow|enforced|hardened|rollback> [--build] [--with-tunnel] [--no-deploy]

Examples:
  scripts/policy_rollout.sh --phase shadow --build
  scripts/policy_rollout.sh --phase enforced --build
  scripts/policy_rollout.sh --phase hardened
  scripts/policy_rollout.sh --phase rollback --build
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --phase)
      PHASE=${2:-}
      shift 2
      ;;
    --build)
      BUILD_FLAG="--build"
      shift
      ;;
    --with-tunnel)
      WITH_TUNNEL_FLAG="--with-tunnel"
      shift
      ;;
    --no-deploy)
      DEPLOY="false"
      shift
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

if [[ -z "$PHASE" ]]; then
  echo "Missing required argument: --phase" >&2
  usage
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "Created $ENV_FILE from template. Fill required credentials, then rerun." >&2
  exit 1
fi

set_env_value() {
  local key=$1
  local value=$2
  python3 - "$ENV_FILE" "$key" "$value" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]

lines = []
found = False
for raw_line in path.read_text().splitlines():
    if not raw_line.strip() or raw_line.strip().startswith('#'):
        lines.append(raw_line)
        continue
    name, sep, current = raw_line.partition('=')
    if name == key:
        lines.append(f"{key}={value}")
        found = True
    else:
        lines.append(raw_line)

if not found:
    lines.append(f"{key}={value}")

path.write_text("\n".join(lines).rstrip() + "\n")
PY
}

apply_phase() {
  case "$PHASE" in
    shadow)
      set_env_value POLICY_LAYERS_ENABLED true
      set_env_value POLICY_LAYERS_SHADOW_MODE true
      set_env_value POLICY_LAYERS_EMIT_DEBUG_EVENTS true
      set_env_value VITE_POLICY_DEBUG_EVENTS true
      ;;
    enforced)
      set_env_value POLICY_LAYERS_ENABLED true
      set_env_value POLICY_LAYERS_SHADOW_MODE false
      set_env_value POLICY_LAYERS_EMIT_DEBUG_EVENTS true
      set_env_value VITE_POLICY_DEBUG_EVENTS false
      ;;
    hardened)
      set_env_value POLICY_LAYERS_ENABLED true
      set_env_value POLICY_LAYERS_SHADOW_MODE false
      set_env_value POLICY_LAYERS_EMIT_DEBUG_EVENTS false
      set_env_value VITE_POLICY_DEBUG_EVENTS false
      ;;
    rollback)
      set_env_value POLICY_LAYERS_ENABLED false
      set_env_value POLICY_LAYERS_SHADOW_MODE false
      set_env_value POLICY_LAYERS_EMIT_DEBUG_EVENTS false
      set_env_value VITE_POLICY_DEBUG_EVENTS false
      ;;
    *)
      echo "Invalid phase: $PHASE" >&2
      usage
      exit 1
      ;;
  esac
}

apply_phase

echo "Applied policy phase '$PHASE' in docker/.stack.env"

if [[ "$DEPLOY" == "false" ]]; then
  echo "Skipping deploy (--no-deploy)."
  exit 0
fi

"$PUBLISH_SCRIPT" $BUILD_FLAG $WITH_TUNNEL_FLAG
