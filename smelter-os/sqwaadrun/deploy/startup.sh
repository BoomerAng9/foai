#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  GCE COS startup script — Sqwaadrun gateway
# ═══════════════════════════════════════════════════════════════════
#  Runs on first boot and on every restart. Pulls secrets from Secret
#  Manager into /etc/sqwaadrun/env, then launches the container.
#
#  Container OS (cos-stable) image used — Docker is preinstalled.
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

PROJECT=$(curl -fsS -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/project/project-id)
REGION="us-east4"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/sqwaadrun/gateway:latest"

# Persistence dir
mkdir -p /var/lib/sqwaadrun

# ─── Pull secrets ────────────────────────────────────────────────────
mkdir -p /etc/sqwaadrun

# Helper — pull secret if it exists, otherwise empty string
pull_secret() {
  local name="$1"
  gcloud secrets versions access latest --secret="$name" --project="$PROJECT" 2>/dev/null || echo ""
}

{
  # Gateway auth
  echo "SQWAADRUN_API_KEY=$(pull_secret SQWAADRUN_API_KEY)"

  # Neon (structured data)
  echo "NEON_INGEST_DSN=$(pull_secret NEON_INGEST_DSN)"
  echo "NEON_DATABASE_URL=$(pull_secret NEON_DATABASE_URL)"

  # Puter (Smelter OS native storage)
  echo "PUTER_BASE_URL=${PUTER_BASE_URL:-http://smelter-puter:4100}"
  echo "PUTER_API_KEY=$(pull_secret PUTER_API_KEY)"

  # GCS (scalable infrastructure)
  echo "GCP_PROJECT_ID=${PROJECT}"
  echo "GCS_ARTIFACTS_BUCKET=foai-sqwaadrun-artifacts"
  echo "GCS_INGOTS_BUCKET=foai-ingots"
  echo "GCS_MEDIA_BUCKET=foai-media"
  echo "GCS_BACKUPS_BUCKET=foai-backups"

  # Quotas + cadences
  echo "SQWAADRUN_QUOTA_PER_DOMAIN=2000"
  echo "SQWAADRUN_SIGNOFF_THRESHOLD=200"
  echo "SQWAADRUN_HEARTBEAT_INTERVAL_SECONDS=90"

  # Runtime
  echo "SQWAADRUN_DATA_DIR=/var/lib/sqwaadrun"
  echo "PYTHONUNBUFFERED=1"
  echo "PYTHONIOENCODING=utf-8"
  echo "PYTHONUTF8=1"
} > /etc/sqwaadrun/env
chmod 600 /etc/sqwaadrun/env

# ─── Auth docker to Artifact Registry ────────────────────────────────
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ─── Pull and run ────────────────────────────────────────────────────
docker stop sqwaadrun-gateway 2>/dev/null || true
docker rm sqwaadrun-gateway 2>/dev/null || true
docker pull "$IMAGE"

docker run -d \
  --name sqwaadrun-gateway \
  --restart always \
  --network host \
  -v /var/lib/sqwaadrun:/var/lib/sqwaadrun \
  --env-file /etc/sqwaadrun/env \
  "$IMAGE"

# ─── Log and exit ────────────────────────────────────────────────────
echo "Sqwaadrun gateway launched at $(date)"
docker ps --filter name=sqwaadrun-gateway
