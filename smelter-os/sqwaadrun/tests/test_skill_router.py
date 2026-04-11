import pytest
from sqwaadrun.skill_router import (
    load_hawk_registry,
    select_hawks_for_mission,
    ACHEEVY_SKILLS,
)


def test_acheevy_skills_enum_has_10_values():
    assert len(ACHEEVY_SKILLS) == 10
    assert "MARKETING" in ACHEEVY_SKILLS
    assert "TECH" in ACHEEVY_SKILLS
    assert "SALES" in ACHEEVY_SKILLS
    assert "OPERATIONS" in ACHEEVY_SKILLS
    assert "FINANCE" in ACHEEVY_SKILLS
    assert "TALENT" in ACHEEVY_SKILLS
    assert "PARTNERSHIPS" in ACHEEVY_SKILLS
    assert "PRODUCT" in ACHEEVY_SKILLS
    assert "NARRATIVE" in ACHEEVY_SKILLS
    assert "CRISIS" in ACHEEVY_SKILLS


def test_load_hawk_registry_returns_17_hawks():
    registry = load_hawk_registry()
    assert len(registry) == 17


def test_load_hawk_registry_each_hawk_has_acheevy_skills():
    registry = load_hawk_registry()
    for hawk in registry:
        assert "acheevy_skills" in hawk
        assert len(hawk["acheevy_skills"]) >= 2
        for skill in hawk["acheevy_skills"]:
            assert skill in ACHEEVY_SKILLS


def test_select_hawks_for_mission_returns_max_6():
    squad = select_hawks_for_mission("MARKETING", target_count=50)
    assert len(squad) <= 6


def test_select_hawks_for_mission_includes_core_when_matching():
    squad = select_hawks_for_mission("OPERATIONS", target_count=10)
    assert "Lil_Diff_Hawk" in squad


def test_select_hawks_for_mission_only_includes_skill_matching():
    squad = select_hawks_for_mission("FINANCE", target_count=10)
    registry = load_hawk_registry()
    registry_map = {h["id"]: h for h in registry}
    for hawk_id in squad:
        assert "FINANCE" in registry_map[hawk_id]["acheevy_skills"]


def test_select_hawks_for_mission_invalid_skill_returns_empty():
    squad = select_hawks_for_mission("INVALID_SKILL", target_count=10)
    assert squad == []


def test_select_hawks_returns_skill_mix_snapshot():
    squad, skill_mix = select_hawks_for_mission(
        "SALES", target_count=10, return_skill_mix=True
    )
    assert isinstance(skill_mix, dict)
    for hawk_id in squad:
        assert hawk_id in skill_mix
        assert isinstance(skill_mix[hawk_id], list)
