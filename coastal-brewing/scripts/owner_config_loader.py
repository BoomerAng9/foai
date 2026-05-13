"""Mtime-cached JSON config loader.

Shared by `cadence.py`, `profitability.py`, `api_server.py` (voice
registry), and `email_adapter.py` to read owner-managed config from
`/app/config/*.json` (host: `/docker/coastal-brewing/config/*.json`).

Contract:
- `load_json(path)` returns the parsed dict. Caches by path + mtime.
  Subsequent calls with unchanged mtime return the cached value
  without disk I/O.
- `atomic_write_json(path, data)` writes via tempfile + os.replace
  so concurrent readers never see a half-written file.
- Malformed JSON on disk falls back to the last-good cached value
  (defensive — the owner_console write path validates before writing,
  this guard is for resilience against external/manual edits).
"""
from __future__ import annotations

import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any

log = logging.getLogger("coastal.owner_config_loader")

# Path → (mtime_ns, value)
_CACHE: dict[str, tuple[int, Any]] = {}


def _read_disk(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_json(path: str | Path) -> Any:
    p = Path(path)
    key = str(p)
    try:
        mtime_ns = p.stat().st_mtime_ns
    except FileNotFoundError:
        log.warning("config file missing: %s", p)
        return _CACHE.get(key, (0, {}))[1]
    cached = _CACHE.get(key)
    if cached is not None and cached[0] == mtime_ns:
        return cached[1]
    try:
        value = _read_disk(p)
    except json.JSONDecodeError as exc:
        log.warning("malformed json at %s: %s — returning last-good", p, exc)
        return cached[1] if cached else {}
    _CACHE[key] = (mtime_ns, value)
    return value


def atomic_write_json(path: str | Path, data: Any) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(
        prefix=p.name + ".tmp.",
        dir=str(p.parent),
        suffix=".json",
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, sort_keys=True)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, p)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
