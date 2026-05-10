#!/usr/bin/env bash
# =============================================================================
# Install the audit_ledger backup as a daily cron job (root crontab).
# Code_Ang Ship Checklist Item 39 (Database backups).
# Idempotent — safe to re-run.
# =============================================================================
set -euo pipefail

CRON_LINE="0 2 * * * /docker/coastal-brewing/scripts/backup-audit-ledger.sh >> /var/log/coastal-backup.log 2>&1"
TMP="$(mktemp)"

crontab -l 2>/dev/null > "${TMP}" || true

if grep -qF 'backup-audit-ledger.sh' "${TMP}"; then
  echo "cron already installed; nothing to do"
  rm -f "${TMP}"
  exit 0
fi

echo "${CRON_LINE}" >> "${TMP}"
crontab "${TMP}"
rm -f "${TMP}"

echo "installed: ${CRON_LINE}"
crontab -l | grep audit-ledger
