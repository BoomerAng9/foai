#!/usr/bin/env python3
"""One-shot patch: add WebSocket location block to brewing.foai.cloud nginx config.

Run on aims-vps with sudo. Idempotent: refuses to add the block twice.
Backs up the original to /etc/nginx/sites-available/brewing.foai.cloud.bak.<ts>
"""
from __future__ import annotations
import shutil
import sys
import time
from pathlib import Path

NGINX_PATH = Path("/etc/nginx/sites-available/brewing.foai.cloud")

WS_BLOCK = """\
    # ---- WebSocket route to coastal-runner (CoT streaming, ACHEEVY chat) ----
    location = /api/v1/chat/stream {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600;
        proxy_cache_bypass $http_upgrade;
    }

"""

NEEDLE = "    # ---- Next.js (coastal-web) on :3010 — default ----"


def main() -> int:
    if not NGINX_PATH.exists():
        print(f"FATAL: {NGINX_PATH} does not exist", file=sys.stderr)
        return 1

    content = NGINX_PATH.read_text()

    if "/api/v1/chat/stream" in content:
        print("ALREADY PATCHED: WS block already present, refusing to add twice")
        return 0

    if NEEDLE not in content:
        print(f"FATAL: insertion needle not found:\n  {NEEDLE!r}", file=sys.stderr)
        return 2

    # Backup
    backup_path = NGINX_PATH.with_suffix(NGINX_PATH.suffix + f".bak.{int(time.time())}")
    shutil.copy(NGINX_PATH, backup_path)
    print(f"BACKUP: {backup_path}")

    # Patch — insert WS_BLOCK BEFORE the Next.js needle so it's grouped with
    # the runner-targeted location blocks above
    new_content = content.replace(NEEDLE, WS_BLOCK + NEEDLE, 1)
    NGINX_PATH.write_text(new_content)
    print(f"PATCHED: {NGINX_PATH}")
    print(f"  added {len(WS_BLOCK.splitlines())} lines for /api/v1/chat/stream WS route")
    return 0


if __name__ == "__main__":
    sys.exit(main())
