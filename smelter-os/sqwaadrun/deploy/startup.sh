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
{
  echo "SQWAADRUN_API_KEY=$(gcloud secrets versions access latest --secret=SQWAADRUN_API_KEY --project=$PROJECT)"
  echo "NEON_INGEST_DSN=$(gcloud secrets versions access latest --secret=NEON_INGEST_DSN --project=$PROJECT)"
  echo "SQWAADRUN_QUOTA_PER_DOMAIN=2000"
  echo "SQWAADRUN_SIGNOFF_THRESHOLD=200"
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
