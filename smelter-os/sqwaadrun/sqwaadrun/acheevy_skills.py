"""
ACHEEVY Skill Routing for Sqwaadrun
=====================================
Maps ACHEEVY's 10 business skills to Hawk selection.
Chicken Hawk uses this to pick which Hawks fly each mission.

Skills: MARKETING, TECH, SALES, OPERATIONS, FINANCE,
        TALENT, PARTNERSHIPS, PRODUCT, NARRATIVE, CRISIS
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional

ACHEEVY_SKILLS = [
    "MARKETING", "TECH", "SALES", "OPERATIONS", "FINANCE",
    "TALENT", "PARTNERSHIPS", "PRODUCT", "NARRATIVE", "CRISIS",
]

# Core pipeline Hawks that fly on every mission (if skill-eligible)
CORE_PIPELINE = [
    "Lil_Scrapp_Hawk",    # fetch
    "Lil_Extract_Hawk",   # structured extraction
    "Lil_Diff_Hawk",      # verification
    "Lil_Pipe_Hawk",      # export
]

_registry_cache: Optional[List[Dict]] = None


def load_hawk_registry() -> List[Dict]:
    """Load 17-Hawk registry from sqwaadrun_hawks.json."""
    global _registry_cache
    if _registry_cache is not None:
        return _registry_cache
    registry_path = Path(__file__).parent / "sqwaadrun_hawks.json"
    with open(registry_path, "r") as f:
        _registry_cache = json.load(f)
    return _registry_cache


def get_hawk_skills(hawk_id: str) -> List[str]:
    """Get ACHEEVY skills for a specific Hawk."""
    for hawk in load_hawk_registry():
        if hawk["id"] == hawk_id:
            return hawk.get("acheevy_skills", [])
    return []


def select_hawks_for_mission(
    primary_skill: str,
    max_hawks: int = 6,
) -> List[str]:
    """
    Select Hawks for a mission based on ACHEEVY Skill affinity.

    1. Get all Hawks whose acheevy_skills includes primary_skill
    2. Ensure core pipeline stages are covered
    3. Fill remaining slots from eligible pool
    """
    registry = load_hawk_registry()
    reg_map = {h["id"]: h for h in registry}

    # All Hawks with this skill
    eligible = [
        h["id"] for h in registry
        if primary_skill in h.get("acheevy_skills", [])
    ]

    # Start with core pipeline Hawks (only if they have the skill)
    squad = []
    for hawk_id in CORE_PIPELINE:
        if hawk_id in reg_map and primary_skill in reg_map[hawk_id].get("acheevy_skills", []):
            squad.append(hawk_id)

    # Fill remaining from eligible pool
    for hawk_id in eligible:
        if hawk_id not in squad and len(squad) < max_hawks:
            squad.append(hawk_id)

    # If squad is still under-filled, add core Hawks regardless of skill
    # (every mission needs fetch + extract at minimum)
    for hawk_id in CORE_PIPELINE[:2]:  # Scrapp + Extract
        if hawk_id not in squad and len(squad) < max_hawks:
            squad.append(hawk_id)

    return squad


def build_hawk_skill_mix(squad: List[str]) -> Dict[str, List[str]]:
    """Build audit snapshot of hawk_id → skills for mission record."""
    return {
        hawk_id: get_hawk_skills(hawk_id)
        for hawk_id in squad
    }


def build_heartbeat_skill_fields(
    primary_skill: str,
    secondary_skills: Optional[List[str]] = None,
    business_engine: str = "generic",
) -> Dict:
    """Build the skill fields for Live Look In heartbeat payload."""
    return {
        "primary_skill": primary_skill,
        "secondary_skills": secondary_skills or [],
        "business_engine": business_engine,
    }
