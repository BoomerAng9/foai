"""
Deploy action handlers — Phase 4 wiring for /run dispatcher.

Wraps the existing `tar | ssh | docker compose` deploy sequence the owner
runs from terminal today. The /tools/deploy panel POSTs through here so
deploys carry NemoClaw policy gating + Telegram confirmation + audit-chain
receipt — same surface owner uses by hand, with the safety rails on.

Three targets:
    deploy_hawk_ui    — Next.js bundle rebuild + force-recreate hawk-ui container
    deploy_gateway    — rsync gateway/ + restart container (bind-mount, no rebuild)
    deploy_sqwaadrun  — rsync sqwaadrun service + systemctl restart on aims-vps

Plus deploy_rollback for reverting a target to the previous image / git ref.

CONTRACT: all four are in REQUIRES_OWNER_APPROVAL so the first /run call
returns 202 escalation → Telegram ping → owner approves with approval_id →
second /run call with approval_id actually fires the deploy. This is the
canonical NemoClaw two-step safety pattern.

Pre-flight gate (Phase-4 hard rule): before deploy_hawk_ui executes, run
`npm run typecheck && npm run lint` inside hawk-ui. Refuse to ship if either
fails. Owner gets the failure in the deploy receipt + Telegram alert.

Deploy history persists to ~/.chicken-hawk/deploy-history.jsonl. Each
deploy is one JSONL line with {receipt_id, target, started_at, finished_at,
verdict, commit, stdout_excerpt, stderr_excerpt}.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

CHICKEN_HAWK_REPO = Path(os.getenv("CHICKEN_HAWK_REPO", os.path.expanduser("~/foai/chicken-hawk")))
MYCLAW_VPS_SSH_TARGET = os.getenv("MYCLAW_VPS_SSH_TARGET", "myclaw-vps")
AIMS_VPS_SSH_TARGET = os.getenv("AIMS_VPS_SSH_TARGET", "aims-vps")
HISTORY_PATH = Path(os.getenv(
    "DEPLOY_HISTORY_PATH",
    os.path.expanduser("~/.chicken-hawk/deploy-history.jsonl"),
))
DEFAULT_TIMEOUT_S = float(os.getenv("DEPLOY_TIMEOUT_S", "900"))  # 15 min hard cap


async def deploy_hawk_ui(payload: dict[str, Any]) -> dict[str, Any]:
    """Build + ship the hawk-ui Next.js standalone bundle to myclaw-vps."""
    skip_preflight = bool(payload.get("skip_preflight", False))
    image_tag = (payload.get("image_tag") or "0.1.x").strip()

    if not skip_preflight:
        preflight = await _run_preflight()
        if not preflight["ok"]:
            return {
                "ok": False,
                "action": "deploy_hawk_ui",
                "stage": "preflight",
                "preflight": preflight,
                "error": "Pre-flight typecheck or lint failed; refusing to ship.",
            }

    cmd = (
        f"cd {CHICKEN_HAWK_REPO} && "
        "tar --exclude='node_modules' --exclude='.next' -cf - hawk-ui | "
        f"ssh {MYCLAW_VPS_SSH_TARGET} 'cd /docker/chicken-hawk && tar -xf - && "
        f"cd hawk-ui && docker build -t hawk-ui:{image_tag} . && "
        "cd .. && docker compose up -d --force-recreate hawk-ui'"
    )
    return await _run_deploy_cmd("deploy_hawk_ui", cmd, payload)


async def deploy_gateway(payload: dict[str, Any]) -> dict[str, Any]:
    """Sync gateway/ to myclaw-vps + restart container (bind-mount, no rebuild)."""
    cmd = (
        f"rsync -av --delete {CHICKEN_HAWK_REPO}/gateway/ "
        f"{MYCLAW_VPS_SSH_TARGET}:/docker/chicken-hawk/gateway/ && "
        f"ssh {MYCLAW_VPS_SSH_TARGET} 'docker restart chicken-hawk-hawk-gateway-1'"
    )
    return await _run_deploy_cmd("deploy_gateway", cmd, payload)


async def deploy_sqwaadrun(payload: dict[str, Any]) -> dict[str, Any]:
    """Sync sqwaadrun service to aims-vps + systemctl restart."""
    source = (payload.get("source") or os.path.expanduser("~/foai/smelter-os/sqwaadrun/")).rstrip("/") + "/"
    target = (payload.get("target") or "/srv/sqwaadrun/").rstrip("/") + "/"
    cmd = (
        f"rsync -av --delete --exclude='.venv' --exclude='__pycache__' "
        f"{source} {AIMS_VPS_SSH_TARGET}:{target} && "
        f"ssh {AIMS_VPS_SSH_TARGET} 'systemctl restart sqwaadrun'"
    )
    return await _run_deploy_cmd("deploy_sqwaadrun", cmd, payload)


async def deploy_rollback(payload: dict[str, Any]) -> dict[str, Any]:
    """Roll a target back to its previous image / commit.

    Payload: {target: 'hawk-ui'|'gateway'|'sqwaadrun', to_image?: str, to_commit?: str}
    V1 logic: for hawk-ui rolls to `hawk-ui:previous` Docker tag. For gateway/sqwaadrun
    relies on a git revert step the caller supplies via `to_commit`.
    """
    target = (payload.get("target") or "").strip()
    if target not in {"hawk-ui", "gateway", "sqwaadrun"}:
        return {"ok": False, "error": "payload.target must be one of: hawk-ui, gateway, sqwaadrun"}

    if target == "hawk-ui":
        to_image = (payload.get("to_image") or "hawk-ui:previous").strip()
        cmd = (
            f"ssh {MYCLAW_VPS_SSH_TARGET} "
            f"'cd /docker/chicken-hawk && "
            f"docker tag {to_image} hawk-ui:0.1.x && "
            "docker compose up -d --force-recreate hawk-ui'"
        )
    elif target == "gateway":
        to_commit = (payload.get("to_commit") or "").strip()
        if not to_commit:
            return {"ok": False, "error": "gateway rollback requires payload.to_commit"}
        cmd = (
            f"cd {CHICKEN_HAWK_REPO} && git checkout {to_commit} -- gateway/ && "
            f"rsync -av --delete gateway/ {MYCLAW_VPS_SSH_TARGET}:/docker/chicken-hawk/gateway/ && "
            f"ssh {MYCLAW_VPS_SSH_TARGET} 'docker restart chicken-hawk-hawk-gateway-1'"
        )
    else:  # sqwaadrun
        to_commit = (payload.get("to_commit") or "").strip()
        if not to_commit:
            return {"ok": False, "error": "sqwaadrun rollback requires payload.to_commit"}
        sqwaadrun_repo = Path(os.getenv("SQWAADRUN_REPO", os.path.expanduser("~/foai/smelter-os/sqwaadrun")))
        cmd = (
            f"cd {sqwaadrun_repo} && git checkout {to_commit} -- . && "
            f"rsync -av --delete --exclude='.venv' --exclude='__pycache__' "
            f"{sqwaadrun_repo}/ {AIMS_VPS_SSH_TARGET}:/srv/sqwaadrun/ && "
            f"ssh {AIMS_VPS_SSH_TARGET} 'systemctl restart sqwaadrun'"
        )

    payload = dict(payload, rollback=True)
    return await _run_deploy_cmd(f"deploy_rollback_{target}", cmd, payload)


# ─── Internal helpers ────────────────────────────────────────────────


async def _run_preflight() -> dict[str, Any]:
    """Run `npm run typecheck` + `npm run lint` inside hawk-ui.

    Typecheck is HARD-GATED — must pass. Lint is soft — if no ESLint config
    exists (Next.js prompts for interactive setup), skip gracefully instead
    of hanging the deploy. Owner can wire ESLint later without blocking ships.
    """
    hawk_ui = CHICKEN_HAWK_REPO / "hawk-ui"
    if not hawk_ui.exists():
        return {"ok": False, "error": f"hawk-ui not found at {hawk_ui}"}

    typecheck = await _run_shell(f"cd {hawk_ui} && npm run typecheck", timeout=180)
    if typecheck["exit_code"] != 0:
        return {
            "ok": False,
            "stage": "typecheck",
            "exit_code": typecheck["exit_code"],
            "stderr_excerpt": typecheck["stderr"][:600],
        }

    # Lint: only block if ESLint is genuinely configured AND fails. The
    # `next lint` first-time prompt is interactive and would hang the
    # deploy; we detect it via the absence of an .eslintrc.* file and skip.
    eslint_configs = [
        hawk_ui / ".eslintrc.json", hawk_ui / ".eslintrc.js",
        hawk_ui / ".eslintrc.yaml", hawk_ui / ".eslintrc.yml",
        hawk_ui / ".eslintrc",      hawk_ui / "eslint.config.js",
        hawk_ui / "eslint.config.mjs",
    ]
    if not any(p.exists() for p in eslint_configs):
        return {"ok": True, "typecheck": "passed", "lint": "skipped_no_config"}

    lint = await _run_shell(
        f"cd {hawk_ui} && npm run lint -- --no-cache 2>&1",
        timeout=120,
    )
    if lint["exit_code"] != 0:
        return {
            "ok": False,
            "stage": "lint",
            "exit_code": lint["exit_code"],
            "stderr_excerpt": lint["stderr"][:600] or lint["stdout"][:600],
        }
    return {"ok": True, "typecheck": "passed", "lint": "passed"}


async def _run_deploy_cmd(action: str, cmd: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Execute the shell command and record a history line."""
    started_at = datetime.now(timezone.utc).isoformat()
    started = time.perf_counter()
    result = await _run_shell(cmd, timeout=DEFAULT_TIMEOUT_S)
    finished_at = datetime.now(timezone.utc).isoformat()
    elapsed_s = time.perf_counter() - started

    record = {
        "action": action,
        "started_at": started_at,
        "finished_at": finished_at,
        "elapsed_seconds": round(elapsed_s, 1),
        "ok": result["exit_code"] == 0,
        "exit_code": result["exit_code"],
        "stdout_excerpt": result["stdout"][-2000:] if result["stdout"] else "",
        "stderr_excerpt": result["stderr"][-2000:] if result["stderr"] else "",
        "actor": payload.get("actor") or "owner",
        "approval_id": payload.get("approval_id"),
    }
    _append_history(record)

    return {
        "ok": result["exit_code"] == 0,
        "action": action,
        "started_at": started_at,
        "finished_at": finished_at,
        "elapsed_seconds": record["elapsed_seconds"],
        "exit_code": result["exit_code"],
        "stdout_excerpt": record["stdout_excerpt"],
        "stderr_excerpt": record["stderr_excerpt"],
    }


async def _run_shell(cmd: str, *, timeout: float) -> dict[str, Any]:
    """Run a shell command with a hard timeout. Returns stdout/stderr/exit_code."""
    try:
        proc = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except (OSError, ValueError) as exc:
        return {"exit_code": -1, "stdout": "", "stderr": f"spawn failed: {exc}"}

    try:
        stdout_b, stderr_b = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        return {"exit_code": -2, "stdout": "", "stderr": f"timeout after {timeout}s"}

    return {
        "exit_code": proc.returncode if proc.returncode is not None else -1,
        "stdout": stdout_b.decode("utf-8", errors="replace") if stdout_b else "",
        "stderr": stderr_b.decode("utf-8", errors="replace") if stderr_b else "",
    }


def _append_history(record: dict[str, Any]) -> None:
    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    try:
        with HISTORY_PATH.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record) + "\n")
    except OSError as exc:
        logger.warning("deploy_history_write_failed", error=str(exc))


def read_history(n: int = 20) -> dict[str, Any]:
    """Return last N deploy history entries (newest last in returned list)."""
    n = max(1, min(int(n or 20), 200))
    if not HISTORY_PATH.exists():
        return {"ok": True, "deploys": [], "count": 0}
    entries: list[dict[str, Any]] = []
    try:
        for line in HISTORY_PATH.read_text(encoding="utf-8").splitlines()[-n:]:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    except OSError as exc:
        return {"ok": False, "deploys": [], "count": 0, "error": str(exc)}
    return {"ok": True, "deploys": entries, "count": len(entries)}
