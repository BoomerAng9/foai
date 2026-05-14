"""Sandbox action handler — Phase 1C.

Routes Boomer_Ang / Lil_Hawk heavy-compute jobs into the aims-open-sandbox
container (Hono service on AIMS Core VPS, port 4400 over WireGuard). Each
dispatched job runs in an isolated Docker exec environment; results land
back in the gateway's run-ledger receipt.

aims-open-sandbox is an internal-only HTTP service. The gateway reaches
it via the URL configured in ``AIMS_OPEN_SANDBOX_URL``; ops sets that to
the WireGuard internal address (e.g. ``http://10.0.0.2:4400``) once the
inter-VPS tunnel is up. Until then, ``AIMS_OPEN_SANDBOX_URL`` can point
at a local stand-in for development.

This file mirrors the contract used by lane_actions / press_actions /
builder_actions: each function returns a slim projection dict the /run
handler attaches to its receipt. No raw provider responses leak through.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_DEFAULT_URL = "http://aims-open-sandbox:4400"
_SUPPORTED_LANGUAGES = {
    "python", "javascript", "typescript", "bash", "go", "rust", "ruby",
}
_HTTP_TIMEOUT = httpx.Timeout(connect=5.0, read=60.0, write=10.0, pool=5.0)


def _base_url() -> str:
    return os.getenv("AIMS_OPEN_SANDBOX_URL", _DEFAULT_URL).rstrip("/")


async def dispatch_sandbox_job(payload: dict[str, Any]) -> dict[str, Any]:
    """Run code in aims-open-sandbox; return a slim projection.

    Required payload keys:
      - ``code`` (str, ≤100KB)
      - ``language`` (str, one of _SUPPORTED_LANGUAGES)

    Optional:
      - ``timeout_seconds`` (int, max 300 — sandbox enforces a hard cap)
      - ``stdin`` (str)
      - ``files`` (list[dict] — passthrough to the sandbox /execute body)

    Returns a slim envelope: ``{ok, execution_id, status, language,
    stdout, stderr, duration_ms}``. The sandbox's raw `execution` object
    is dropped to keep receipts terse — fetch via /sandbox/executions/{id}
    when full output is needed.
    """
    code = payload.get("code")
    language = (payload.get("language") or "").lower().strip()

    if not isinstance(code, str) or not code:
        return {"ok": False, "error": "payload.code is required (non-empty string)"}
    if len(code) > 100_000:
        return {"ok": False, "error": "payload.code exceeds 100KB sandbox limit"}
    if language not in _SUPPORTED_LANGUAGES:
        return {
            "ok": False,
            "error": (
                f"payload.language must be one of {sorted(_SUPPORTED_LANGUAGES)} "
                f"(got '{language}')"
            ),
        }

    body: dict[str, Any] = {"code": code, "language": language}
    timeout_seconds = payload.get("timeout_seconds")
    if isinstance(timeout_seconds, int) and timeout_seconds > 0:
        body["timeoutSeconds"] = min(timeout_seconds, 300)
    if isinstance(payload.get("stdin"), str):
        body["stdin"] = payload["stdin"]
    if isinstance(payload.get("files"), list):
        body["files"] = payload["files"]

    url = f"{_base_url()}/api/sandbox/execute"
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.post(url, json=body)
    except httpx.HTTPError as exc:
        logger.warning("sandbox_dispatch_http_error url=%s error=%s", url, exc)
        return {"ok": False, "error": f"sandbox unreachable: {type(exc).__name__}"}

    if resp.status_code >= 400:
        return {
            "ok": False,
            "status_code": resp.status_code,
            "error": _safe_error(resp),
        }

    data = _safe_json(resp)
    execution = (data or {}).get("execution") or {}
    return {
        "ok": True,
        "execution_id": execution.get("id", ""),
        "status": execution.get("status", "unknown"),
        "language": language,
        "stdout": _truncate(execution.get("stdout", ""), 2000),
        "stderr": _truncate(execution.get("stderr", ""), 2000),
        "duration_ms": execution.get("durationMs"),
    }


async def get_job_status(execution_id: str) -> dict[str, Any]:
    """Fetch a single execution by id. Returns the slim projection or an
    error envelope on failure.
    """
    if not execution_id or not isinstance(execution_id, str):
        return {"ok": False, "error": "execution_id required"}

    url = f"{_base_url()}/api/sandbox/executions/{execution_id}"
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.get(url)
    except httpx.HTTPError as exc:
        return {"ok": False, "error": f"sandbox unreachable: {type(exc).__name__}"}

    if resp.status_code == 404:
        return {"ok": False, "error": "execution_not_found"}
    if resp.status_code >= 400:
        return {"ok": False, "status_code": resp.status_code, "error": _safe_error(resp)}

    data = _safe_json(resp)
    execution = (data or {}).get("execution") or {}
    return {
        "ok": True,
        "execution_id": execution.get("id", ""),
        "status": execution.get("status", "unknown"),
        "language": execution.get("language", ""),
        "stdout": _truncate(execution.get("stdout", ""), 2000),
        "stderr": _truncate(execution.get("stderr", ""), 2000),
        "duration_ms": execution.get("durationMs"),
        "started_at": execution.get("startedAt"),
        "completed_at": execution.get("completedAt"),
    }


async def list_recent_jobs(limit: int = 25) -> dict[str, Any]:
    """List the most recent N executions from the sandbox. Returns
    ``{ok, executions: [{id, status, language, duration_ms, started_at}]}``.
    """
    limit = max(1, min(int(limit or 25), 200))
    url = f"{_base_url()}/api/sandbox/executions?limit={limit}"
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.get(url)
    except httpx.HTTPError as exc:
        return {"ok": False, "error": f"sandbox unreachable: {type(exc).__name__}"}

    if resp.status_code >= 400:
        return {"ok": False, "status_code": resp.status_code, "error": _safe_error(resp)}

    data = _safe_json(resp) or {}
    raw = data.get("executions") or []
    slim = [
        {
            "id": e.get("id", ""),
            "status": e.get("status", "unknown"),
            "language": e.get("language", ""),
            "duration_ms": e.get("durationMs"),
            "started_at": e.get("startedAt"),
        }
        for e in raw
        if isinstance(e, dict)
    ]
    return {"ok": True, "executions": slim}


# ─── Helpers ─────────────────────────────────────────────────────────


def _truncate(text: Any, max_chars: int) -> str:
    if not isinstance(text, str):
        return ""
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + f"… [+{len(text) - max_chars} more chars]"


def _safe_json(resp: httpx.Response) -> dict[str, Any] | None:
    try:
        data = resp.json()
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _safe_error(resp: httpx.Response) -> str:
    data = _safe_json(resp)
    if isinstance(data, dict):
        msg = data.get("error") or data.get("message")
        if isinstance(msg, str):
            return msg
    text = resp.text
    return text[:500] if text else f"http_{resp.status_code}"
