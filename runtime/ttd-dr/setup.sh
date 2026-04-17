#!/usr/bin/env bash
# Local dev setup for runtime/ttd-dr.
# Matches the runtime/spinner conventions.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

if [[ ! -d .venv ]]; then
  python -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate

pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "Ready. Export TTD_DR_DATABASE_URL and TTD_DR_HMAC_SECRET, then:"
echo "  uvicorn main:app --host 0.0.0.0 --port 8010 --reload"
