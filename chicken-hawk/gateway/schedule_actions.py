"""
Schedule action handlers — Phase 1 wiring for /run dispatcher + GET /schedules.

Merges two scheduler sources into one view:
  - Sqwaadrun's `Lil_Sched_Hawk` (scrape cadence — lane_a, lane_b, TRCC)
  - Print_Press daemon (`~/bin/pp schedule list`) (publish cadence)

Result is a unified table the hawk-ui Tool Chest renders at /tools/cron.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
from typing import Any

import httpx

logger = logging.getLogger(__name__)

SQWAADRUN_GATEWAY_URL = os.getenv("SQWAADRUN_GATEWAY_URL", "http://aims-vps:8000")
SQWAADRUN_SERVICE_TOKEN = os.getenv("SQWAADRUN_SERVICE_TOKEN", "")
PRINT_PRESS_BIN = os.getenv("PRINT_PRESS_BIN", os.path.expanduser("~/bin/pp"))
HTTP_TIMEOUT = httpx.Timeout(connect=5.0, read=15.0, write=10.0, pool=5.0)


async def list_all_schedules() -> dict[str, Any]:
    """Aggregate Sqwaadrun + Print_Press schedules into one list.

    Returns:
        {"schedules": [...], "sources": {"sqwaadrun": "ok"|"unavailable",
                                         "print_press": "ok"|"unavailable"}}
    """
    sqwaadrun_task = asyncio.create_task(_list_sqwaadrun_schedules())
    press_task = asyncio.create_task(_list_print_press_schedules())
    sqwaadrun_result, press_result = await asyncio.gather(sqwaadrun_task, press_task)

    merged: list[dict[str, Any]] = []
    for entry in sqwaadrun_result.get("schedules", []):
        merged.append({**entry, "source": "sqwaadrun"})
    for entry in press_result.get("schedules", []):
        merged.append({**entry, "source": "print_press"})

    return {
        "schedules": merged,
        "sources": {
            "sqwaadrun": sqwaadrun_result.get("status", "unavailable"),
            "print_press": press_result.get("status", "unavailable"),
        },
        "total": len(merged),
    }


async def run_schedule_once(payload: dict[str, Any]) -> dict[str, Any]:
    """Fire a single scheduled job ad-hoc.

    Payload must include {name: str, source: 'sqwaadrun'|'print_press'}.
    Returns the upstream service's response slim-projected.
    """
    name = (payload or {}).get("name", "").strip()
    source = (payload or {}).get("source", "").strip().lower()
    if not name or source not in ("sqwaadrun", "print_press"):
        return {"ok": False, "error": "payload must include {name, source} where source ∈ {sqwaadrun, print_press}"}

    if source == "sqwaadrun":
        return await _sqwaadrun_run_once(name)
    return await _print_press_run_once(name)


# ─── Sqwaadrun bridge ────────────────────────────────────────────────


async def _list_sqwaadrun_schedules() -> dict[str, Any]:
    """Query Sqwaadrun's gateway for registered schedule entries.

    Sqwaadrun exposes its schedule registry via HTTP. If the endpoint is
    unreachable, gracefully report status='unavailable' so the merged
    response still ships with whatever the other source returns.
    """
    url = f"{SQWAADRUN_GATEWAY_URL.rstrip('/')}/schedules"
    headers = {"Accept": "application/json"}
    if SQWAADRUN_SERVICE_TOKEN:
        headers["Authorization"] = f"Bearer {SQWAADRUN_SERVICE_TOKEN}"
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.get(url, headers=headers)
        if response.status_code != 200:
            return {"status": "unavailable", "schedules": [], "error": f"HTTP {response.status_code}"}
        data = response.json()
        return {"status": "ok", "schedules": data.get("schedules", []) or []}
    except httpx.HTTPError as exc:
        logger.debug("sqwaadrun_schedules_unreachable", error=str(exc))
        return {"status": "unavailable", "schedules": [], "error": str(exc)}


async def _sqwaadrun_run_once(name: str) -> dict[str, Any]:
    url = f"{SQWAADRUN_GATEWAY_URL.rstrip('/')}/schedules/{name}/run-once"
    headers = {"Accept": "application/json"}
    if SQWAADRUN_SERVICE_TOKEN:
        headers["Authorization"] = f"Bearer {SQWAADRUN_SERVICE_TOKEN}"
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.post(url, headers=headers)
    except httpx.HTTPError as exc:
        return {"ok": False, "source": "sqwaadrun", "error": str(exc)}
    return {
        "ok": response.status_code in (200, 202),
        "source": "sqwaadrun",
        "name": name,
        "http_status": response.status_code,
        "detail": _safe_json(response.text),
    }


# ─── Print_Press bridge ──────────────────────────────────────────────


async def _list_print_press_schedules() -> dict[str, Any]:
    """Call `pp schedule list --json` if the binary exists."""
    pp = _resolve_pp_bin()
    if not pp:
        return {"status": "unavailable", "schedules": [], "error": "pp binary not found"}
    proc = await asyncio.create_subprocess_exec(
        pp, "schedule", "list", "--json",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        return {
            "status": "unavailable",
            "schedules": [],
            "error": stderr.decode("utf-8", errors="replace")[:300],
        }
    parsed = _safe_json(stdout.decode("utf-8", errors="replace"))
    schedules = parsed.get("schedules", []) if isinstance(parsed, dict) else []
    return {"status": "ok", "schedules": schedules}


async def _print_press_run_once(name: str) -> dict[str, Any]:
    pp = _resolve_pp_bin()
    if not pp:
        return {"ok": False, "source": "print_press", "error": "pp binary not found"}
    proc = await asyncio.create_subprocess_exec(
        pp, "schedule", "run-once", name, "--json",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return {
        "ok": proc.returncode == 0,
        "source": "print_press",
        "name": name,
        "exit_code": proc.returncode,
        "stdout": _truncate(stdout.decode("utf-8", errors="replace"), 800),
        "stderr": _truncate(stderr.decode("utf-8", errors="replace"), 400),
    }


def _resolve_pp_bin() -> str | None:
    if PRINT_PRESS_BIN and os.path.exists(PRINT_PRESS_BIN):
        return PRINT_PRESS_BIN
    fallback = shutil.which("pp")
    return fallback


def _safe_json(s: str) -> Any:
    try:
        return json.loads(s)
    except (json.JSONDecodeError, TypeError):
        return {}


def _truncate(s: str, n: int) -> str:
    return s[:n] + "…" if len(s) > n else s
