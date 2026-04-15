#!/bin/bash
# Per|Form freshness cron — hit the regen pipelines daily.
# Install on myclaw-vps:
#   crontab -e
#   0 6 * * * /root/foai/perform/ops/freshness-daily.sh >> /var/log/perform-freshness.log 2>&1
#
# Requires env vars (export before the cron line OR set in /etc/environment):
#   PIPELINE_AUTH_KEY — matches the perform container's auth key
#   PERFORM_URL       — default https://perform.foai.cloud

set -e
URL="${PERFORM_URL:-https://perform.foai.cloud}"
KEY="${PIPELINE_AUTH_KEY:-}"

if [ -z "$KEY" ]; then
  echo "[freshness] PIPELINE_AUTH_KEY not set — aborting"
  exit 1
fi

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

echo "[$(ts)] freshness run starting"

# 1. Regenerate one fresh podcast episode per analyst
echo "[$(ts)] podcast/auto..."
curl -sS -X POST "$URL/api/podcast/auto" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  --max-time 600 \
  | head -c 800
echo
echo "[$(ts)] podcast/auto done"

# 2. Poke freshness endpoint so it warms cache
echo "[$(ts)] freshness check..."
curl -sS "$URL/api/platform/freshness" --max-time 30 | head -c 500
echo

echo "[$(ts)] freshness run complete"
