"""
Chicken Hawk skill-based Hawk selection.

Uses sqwaadrun_hawks.json as the single source of truth for
Hawk -> ACHEEVY Skill mappings. Selects squad members based on
primary_skill affinity, ensuring core pipeline stages are covered.
"""
import json
from pathlib import Path
from typing import Optional

ACHEEVY_SKILLS = frozenset({
    "MARKETING", "TECH", "SALES", "OPERATIONS", "FINANCE",
    "TALENT", "PARTNERSHIPS", "PRODUCT", "NARRATIVE", "CRISIS",
})

CORE_PIPELINE_HAWKS = [
    "Lil_Scrapp_Hawk",    # fetch
    "Lil_Extract_Hawk",   # structured extraction
    "Lil_Diff_Hawk",      # verification
    "Lil_Pipe_Hawk",      # export
]

MAX_SQUAD_SIZE = 6

_registry_cache: Optional[list[dict]] = None


def load_hawk_registry() -> list[dict]:
    global _registry_cache
    if _registry_cache is not None:
        return _registry_cache
    registry_path = Path(__file__).parent / "sqwaadrun_hawks.json"
    with open(registry_path) as f:
        _registry_cache = json.load(f)
    return _registry_cache


def select_hawks_for_mission(
    primary_skill: str,
    target_count: int = 1,
    return_skill_mix: bool = False,
) -> list[str] | tuple[list[str], dict[str, list[str]]]:
    if primary_skill not in ACHEEVY_SKILLS:
        return ([], {}) if return_skill_mix else []

    registry = load_hawk_registry()
    registry_map = {h["id"]: h for h in registry}

    eligible = [
        h["id"] for h in registry
        if primary_skill in h["acheevy_skills"]
    ]

    squad: list[str] = []

    # 1. Add core pipeline hawks that match the skill
    for hawk_id in CORE_PIPELINE_HAWKS:
        if hawk_id in registry_map and primary_skill in registry_map[hawk_id]["acheevy_skills"]:
            squad.append(hawk_id)

    # 2. Fill remaining slots from eligible pool
    for hawk_id in eligible:
        if hawk_id not in squad and len(squad) < MAX_SQUAD_SIZE:
            squad.append(hawk_id)

    if return_skill_mix:
        skill_mix = {
            hawk_id: registry_map[hawk_id]["acheevy_skills"]
            for hawk_id in squad
        }
        return squad, skill_mix

    return squad
