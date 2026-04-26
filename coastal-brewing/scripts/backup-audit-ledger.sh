#!/usr/bin/env bash
# =============================================================================
# Coastal Brewing — audit_ledger SQLite backup
# =============================================================================
# Code_Ang Ship Checklist Item 39 (Database backups).
#
# Snapshots /app/audit_ledger/coastal_brewing.db inside the coastal-runner
# container to a versioned, gzipped, timestamped file in the host's
# /docker/coastal-brewing/backups/ directory. Designed for cron — see
# `coastal-brewing/scripts/install-backup-cron.sh` for one-shot install.
#
# Usage (manual):
#   ./scripts/backup-audit-ledger.sh
#
# Usage (cron, daily 02:00 UTC + offsite copy):
#   crontab -e
#   0 2 * * * /docker/coastal-brewing/scripts/backup-audit-ledger.sh
# =============================================================================
set -euo pipefail

BACKUP_DIR="/docker/coastal-brewing/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
SNAPSHOT="${BACKUP_DIR}/coastal_brewing.${TS}.db"
ARCHIVE="${SNAPSHOT}.gz"

mkdir -p "${BACKUP_DIR}"

# SQLite online backup — safe under concurrent writes (uses .backup VACUUM).
# Exec into the runner so we use its sqlite3 binary against the live DB path.
docker exec coastal-runner sqlite3 /app/audit_ledger/coastal_brewing.db \
  ".backup '/tmp/audit-snapshot-${TS}.db'"

docker cp "coastal-runner:/tmp/audit-snapshot-${TS}.db" "${SNAPSHOT}"
docker exec coastal-runner rm -f "/tmp/audit-snapshot-${TS}.db"

# Compress in-place
gzip -9 "${SNAPSHOT}"

# Integrity check on the archive — a corrupt backup is worse than none
gzip -t "${ARCHIVE}"

# Retention sweep — delete snapshots older than N days
find "${BACKUP_DIR}" -name 'coastal_brewing.*.db.gz' -mtime "+${RETENTION_DAYS}" -delete

SIZE="$(stat -c '%s' "${ARCHIVE}")"
echo "{\"ts\":\"${TS}\",\"path\":\"${ARCHIVE}\",\"size_bytes\":${SIZE},\"retention_days\":${RETENTION_DAYS}}"

# Optional: offsite sync. Uncomment and configure when remote target is ready.
#   rsync -az "${BACKUP_DIR}/" backup-offsite:/coastal-brewing/
#   aws s3 cp "${ARCHIVE}" s3://coastal-backups/audit-ledger/
