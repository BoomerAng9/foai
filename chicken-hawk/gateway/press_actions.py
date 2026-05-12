"""
Print_Press action handlers — Phase 3 wiring for /run dispatcher.

Bridges the chicken-hawk gateway to the Print_Press CLI (~/bin/pp) for
owner-controlled daemon lifecycle, dry-run preview, and credential testing.

All handlers shell out to `pp` async. The daemon is the long-running side
(scheduler + heartbeat + HTTP trigger inbox + file-drop trigger inbox); when
it's down, every other Press capability is inert.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
from typing import Any

logger = logging.getLogger(__name__)

PRINT_PRESS_BIN = os.getenv("PRINT_PRESS_BIN", os.path.expanduser("~/bin/pp"))


def _resolve_pp_bin() -> str | None:
    if PRINT_PRESS_BIN and os.path.exists(PRINT_PRESS_BIN):
        return PRINT_PRESS_BIN
    return shutil.which("pp")


def _truncate(s: str, n: int) -> str:
    return s[:n] + "…" if len(s) > n else s


async def daemon_start(payload: dict[str, Any]) -> dict[str, Any]:
    """Bring up the Print_Press daemon (detached process).

    Owner-only. The daemon writes its own pid + heartbeat to
    ~/.print-press/. Returns immediately after spawning; the daemon stays up
    until owner-stops or host-restarts. Caller should poll `/press/heartbeat`
    a few seconds later to confirm liveness.
    """
    pp = _resolve_pp_bin()
    if not pp:
        return {"ok": False, "error": "pp binary not found", "checked": PRINT_PRESS_BIN}

    # Spawn detached. We do NOT wait for completion — the daemon runs forever
    # in the foreground when invoked with `pp daemon start`. The gateway
    # process must not block on it.
    try:
        proc = await asyncio.create_subprocess_exec(
            pp, "daemon", "start",
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
            stdin=asyncio.subprocess.DEVNULL,
            start_new_session=True,
        )
    except (OSError, ValueError) as exc:
        return {"ok": False, "error": f"spawn failed: {exc}"}

    # Brief settling window so the daemon writes its pid + initial heartbeat
    await asyncio.sleep(0.5)
    return {
        "ok": True,
        "action": "press_daemon_start",
        "pid": proc.pid,
        "note": "Daemon spawned. Poll /press/heartbeat in ~3s to confirm liveness.",
    }


async def dry_run(payload: dict[str, Any]) -> dict[str, Any]:
    """Preview a press cycle without firing any sends.

    Payload: {config_path: str}  — absolute path to a .yaml cycle config.
    Returns rendered output + adapter-validation results.
    """
    config_path = (payload or {}).get("config_path", "").strip()
    if not config_path:
        return {"ok": False, "error": "payload must include {config_path: str}"}

    pp = _resolve_pp_bin()
    if not pp:
        return {"ok": False, "error": "pp binary not found"}

    proc = await asyncio.create_subprocess_exec(
        pp, "dry-run", config_path,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return {
        "ok": proc.returncode == 0,
        "action": "press_dry_run",
        "config_path": config_path,
        "exit_code": proc.returncode,
        "stdout": _truncate(stdout.decode("utf-8", errors="replace"), 2000),
        "stderr": _truncate(stderr.decode("utf-8", errors="replace"), 500),
    }


async def auth_test(payload: dict[str, Any]) -> dict[str, Any]:
    """Verify a platform credential without sending.

    Payload: {platform: str, target?: str}
    Calls `pp auth test <platform> [--target <target>] --json`.
    """
    platform = (payload or {}).get("platform", "").strip()
    target = (payload or {}).get("target", "").strip()
    if not platform:
        return {"ok": False, "error": "payload must include {platform: str}"}

    pp = _resolve_pp_bin()
    if not pp:
        return {"ok": False, "error": "pp binary not found"}

    args = [pp, "auth", "test", platform]
    if target:
        args += ["--target", target]
    args.append("--json")

    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    parsed: Any = {}
    try:
        parsed = json.loads(stdout.decode("utf-8", errors="replace"))
    except (json.JSONDecodeError, TypeError):
        parsed = {"raw": _truncate(stdout.decode("utf-8", errors="replace"), 600)}

    return {
        "ok": proc.returncode == 0,
        "action": "press_auth_test",
        "platform": platform,
        "target": target or None,
        "exit_code": proc.returncode,
        "result": parsed,
        "stderr": _truncate(stderr.decode("utf-8", errors="replace"), 300),
    }
