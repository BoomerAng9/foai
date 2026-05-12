"""
Print_Press view endpoints — Phase 3 read surface for /tools/press panel.

Read-only access to:
  - daemon heartbeat (~/.print-press/heartbeat.json OR 127.0.0.1:8472/heartbeat)
  - delivery receipts (`pp receipts tail -n N --json` OR ~/.print-press/receipts.jsonl)
  - auth platforms (`pp auth list --json` — never returns secrets)
  - token index (presence-only — reads ~/.print-press/fleet-tokens.json keys
    and tiers; NEVER returns the `secret` field)

Token-index handler is explicit about secret-exclusion to make the no-leakage
contract auditable from a single function-body inspection.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

PRINT_PRESS_BIN = os.getenv("PRINT_PRESS_BIN", os.path.expanduser("~/bin/pp"))
PRINT_PRESS_HOME = Path(os.getenv("PRINT_PRESS_HOME", os.path.expanduser("~/.print-press")))
PRINT_PRESS_DAEMON_URL = os.getenv("PRINT_PRESS_DAEMON_URL", "http://127.0.0.1:8472")
HTTP_TIMEOUT = httpx.Timeout(connect=2.0, read=5.0, write=3.0, pool=3.0)


def _resolve_pp_bin() -> str | None:
    if PRINT_PRESS_BIN and os.path.exists(PRINT_PRESS_BIN):
        return PRINT_PRESS_BIN
    return shutil.which("pp")


def _truncate(s: str, n: int) -> str:
    return s[:n] + "…" if len(s) > n else s


async def get_heartbeat() -> dict[str, Any]:
    """Return daemon liveness JSON + age-of-last-tick in seconds.

    Tries the HTTP heartbeat endpoint first (fastest signal that the
    listener thread is alive). Falls back to reading the heartbeat.json
    file written by the heartbeat thread.
    """
    # HTTP path
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.get(f"{PRINT_PRESS_DAEMON_URL.rstrip('/')}/heartbeat")
        if response.status_code == 200:
            payload = response.json()
            return {
                "ok": True,
                "source": "http",
                "alive": True,
                "heartbeat": payload,
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }
    except httpx.HTTPError as exc:
        logger.debug("press_heartbeat_http_unreachable", error=str(exc))

    # File fallback
    hb_path = PRINT_PRESS_HOME / "heartbeat.json"
    if not hb_path.exists():
        return {
            "ok": False,
            "source": "none",
            "alive": False,
            "error": f"heartbeat HTTP unreachable + {hb_path} not found",
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }
    try:
        payload = json.loads(hb_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return {"ok": False, "source": "file", "alive": False, "error": str(exc)}

    # Compute age of the last heartbeat in seconds
    ts_str = payload.get("timestamp") or payload.get("last_tick") or payload.get("emitted_at")
    age_seconds: float | None = None
    if isinstance(ts_str, str):
        try:
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            age_seconds = (datetime.now(timezone.utc) - ts).total_seconds()
        except ValueError:
            age_seconds = None

    # Consider "alive" if last heartbeat is under 5 minutes old
    alive = age_seconds is not None and age_seconds < 300
    return {
        "ok": True,
        "source": "file",
        "alive": alive,
        "heartbeat": payload,
        "age_seconds": age_seconds,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }


async def get_receipts(n: int = 20) -> dict[str, Any]:
    """Return last N delivery receipts.

    Tries `pp receipts tail -n N --json` first; falls back to direct read of
    ~/.print-press/receipts.jsonl (newline-delimited JSON).
    """
    n = max(1, min(int(n or 20), 200))
    pp = _resolve_pp_bin()
    if pp:
        try:
            proc = await asyncio.create_subprocess_exec(
                pp, "receipts", "tail", "-n", str(n), "--json",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _stderr = await proc.communicate()
            if proc.returncode == 0:
                try:
                    parsed = json.loads(stdout.decode("utf-8", errors="replace"))
                    receipts = parsed.get("receipts", parsed) if isinstance(parsed, dict) else parsed
                    return {"ok": True, "source": "cli", "receipts": receipts or [], "count": len(receipts or [])}
                except (json.JSONDecodeError, TypeError):
                    pass  # fall through to file
        except (OSError, ValueError) as exc:
            logger.debug("press_receipts_cli_failed", error=str(exc))

    # File fallback
    receipts_path = PRINT_PRESS_HOME / "receipts.jsonl"
    if not receipts_path.exists():
        return {"ok": False, "source": "none", "receipts": [], "count": 0,
                "error": f"{receipts_path} not found"}

    lines: list[dict[str, Any]] = []
    try:
        for raw_line in receipts_path.read_text(encoding="utf-8").splitlines()[-n:]:
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            try:
                lines.append(json.loads(raw_line))
            except json.JSONDecodeError:
                continue
    except OSError as exc:
        return {"ok": False, "source": "file", "receipts": [], "count": 0, "error": str(exc)}

    return {"ok": True, "source": "file", "receipts": lines, "count": len(lines)}


async def get_auth_list() -> dict[str, Any]:
    """Return configured platforms (NEVER returns secrets).

    Calls `pp auth list --json`. The CLI is designed to omit secret values;
    this wrapper just relays.
    """
    pp = _resolve_pp_bin()
    if not pp:
        return {"ok": False, "source": "none", "platforms": [], "error": "pp binary not found"}
    proc = await asyncio.create_subprocess_exec(
        pp, "auth", "list", "--json",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        return {
            "ok": False,
            "source": "cli",
            "platforms": [],
            "error": _truncate(stderr.decode("utf-8", errors="replace"), 300),
        }
    try:
        parsed = json.loads(stdout.decode("utf-8", errors="replace"))
        platforms = parsed.get("platforms", parsed) if isinstance(parsed, dict) else parsed
        return {"ok": True, "source": "cli", "platforms": platforms or []}
    except json.JSONDecodeError as exc:
        return {"ok": False, "source": "cli", "platforms": [], "error": f"json parse: {exc}"}


def get_token_index() -> dict[str, Any]:
    """Return caller-token PRESENCE INDEX. NEVER returns the `secret` field.

    Reads ~/.print-press/fleet-tokens.json and projects only {name, tier,
    has_secret:bool}. The `secret` value is read but immediately dropped;
    this function's body should be auditable in one pass to confirm no leak.
    """
    tokens_path = PRINT_PRESS_HOME / "fleet-tokens.json"
    if not tokens_path.exists():
        return {"ok": False, "tokens": [], "count": 0, "error": f"{tokens_path} not found"}
    try:
        raw = json.loads(tokens_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return {"ok": False, "tokens": [], "count": 0, "error": str(exc)}

    if not isinstance(raw, dict):
        return {"ok": False, "tokens": [], "count": 0, "error": "fleet-tokens.json is not a JSON object"}

    safe_index: list[dict[str, Any]] = []
    for caller_name, entry in raw.items():
        if not isinstance(entry, dict):
            continue
        tier = entry.get("tier", "unknown")
        # Read but DO NOT return the secret. Just confirm it's a non-empty string.
        secret_value = entry.get("secret", "")
        has_secret = isinstance(secret_value, str) and len(secret_value) >= 16
        safe_index.append({
            "name": caller_name,
            "tier": tier,
            "has_secret": has_secret,
        })

    safe_index.sort(key=lambda t: (_tier_rank(t["tier"]), t["name"]))
    return {"ok": True, "tokens": safe_index, "count": len(safe_index)}


_TIER_ORDER = ["ACHEEVY", "Chicken_Hawk", "Boomer_Ang", "Lil_Hawk", "External"]


def _tier_rank(tier: str) -> int:
    try:
        return _TIER_ORDER.index(tier)
    except ValueError:
        return len(_TIER_ORDER)
