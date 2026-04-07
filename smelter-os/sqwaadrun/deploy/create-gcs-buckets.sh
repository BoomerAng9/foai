#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  Create the 4 GCS buckets for Sqwaadrun storage wiring
# ═══════════════════════════════════════════════════════════════════
#
# Idempotent. Safe to re-run — existing buckets are skipped.
# Requires: gcloud authenticated against the foai-aims project.
#
# Buckets:
#   foai-sqwaadrun-artifacts  — private, 90-day lifecycle
#   foai-ingots               — public (CDN delivery)
#   foai-media                — public (CDN delivery)
#   foai-backups              — private
#
# Usage:
#   chmod +x deploy/create-gcs-buckets.sh
#   ./deploy/create-gcs-buckets.sh

set -euo pipefail

PROJECT="${PROJECT:-foai-aims}"
LOCATION="${LOCATION:-us-central1}"

echo "═══ Sqwaadrun GCS buckets ═══"
echo "  project:  $PROJECT"
echo "  location: $LOCATION"
echo

create_bucket() {
  local bucket="$1"
  if gcloud storage buckets describe "gs://${bucket}" --project="$PROJECT" &>/dev/null; then
    echo "  [skip] gs://${bucket} already exists"
    return 0
  fi
  gcloud storage buckets create "gs://${bucket}" \
    --project="$PROJECT" \
    --location="$LOCATION" \
    --uniform-bucket-level-access
  echo "  [ok]   gs://${bucket} created"
}

echo "[1/4] foai-sqwaadrun-artifacts (private)"
create_bucket "foai-sqwaadrun-artifacts"

echo "[2/4] foai-ingots (public CDN)"
create_bucket "foai-ingots"

echo "[3/4] foai-media (public CDN)"
create_bucket "foai-media"

echo "[4/4] foai-backups (private)"
create_bucket "foai-backups"

echo
echo "═══ Lifecycle policy — 90-day auto-delete on raw artifacts ═══"
LIFECYCLE_FILE=$(mktemp)
cat > "$LIFECYCLE_FILE" <<'EOF'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 90}
    }
  ]
}
EOF
gcloud storage buckets update gs://foai-sqwaadrun-artifacts \
  --lifecycle-file="$LIFECYCLE_FILE" \
  --project="$PROJECT"
rm -f "$LIFECYCLE_FILE"
echo "  [ok]   foai-sqwaadrun-artifacts → 90-day delete lifecycle"

echo
echo "═══ Public read on CDN-fronted buckets ═══"
for bucket in foai-ingots foai-media; do
  gcloud storage buckets add-iam-policy-binding "gs://${bucket}" \
    --member=allUsers \
    --role=roles/storage.objectViewer \
    --project="$PROJECT" >/dev/null
  echo "  [ok]   gs://${bucket} → allUsers objectViewer"
done

echo
echo "═══ Buckets complete ═══"
echo
echo "Next: set GCS bucket env vars in the Sqwaadrun gateway env file"
echo "  GCS_ARTIFACTS_BUCKET=foai-sqwaadrun-artifacts"
echo "  GCS_INGOTS_BUCKET=foai-ingots"
echo "  GCS_MEDIA_BUCKET=foai-media"
echo "  GCS_BACKUPS_BUCKET=foai-backups"
