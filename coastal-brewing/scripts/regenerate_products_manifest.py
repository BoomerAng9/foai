"""Scan web/public/products/ and rewrite scripts/products_manifest.json.

Source-of-truth for which per-SKU product images are actually shipped.
catalog._load_manifest() reads this JSON at module load. Keeping it in sync
prevents catalog substitution from swapping real images to the fallback.

Idempotent. Safe to run any time. Stdlib only.
"""
from __future__ import annotations

import datetime as _dt
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PRODUCTS_DIR = REPO_ROOT / "web" / "public" / "products"
MANIFEST_PATH = REPO_ROOT / "scripts" / "products_manifest.json"


def regenerate() -> dict:
    if not PRODUCTS_DIR.is_dir():
        raise SystemExit(f"products dir not found: {PRODUCTS_DIR}")
    images = sorted(
        f.name for f in PRODUCTS_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")
    )
    payload = {
        "generated_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "products_dir": str(PRODUCTS_DIR.relative_to(REPO_ROOT)).replace("\\", "/"),
        "count": len(images),
        "images": images,
    }
    MANIFEST_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return payload


if __name__ == "__main__":
    p = regenerate()
    print(f"wrote {MANIFEST_PATH} — {p['count']} images")
