"""
Builder action handler — Phase 4b. Chicken Hawk creates full-stack websites.

`build_site` packages a natural-language brief into a Lil_Deep_Hawk squad
mission. Lil_Deep_Hawk orchestrates the specialist Lil_Hawks per the stack
preset (Lil_Coding_Hawk for frontend, Lil_Back_Hawk for backend/auth/db,
Lil_Viz_Hawk for dashboards, Lil_Blend_Hawk for visual assets, etc.) and
writes the output into a workspace directory the owner can then deploy.

CONTRACT: build is SAFE (writes to ~/chicken-hawk-workspaces only, never
production). Deploy is the gate — owner explicitly ships from /tools/deploy
after reviewing the build output. This keeps "scaffold from prompt" cheap
and "ship to public" expensive.

Workspace layout:
    ~/chicken-hawk-workspaces/<sanitized-name>/
        ├── .build/                  # squad mission logs + task_id index
        ├── frontend/                # Lil_Coding_Hawk output
        ├── backend/                 # Lil_Back_Hawk output
        ├── viz/                     # Lil_Viz_Hawk output (if requested)
        ├── README.md                # owner-facing build summary
        └── manifest.json            # build metadata + deploy spec
"""

from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

WORKSPACES_ROOT = Path(os.getenv(
    "CHICKEN_HAWK_WORKSPACES",
    os.path.expanduser("~/chicken-hawk-workspaces"),
))
HTTP_TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0)

# Stack presets translate to which Lil_Hawks the squad pulls in.
STACK_PRESETS: dict[str, dict[str, Any]] = {
    "nextjs_fastapi": {
        "label": "Next.js + FastAPI",
        "blurb": "Next.js 14 App Router frontend + FastAPI gateway backend.",
        "target_hawks": ["Lil_Coding_Hawk", "Lil_Back_Hawk", "Lil_Blend_Hawk"],
        "scaffold_dirs": ["frontend", "backend", "assets"],
    },
    "nextjs_static": {
        "label": "Next.js static site",
        "blurb": "Frontend only — marketing pages, no backend.",
        "target_hawks": ["Lil_Coding_Hawk", "Lil_Blend_Hawk"],
        "scaffold_dirs": ["frontend", "assets"],
    },
    "fastapi_service": {
        "label": "FastAPI service",
        "blurb": "Backend service only — APIs, auth, schema.",
        "target_hawks": ["Lil_Back_Hawk"],
        "scaffold_dirs": ["backend"],
    },
    "dashboard": {
        "label": "Monitoring dashboard",
        "blurb": "Lil_Viz_Hawk-led visualization surface.",
        "target_hawks": ["Lil_Viz_Hawk", "Lil_Coding_Hawk"],
        "scaffold_dirs": ["dashboard", "assets"],
    },
    "fullstack_squad": {
        "label": "Fullstack squad (all hands)",
        "blurb": "Coding + Back + Viz + Blend + Graph for stateful flows.",
        "target_hawks": [
            "Lil_Coding_Hawk", "Lil_Back_Hawk", "Lil_Viz_Hawk",
            "Lil_Blend_Hawk", "Lil_Graph_Hawk",
        ],
        "scaffold_dirs": ["frontend", "backend", "viz", "assets", "flows"],
    },
}


def get_stack_presets() -> dict[str, dict[str, Any]]:
    """Return the preset catalog for the UI dropdown."""
    return {k: {"label": v["label"], "blurb": v["blurb"], "target_hawks": v["target_hawks"]}
            for k, v in STACK_PRESETS.items()}


async def build_site(payload: dict[str, Any]) -> dict[str, Any]:
    """Fire a Lil_Deep_Hawk squad mission that scaffolds a full-stack site.

    Payload:
        brief (str, required)        — natural-language description
        workspace_name (str, required) — name for the output directory
        stack_preset (str, optional)  — key from STACK_PRESETS; default 'nextjs_fastapi'
        extra_hawks (list[str], optional) — additional Lil_Hawks to include
    """
    brief = (payload or {}).get("brief", "").strip()
    workspace_name_raw = (payload or {}).get("workspace_name", "").strip()
    stack_preset_key = (payload or {}).get("stack_preset", "nextjs_fastapi").strip()
    extra_hawks = (payload or {}).get("extra_hawks") or []

    if not brief:
        return {"ok": False, "error": "payload.brief is required"}
    if not workspace_name_raw:
        return {"ok": False, "error": "payload.workspace_name is required"}

    sanitized = _sanitize_workspace_name(workspace_name_raw)
    if not sanitized:
        return {"ok": False, "error": "workspace_name must produce at least 1 alphanumeric character"}

    preset = STACK_PRESETS.get(stack_preset_key)
    if preset is None:
        return {"ok": False, "error": f"unknown stack_preset '{stack_preset_key}'; valid: {list(STACK_PRESETS.keys())}"}

    workspace_path = WORKSPACES_ROOT / sanitized
    if workspace_path.exists():
        return {
            "ok": False,
            "error": f"workspace already exists at {workspace_path}; pick a different name or remove first",
            "workspace_path": str(workspace_path),
        }

    # Provision the workspace directory + the per-preset scaffold dirs
    try:
        workspace_path.mkdir(parents=True, exist_ok=False)
        (workspace_path / ".build").mkdir(exist_ok=True)
        for sub in preset["scaffold_dirs"]:
            (workspace_path / sub).mkdir(exist_ok=True)
    except OSError as exc:
        return {"ok": False, "error": f"workspace provision failed: {exc}"}

    target_hawks = list(dict.fromkeys(  # de-dup, preserve order
        list(preset["target_hawks"]) + list(extra_hawks)
    ))
    task_id = f"build_{uuid.uuid4().hex[:12]}"
    initiated_at = datetime.now(timezone.utc).isoformat()

    manifest = {
        "task_id": task_id,
        "workspace_name": sanitized,
        "workspace_name_raw": workspace_name_raw,
        "workspace_path": str(workspace_path),
        "stack_preset": stack_preset_key,
        "stack_preset_label": preset["label"],
        "brief": brief,
        "target_hawks": target_hawks,
        "scaffold_dirs": list(preset["scaffold_dirs"]),
        "initiated_at": initiated_at,
        "status": "squad_dispatched",
    }
    _write_manifest(workspace_path, manifest)
    _write_readme(workspace_path, manifest)

    # Dispatch the squad mission to Lil_Deep_Hawk
    dispatch = await _dispatch_deep_hawk_squad(
        task_id=task_id,
        brief=brief,
        workspace_path=str(workspace_path),
        target_hawks=target_hawks,
        stack_preset_key=stack_preset_key,
    )
    manifest["squad_dispatch"] = dispatch
    _write_manifest(workspace_path, manifest)

    return {
        "ok": True,
        "action": "build_site",
        "task_id": task_id,
        "workspace_name": sanitized,
        "workspace_path": str(workspace_path),
        "stack_preset": stack_preset_key,
        "target_hawks": target_hawks,
        "squad_dispatch": dispatch,
        "live_plan_hint": f"Track via /tools/live-plan; filter task_id={task_id}",
        "deploy_hint": "Once squad reports completion, ship via /tools/deploy.",
    }


# ─── Internal helpers ────────────────────────────────────────────────


def _sanitize_workspace_name(raw: str) -> str:
    """Lowercase alphanumeric + dash + underscore. Strip everything else. Max 64 chars."""
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "-", raw.lower()).strip("-_")
    return cleaned[:64]


def _write_manifest(workspace_path: Path, manifest: dict[str, Any]) -> None:
    import json
    target = workspace_path / "manifest.json"
    try:
        target.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    except OSError as exc:
        logger.warning("builder_manifest_write_failed", error=str(exc))


def _write_readme(workspace_path: Path, manifest: dict[str, Any]) -> None:
    """Write a build-summary README the owner reads first."""
    target = workspace_path / "README.md"
    body = f"""# {manifest['workspace_name_raw']}

> Build initiated {manifest['initiated_at']} — task `{manifest['task_id']}`

## What this is

{manifest['brief']}

## Stack

**Preset:** {manifest['stack_preset_label']} (`{manifest['stack_preset']}`)

**Squad assigned:**
{chr(10).join(f"- `{h}`" for h in manifest['target_hawks'])}

## Scaffold

```
{manifest['workspace_name']}/
{chr(10).join(f"├── {d}/" for d in manifest['scaffold_dirs'])}
├── .build/        # squad mission logs
├── README.md
└── manifest.json
```

## Build status

Current: **{manifest['status']}**

Watch live progress: `/tools/live-plan` (filter `task_id={manifest['task_id']}`)

## Next

Once the squad reports completion:

1. Review the scaffolded directories
2. Tweak as needed
3. Ship via `/tools/deploy` (the deploy action will pick this workspace up)
"""
    try:
        target.write_text(body, encoding="utf-8")
    except OSError as exc:
        logger.warning("builder_readme_write_failed", error=str(exc))


async def _dispatch_deep_hawk_squad(
    *,
    task_id: str,
    brief: str,
    workspace_path: str,
    target_hawks: list[str],
    stack_preset_key: str,
) -> dict[str, Any]:
    """POST the squad mission to Lil_Deep_Hawk. Returns the upstream response.

    On unreachable: returns ok=False with the workspace already provisioned —
    owner can retry the squad later via /tools/lil-hawks → Lil_Deep_Hawk →
    squad_mission action with the same task_id + workspace_path payload.
    """
    deep_hawk_url = os.getenv("DEEP_HAWK_URL", "")
    if not deep_hawk_url:
        # Fall back to settings if env var not set explicitly
        try:
            from config import get_settings
            deep_hawk_url = get_settings().deep_hawk_url
        except Exception:
            deep_hawk_url = ""

    if not deep_hawk_url:
        return {
            "ok": False,
            "dispatched": False,
            "error": "deep_hawk_url not configured",
            "manual_dispatch_payload": {
                "action": "squad_mission",
                "payload": {
                    "task_id": task_id,
                    "intent": brief,
                    "workspace_path": workspace_path,
                    "target_hawks": target_hawks,
                    "stack_preset": stack_preset_key,
                },
            },
        }

    mission_body = {
        "task_id": task_id,
        "intent": brief,
        "workspace_path": workspace_path,
        "target_hawks": target_hawks,
        "stack_preset": stack_preset_key,
        "deliverable": "fullstack_site_scaffold",
    }

    url = f"{deep_hawk_url.rstrip('/')}/mission"
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.post(url, json=mission_body, headers=headers)
    except httpx.HTTPError as exc:
        return {"ok": False, "dispatched": False, "error": f"deep_hawk unreachable: {exc}"}

    if response.status_code not in (200, 201, 202):
        return {
            "ok": False,
            "dispatched": False,
            "http_status": response.status_code,
            "error": (response.text or "")[:400],
        }
    try:
        data = response.json()
    except ValueError:
        data = {}
    return {
        "ok": True,
        "dispatched": True,
        "http_status": response.status_code,
        "deep_hawk_response": data,
    }
