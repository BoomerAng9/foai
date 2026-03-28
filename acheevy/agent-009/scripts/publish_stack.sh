#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.stack.yaml"
ENV_FILE="$ROOT_DIR/docker/.stack.env"
ENV_EXAMPLE="$ROOT_DIR/docker/.stack.env.example"
PROJECT_NAME=${COMPOSE_PROJECT_NAME:-ii-agent-stack}
BUILD_FLAG=""
ENABLE_TUNNEL="false"

usage() {
  cat <<USAGE
Usage: scripts/publish_stack.sh [--build] [--with-tunnel]
  --build         Rebuild Docker images before startup
  --with-tunnel   Start ngrok tunnel profile (optional)
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --build)
      BUILD_FLAG="--build"
      shift
      ;;
    --with-tunnel)
      ENABLE_TUNNEL="true"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "Created $ENV_FILE from template. Fill required credentials, then re-run." >&2
  exit 1
fi

compose() {
  docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

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

is_placeholder() {
  local value=$1
  [[ -z "$value" || "$value" == replace-with-* || "$value" == /absolute/path/* ]]
}

require_cmd() {
  local cmd=$1
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

wait_http_ok() {
  local name=$1
  local url=$2
  local retries=${3:-60}

  for ((i=1; i<=retries; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "✓ $name healthy at $url"
      return 0
    fi
    sleep 2
  done

  echo "✗ $name did not become healthy at $url" >&2
  return 1
}

require_cmd docker
require_cmd curl

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not available. Start Docker Engine service and retry." >&2
  exit 1
fi

OPENROUTER_API_KEY=$(get_env_value OPENROUTER_API_KEY)
DATABASE_URL=$(get_env_value DATABASE_URL)
SANDBOX_DATABASE_URL=$(get_env_value SANDBOX_DATABASE_URL)
PUBLIC_TOOL_SERVER_URL=$(get_env_value PUBLIC_TOOL_SERVER_URL)
GOOGLE_APPLICATION_CREDENTIALS=$(get_env_value GOOGLE_APPLICATION_CREDENTIALS)
AIMS_BRIDGE_ENABLED=$(get_env_value AIMS_BRIDGE_ENABLED false)
AIMS_GATEWAY_URL=$(get_env_value AIMS_GATEWAY_URL)
AIMS_BRIDGE_SHARED_SECRET=$(get_env_value AIMS_BRIDGE_SHARED_SECRET)

if is_placeholder "$OPENROUTER_API_KEY"; then
  echo "OPENROUTER_API_KEY is missing or placeholder in docker/.stack.env" >&2
  exit 1
fi

if [[ -z "$DATABASE_URL" || -z "$SANDBOX_DATABASE_URL" ]]; then
  echo "DATABASE_URL and SANDBOX_DATABASE_URL must be set in docker/.stack.env" >&2
  exit 1
fi

if [[ -z "$PUBLIC_TOOL_SERVER_URL" ]]; then
  echo "PUBLIC_TOOL_SERVER_URL is empty; defaulting to internal http://tool-server:1236"
fi

if is_placeholder "$GOOGLE_APPLICATION_CREDENTIALS"; then
  echo "GOOGLE_APPLICATION_CREDENTIALS is placeholder; advanced storage/media features may fail." >&2
fi

if [[ "$AIMS_BRIDGE_ENABLED" == "true" ]]; then
  if [[ -z "$AIMS_GATEWAY_URL" ]]; then
    echo "AIMS_BRIDGE_ENABLED=true but AIMS_GATEWAY_URL is empty." >&2
    exit 1
  fi
  if [[ -z "$AIMS_BRIDGE_SHARED_SECRET" ]]; then
    echo "AIMS_BRIDGE_ENABLED=true but AIMS_BRIDGE_SHARED_SECRET is empty." >&2
    exit 1
  fi
fi

echo "Starting production stack: $PROJECT_NAME"
compose up -d ${BUILD_FLAG:+$BUILD_FLAG} postgres redis tool-server sandbox-server backend frontend

if [[ "$ENABLE_TUNNEL" == "true" ]]; then
  echo "Starting tunnel profile..."
  compose --profile tunnel up -d ngrok
fi

BACKEND_PORT=$(get_env_value BACKEND_PORT 8000)
FRONTEND_PORT=$(get_env_value FRONTEND_PORT 1420)
SANDBOX_PORT=$(get_env_value SANDBOX_SERVER_PORT 8100)
TOOL_PORT=$(get_env_value TOOL_SERVER_PORT 1236)

wait_http_ok "backend" "http://localhost:${BACKEND_PORT}/health"
wait_http_ok "sandbox-server" "http://localhost:${SANDBOX_PORT}/health"
wait_http_ok "tool-server" "http://localhost:${TOOL_PORT}/health"

cat <<SUMMARY

Production stack is running.
  Frontend:       http://localhost:${FRONTEND_PORT}
  Backend:        http://localhost:${BACKEND_PORT}
  Sandbox:        http://localhost:${SANDBOX_PORT}
  Tool server:    http://localhost:${TOOL_PORT}

Useful commands:
  docker compose --project-name ${PROJECT_NAME} --env-file docker/.stack.env -f docker/docker-compose.stack.yaml ps
  docker compose --project-name ${PROJECT_NAME} --env-file docker/.stack.env -f docker/docker-compose.stack.yaml logs -f backend
  docker compose --project-name ${PROJECT_NAME} --env-file docker/.stack.env -f docker/docker-compose.stack.yaml down

SUMMARY
