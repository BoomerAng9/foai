"""
Lane action handlers — Phase 1 wiring for /run dispatcher.

Bridges the chicken-hawk gateway to the three concurrent lanes built in the
2026-05-11 unified-runtime session:

    Lane A — ACHEEVY content monitor (Sqwaadrun mission `acheevy-content-monitor-4h`)
    Lane B — Greg-framework opportunity scout (Sqwaadrun mission `lane_b_fallen_app_rankings`)
    Lane C-5 — MindEdge daily owner-ops digest (CTI Hub admin endpoint fanout)

Each handler returns a result dict that the /run dispatcher attaches to the
audit-chain receipt. NemoClaw policy gate has already fired before these run.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Defaults pull from env so docker compose can override without code edits.
SQWAADRUN_GATEWAY_URL = os.getenv("SQWAADRUN_GATEWAY_URL", "http://aims-vps:8000")
SQWAADRUN_SERVICE_TOKEN = os.getenv("SQWAADRUN_SERVICE_TOKEN", "")
CTI_HUB_BASE = os.getenv("CTI_HUB_BASE", "https://cti.foai.cloud")
CTI_HUB_OWNER_TOKEN = os.getenv("CTI_HUB_OWNER_TOKEN", "")
HTTP_TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0)


async def trigger_lane_a(payload: dict[str, Any]) -> dict[str, Any]:
    """Fire Lane A ACHEEVY content monitor mission ad-hoc.

    Calls Sqwaadrun gateway POST /mission with a HARVEST mission spec that
    Lil_Sched_Hawk recognizes as the existing lane_a_monitor job. Returns
    mission_id + status for receipt attachment.
    """
    body = {
        "type": "HARVEST",
        "targets": [],  # Sqwaadrun's lane_a runtime pulls sources from the registered job
        "config": {
            "lane": "lane_a",
            "trigger": "manual_run",
            "lane_a_job_id": "acheevy_content_monitor_4h",
        },
    }
    return await _post_sqwaadrun_mission(body, lane="lane_a")


async def trigger_lane_b(payload: dict[str, Any]) -> dict[str, Any]:
    """Fire Lane B fallen-app-rankings opportunity-scout mission ad-hoc."""
    body = {
        "type": "HARVEST",
        "targets": [],
        "config": {
            "lane": "lane_b",
            "trigger": "manual_run",
            "lane_b_job_id": "lane_b_fallen_app_rankings",
        },
    }
    return await _post_sqwaadrun_mission(body, lane="lane_b")


async def fire_lane_c5_snapshot(payload: dict[str, Any]) -> dict[str, Any]:
    """Hit the CTI Hub mindedge daily-snapshot admin endpoint.

    Aggregates enrollments + open-seats + affiliates + (V1.TBD pipeline) into
    one JSON. Returns the snapshot body for receipt attachment + downstream
    cache write.
    """
    if not CTI_HUB_OWNER_TOKEN:
        return {
            "ok": False,
            "error": "CTI_HUB_OWNER_TOKEN env not set",
            "action": "lane_c5_snapshot_fire",
        }
    url = f"{CTI_HUB_BASE}/api/admin/mindedge-daily-snapshot"
    headers = {
        "Authorization": f"Bearer {CTI_HUB_OWNER_TOKEN}",
        "Accept": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        logger.warning("lane_c5_snapshot_fetch_failed", error=str(exc))
        return {"ok": False, "error": f"cti-hub fetch failed: {exc}"}

    if response.status_code != 200:
        return {
            "ok": False,
            "http_status": response.status_code,
            "error": _truncate(response.text, 300),
        }
    return {
        "ok": True,
        "snapshot": response.json(),
        "fetched_from": url,
    }


async def _post_sqwaadrun_mission(body: dict[str, Any], *, lane: str) -> dict[str, Any]:
    """POST a mission to Sqwaadrun gateway. Returns slim projection of result."""
    url = f"{SQWAADRUN_GATEWAY_URL.rstrip('/')}/mission"
    headers = {"Accept": "application/json"}
    if SQWAADRUN_SERVICE_TOKEN:
        headers["Authorization"] = f"Bearer {SQWAADRUN_SERVICE_TOKEN}"
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.post(url, json=body, headers=headers)
    except httpx.HTTPError as exc:
        logger.warning("sqwaadrun_mission_post_failed", lane=lane, error=str(exc))
        return {"ok": False, "lane": lane, "error": f"sqwaadrun unreachable: {exc}"}

    if response.status_code not in (200, 201, 202):
        return {
            "ok": False,
            "lane": lane,
            "http_status": response.status_code,
            "error": _truncate(response.text, 300),
        }
    data = response.json() if response.text else {}
    return {
        "ok": True,
        "lane": lane,
        "mission_id": data.get("mission_id"),
        "mission_status": data.get("status"),
        "results_count": len(data.get("results", []) or []),
    }


def _truncate(s: str, n: int) -> str:
    return s[:n] + "…" if len(s) > n else s
