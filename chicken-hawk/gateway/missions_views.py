"""
Mission registry view endpoints — Phase 5 for /tools/missions panel.

Scans FOAI_PROJECT_REGISTRY_DIR (default ~/iCloudDrive/.../FOAI Project/registry/)
for mission spec JSON files (mission_id field present) and returns a unified
registry with per-mission drift status — Python IMPLEMENTED_STAGES (from
lane_views.LANE_CONFIG) compared to the spec's pipeline[].stage list.

Specs are inert documentation; runtimes are hardcoded Python in
sqwaadrun.lane_a_jobs / sqwaadrun.lane_b_jobs. The drift report calls out
when they've diverged.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lane_views import LANE_CONFIG, get_lane_drift

logger = logging.getLogger(__name__)

SPEC_DIR = Path(os.getenv(
    "FOAI_PROJECT_REGISTRY_DIR",
    str(Path.home() / "iCloudDrive" / "ACHIEVEMOR_" / "Projects_"
        / "The Deploy Platform_" / "Claude Code" / "FOAI Project" / "registry"),
))


# Map mission_id (from spec body) → registered lane_id (from LANE_CONFIG)
_MISSION_TO_LANE: dict[str, str] = {
    "acheevy-monitor": "lane-a",
    "lane-b-fallen-app-rankings": "lane-b",
}


def list_missions() -> dict[str, Any]:
    """Return the unified mission registry with drift status per entry."""
    if not SPEC_DIR.exists():
        return {
            "ok": False,
            "missions": [],
            "count": 0,
            "spec_dir": str(SPEC_DIR),
            "error": f"spec dir not reachable: {SPEC_DIR}",
        }

    missions: list[dict[str, Any]] = []
    seen_paths: set[str] = set()
    for search_dir in (SPEC_DIR, SPEC_DIR / "missions"):
        if not search_dir.exists():
            continue
        for path in sorted(search_dir.glob("*.json")):
            if str(path) in seen_paths:
                continue
            seen_paths.add(str(path))
            entry = _summarize_spec(path)
            if entry:
                missions.append(entry)

    return {
        "ok": True,
        "missions": missions,
        "count": len(missions),
        "spec_dir": str(SPEC_DIR),
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }


def get_mission_spec(mission_id: str) -> dict[str, Any]:
    """Return the full spec body for a single mission_id."""
    for search_dir in (SPEC_DIR, SPEC_DIR / "missions"):
        if not search_dir.exists():
            continue
        for path in search_dir.glob("*.json"):
            try:
                spec = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if spec.get("mission_id") == mission_id:
                return {"ok": True, "mission_id": mission_id, "spec_path": str(path), "spec": spec}
    return {"ok": False, "mission_id": mission_id, "error": "spec not found"}


def _summarize_spec(path: Path) -> dict[str, Any] | None:
    """Build a single-row summary of a spec file. Returns None if not a mission spec."""
    try:
        spec = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return {
            "mission_id": None,
            "title": path.name,
            "spec_path": str(path),
            "executable": False,
            "drift_status": "spec_parse_failed",
            "error": str(exc),
        }

    if not isinstance(spec, dict) or "mission_id" not in spec:
        # Not a mission spec (could be feed-list, scoring rubric, etc.) — skip
        return None

    mission_id = spec.get("mission_id", "unknown")
    runtime_status = spec.get("_runtime_status", {}) or {}
    pipeline_stages = [s.get("stage") for s in spec.get("pipeline", []) if s.get("stage")]

    drift_status = "no_runtime"
    drift_detail: dict[str, Any] = {}
    lane_id = _MISSION_TO_LANE.get(mission_id)
    if lane_id and lane_id in LANE_CONFIG:
        drift = get_lane_drift(lane_id)
        drift_status = drift.get("status", "unknown")
        drift_detail = {
            "missing_in_spec": drift.get("missing_in_spec", []),
            "spec_stages": drift.get("spec_stages", []),
            "implemented_stages": drift.get("implemented_stages", []),
        }

    return {
        "mission_id": mission_id,
        "title": spec.get("title", mission_id),
        "version": spec.get("version"),
        "spec_path": str(path),
        "executable": bool(runtime_status.get("executable", False)),
        "runtime_module": runtime_status.get("runtime_module"),
        "lane_id": lane_id,
        "pipeline_stage_count": len(pipeline_stages),
        "pipeline_stages": pipeline_stages,
        "drift_status": drift_status,
        "drift": drift_detail,
        "schedule_cron": (spec.get("schedule") or {}).get("cron"),
        "owner_agent": spec.get("owner_agent"),
    }
