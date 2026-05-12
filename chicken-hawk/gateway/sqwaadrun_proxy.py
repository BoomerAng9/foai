"""
Sqwaadrun proxy — list the 20-Hawk ops fleet roster for /tools/lil-hawks UI.

The chicken-hawk gateway already exposes GET /hawks which returns the 11
customer-facing helpers from config.lil_hawks. The Sqwaadrun ops fleet (20
data/automation Lil_Hawks) lives on the Sqwaadrun gateway. This module
proxies that fleet roster so the hawk-ui can render both under one panel
with a tab toggle.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

SQWAADRUN_GATEWAY_URL = os.getenv("SQWAADRUN_GATEWAY_URL", "http://aims-vps:8000")
SQWAADRUN_SERVICE_TOKEN = os.getenv("SQWAADRUN_SERVICE_TOKEN", "")
HTTP_TIMEOUT = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)


async def list_sqwaadrun_hawks() -> dict[str, Any]:
    """Fetch the 20-Hawk ops-fleet roster from the Sqwaadrun gateway.

    Returns:
        {"hawks": [{"name": str, "specialty": str, "status": str,
                    "missions_run": int, "last_active": str|None}, ...],
         "total": int,
         "source_status": "ok"|"unavailable",
         "note": str?}

    Gracefully degrades when Sqwaadrun is unreachable — hawk-ui shows an
    empty-state with the note, doesn't crash.
    """
    url = f"{SQWAADRUN_GATEWAY_URL.rstrip('/')}/hawks"
    headers = {"Accept": "application/json"}
    if SQWAADRUN_SERVICE_TOKEN:
        headers["Authorization"] = f"Bearer {SQWAADRUN_SERVICE_TOKEN}"
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.get(url, headers=headers)
        if response.status_code != 200:
            return {
                "hawks": [],
                "total": 0,
                "source_status": "unavailable",
                "note": f"sqwaadrun returned HTTP {response.status_code}",
            }
        data = response.json()
    except httpx.HTTPError as exc:
        logger.debug("sqwaadrun_hawks_unreachable", error=str(exc))
        return {
            "hawks": [],
            "total": 0,
            "source_status": "unavailable",
            "note": f"sqwaadrun unreachable: {exc}",
        }

    raw = data.get("hawks", []) or []
    hawks: list[dict[str, Any]] = []
    for entry in raw:
        if isinstance(entry, str):
            hawks.append({"name": entry, "specialty": "", "status": "configured",
                          "missions_run": 0, "last_active": None})
        elif isinstance(entry, dict):
            hawks.append({
                "name": entry.get("name") or entry.get("class") or "unknown",
                "specialty": entry.get("specialty") or entry.get("description", ""),
                "status": entry.get("status", "configured"),
                "missions_run": entry.get("missions_run") or entry.get("mission_count", 0),
                "last_active": entry.get("last_active"),
            })

    return {
        "hawks": hawks,
        "total": len(hawks),
        "source_status": "ok",
    }


# ─── Phase 5 expansion: active / recent missions + cache stats ─────────


async def get_active_missions() -> dict[str, Any]:
    """Currently-running Sqwaadrun missions."""
    return await _proxy_get("/missions/active", missing_key="missions")


async def get_recent_missions(n: int = 20) -> dict[str, Any]:
    """Last N completed Sqwaadrun missions."""
    n = max(1, min(int(n or 20), 200))
    return await _proxy_get(f"/missions/recent?n={n}", missing_key="missions")


async def get_cache_stats() -> dict[str, Any]:
    """scrape_cache.db row count + per-domain breakdown + dedup-rate."""
    return await _proxy_get("/cache/stats", missing_key="stats")


async def _proxy_get(path: str, *, missing_key: str) -> dict[str, Any]:
    """Generic Sqwaadrun GET proxy with graceful degrade."""
    url = f"{SQWAADRUN_GATEWAY_URL.rstrip('/')}{path}"
    headers = {"Accept": "application/json"}
    if SQWAADRUN_SERVICE_TOKEN:
        headers["Authorization"] = f"Bearer {SQWAADRUN_SERVICE_TOKEN}"
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        logger.debug("sqwaadrun_proxy_unreachable", path=path, error=str(exc))
        return {
            "source_status": "unavailable",
            missing_key: [],
            "note": f"sqwaadrun unreachable: {exc}",
        }
    if response.status_code != 200:
        return {
            "source_status": "unavailable",
            missing_key: [],
            "note": f"sqwaadrun returned HTTP {response.status_code}",
        }
    try:
        data = response.json()
    except ValueError as exc:
        return {
            "source_status": "unavailable",
            missing_key: [],
            "note": f"sqwaadrun response not JSON: {exc}",
        }
    if not isinstance(data, dict):
        return {"source_status": "ok", missing_key: data}
    return {"source_status": "ok", **data}
