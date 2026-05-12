"""
Lane view endpoints — Phase 2 wiring for /tools/lanes panel.

Provides read access to the cache files written by Sqwaadrun's lane_a_jobs /
lane_b_jobs runtime + the CTI Hub C-5 snapshot sidecar. Also computes the
drift-guard report on demand (Python IMPLEMENTED_STAGES vs JSON spec
pipeline[].stage).

Caches live on the Sqwaadrun host (typically aims-vps). When the gateway
shares a filesystem with the cache writer, this module reads directly. When
hosts differ, an HTTP-proxy mode against a future Sqwaadrun /lanes endpoint
becomes the fallback path — for now we return a graceful 'unavailable'
status so the hawk-ui still renders.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Cache paths — overridable via env so docker compose can wire shared volumes
SQWAADRUN_CACHE_DIR = Path(os.getenv(
    "SQWAADRUN_CACHE_DIR",
    str(Path.home() / ".cache" / "sqwaadrun"),
))
CTI_HUB_CACHE_DIR = Path(os.getenv(
    "CTI_HUB_CACHE_DIR",
    str(Path.home() / ".cache" / "cti-hub" / "mindedge-snapshot"),
))

# Spec JSON locations — iCloud workspace by default, env override for VPS
SPEC_DIR = Path(os.getenv(
    "FOAI_PROJECT_REGISTRY_DIR",
    str(Path.home() / "iCloudDrive" / "ACHIEVEMOR_" / "Projects_"
        / "The Deploy Platform_" / "Claude Code" / "FOAI Project" / "registry"),
))

# Sqwaadrun gateway URL for HTTP-proxy fallback (when filesystem differs)
SQWAADRUN_GATEWAY_URL = os.getenv("SQWAADRUN_GATEWAY_URL", "http://aims-vps:8000")
SQWAADRUN_SERVICE_TOKEN = os.getenv("SQWAADRUN_SERVICE_TOKEN", "")
HTTP_TIMEOUT = httpx.Timeout(connect=3.0, read=10.0, write=5.0, pool=5.0)

# Per-lane spec → runtime mapping
LANE_CONFIG: dict[str, dict[str, Any]] = {
    "lane-a": {
        "label": "ACHEEVY content monitor",
        "cache_subpath": "acheevy-monitor/latest.json",
        "spec_filename": "monitor-mission.json",
        "implemented_stages": ["poll", "diff", "extract", "emit"],
        "runtime_module": "sqwaadrun.lane_a_jobs",
        "has_baseline": False,
    },
    "lane-b": {
        "label": "Greg-framework opportunity scout (fallen-app-rankings)",
        "cache_subpath": "lane-b-fallen-apps/latest.json",
        "spec_filename": "lane-b-fallen-app-rankings-mission.json",
        "implemented_stages": ["poll", "diff", "extract", "emit"],
        "runtime_module": "sqwaadrun.lane_b_jobs",
        "has_baseline": True,
    },
    "lane-c5": {
        "label": "MindEdge daily owner-ops digest",
        "cache_subpath": None,  # different cache dir (CTI_HUB_CACHE_DIR)
        "spec_filename": None,  # C-5 has no Sqwaadrun mission spec; runs from CTI Hub admin endpoint
        "implemented_stages": [],
        "runtime_module": None,
        "has_baseline": False,
    },
}


async def get_lane_cache(lane_id: str) -> dict[str, Any]:
    """Return the latest cached payload for the lane.

    For Lane A/B: reads ~/.cache/sqwaadrun/<subpath>/latest.json
    For Lane C-5: reads ~/.cache/cti-hub/mindedge-snapshot/latest.json
    Falls back to HTTP proxy against Sqwaadrun gateway if direct read fails.
    """
    cfg = LANE_CONFIG.get(lane_id)
    if cfg is None:
        return {"ok": False, "error": f"unknown lane: {lane_id}"}

    if lane_id == "lane-c5":
        path = CTI_HUB_CACHE_DIR / "latest.json"
    else:
        path = SQWAADRUN_CACHE_DIR / cfg["cache_subpath"]

    direct = _try_read_json(path)
    if direct.get("ok"):
        return {
            "ok": True,
            "lane_id": lane_id,
            "label": cfg["label"],
            "source": "filesystem",
            "path": str(path),
            "payload": direct["payload"],
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    # Filesystem miss — try HTTP proxy if Sqwaadrun-backed
    if lane_id in ("lane-a", "lane-b"):
        proxy = await _try_sqwaadrun_proxy(lane_id)
        if proxy.get("ok"):
            return {
                "ok": True,
                "lane_id": lane_id,
                "label": cfg["label"],
                "source": "sqwaadrun_http",
                "payload": proxy["payload"],
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
        return {
            "ok": False,
            "lane_id": lane_id,
            "label": cfg["label"],
            "error": f"filesystem unreachable + sqwaadrun proxy failed",
            "filesystem_error": direct.get("error"),
            "proxy_error": proxy.get("error"),
        }

    # Lane C-5 has no proxy fallback today — sidecar writes directly to local cache
    return {
        "ok": False,
        "lane_id": lane_id,
        "label": cfg["label"],
        "error": f"snapshot file not found at {path}",
        "filesystem_error": direct.get("error"),
        "hint": "Run the lane-c5 sidecar (lane-c5-mindedge-snapshot.sh) or fire `lane_c5_snapshot_fire` via /run",
    }


def get_lane_drift(lane_id: str) -> dict[str, Any]:
    """Return drift-guard report for the lane.

    Reads the spec JSON from SPEC_DIR (or SPEC_DIR/missions/), compares the
    Python IMPLEMENTED_STAGES against the spec's pipeline[].stage names.
    Implemented stages should be a SUBSET of spec stages (the implemented
    side is intentionally smaller — score/synthesize run externally).
    """
    cfg = LANE_CONFIG.get(lane_id)
    if cfg is None:
        return {"ok": False, "error": f"unknown lane: {lane_id}"}

    if not cfg["spec_filename"]:
        return {
            "ok": True,
            "lane_id": lane_id,
            "label": cfg["label"],
            "status": "no_spec",
            "note": "Lane C-5 has no Sqwaadrun mission spec — runs against CTI Hub admin endpoint directly. No drift surface applies.",
        }

    spec_path = _find_spec(cfg["spec_filename"])
    if spec_path is None:
        return {
            "ok": True,
            "lane_id": lane_id,
            "label": cfg["label"],
            "status": "spec_not_found",
            "note": f"spec file '{cfg['spec_filename']}' not reachable; drift cannot be computed",
            "implemented_stages": cfg["implemented_stages"],
        }

    try:
        spec = json.loads(spec_path.read_text(encoding="utf-8"))
        spec_stages = [s.get("stage") for s in spec.get("pipeline", []) if s.get("stage")]
    except (OSError, json.JSONDecodeError) as exc:
        return {
            "ok": False,
            "lane_id": lane_id,
            "label": cfg["label"],
            "error": f"failed to parse spec: {exc}",
        }

    implemented = cfg["implemented_stages"]
    missing = [s for s in implemented if s not in spec_stages]
    extra_in_spec = [s for s in spec_stages if s not in implemented]
    status = "ok" if not missing else "drift"

    return {
        "ok": True,
        "lane_id": lane_id,
        "label": cfg["label"],
        "status": status,
        "spec_path": str(spec_path),
        "spec_stages": spec_stages,
        "implemented_stages": implemented,
        "missing_in_spec": missing,
        "extra_in_spec": extra_in_spec,
        "runtime_module": cfg["runtime_module"],
        "note": (
            "Implemented is a subset of spec — score/synthesize run externally."
            if not missing else
            f"DRIFT: Python claims to implement {missing} but spec has dropped them."
        ),
    }


def _find_spec(filename: str) -> Path | None:
    """Try SPEC_DIR/<filename> and SPEC_DIR/missions/<filename>."""
    for candidate in (SPEC_DIR / filename, SPEC_DIR / "missions" / filename):
        if candidate.exists():
            return candidate
    return None


def _try_read_json(path: Path) -> dict[str, Any]:
    """Read JSON file; return {ok, payload} or {ok=False, error}."""
    try:
        if not path.exists():
            return {"ok": False, "error": f"file not found: {path}"}
        body = path.read_text(encoding="utf-8")
        return {"ok": True, "payload": json.loads(body)}
    except (OSError, json.JSONDecodeError) as exc:
        return {"ok": False, "error": str(exc)}


async def _try_sqwaadrun_proxy(lane_id: str) -> dict[str, Any]:
    """Fallback: ask Sqwaadrun's gateway for the cache content over HTTP."""
    url = f"{SQWAADRUN_GATEWAY_URL.rstrip('/')}/lanes/{lane_id}/cache"
    headers = {"Accept": "application/json"}
    if SQWAADRUN_SERVICE_TOKEN:
        headers["Authorization"] = f"Bearer {SQWAADRUN_SERVICE_TOKEN}"
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        return {"ok": False, "error": f"sqwaadrun unreachable: {exc}"}
    if response.status_code != 200:
        return {"ok": False, "error": f"sqwaadrun HTTP {response.status_code}"}
    try:
        return {"ok": True, "payload": response.json()}
    except json.JSONDecodeError as exc:
        return {"ok": False, "error": f"sqwaadrun response not JSON: {exc}"}
