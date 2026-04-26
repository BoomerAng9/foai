"""Pytest suite for the kit's `scripts/model_router.py decide_route` function.

Run from repo root: `python -m pytest tests/ -v`.

Tests focus on edge cases of routing + approval-required logic that aren't
covered by the kit's `one_direction_smoke_test.py`.
"""
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from model_router import decide_route  # noqa: E402


def test_low_risk_nvidia_routes_to_nvidia_no_approval():
    out = decide_route({"task_type": "draft_caption", "risk_tags": []})
    assert out["route"] == "nvidia"
    assert out["approval_required"] is False
    assert out["execution_allowed"] is False


def test_feynman_task_type_routes_to_feynman():
    out = decide_route({"task_type": "supplier_due_diligence", "risk_tags": []})
    assert out["route"] == "feynman"


def test_feynman_with_owner_risk_tag_still_feynman_but_approval_required():
    out = decide_route({"task_type": "claim_verification", "risk_tags": ["certification"]})
    assert out["route"] == "feynman"
    assert out["approval_required"] is True


def test_unknown_task_type_falls_through_to_premium_review():
    out = decide_route({"task_type": "totally_unknown_thing", "risk_tags": []})
    assert out["route"] == "premium_review"
    assert out["approval_required"] is True


def test_nvidia_task_type_with_money_risk_tag_kicks_to_owner():
    out = decide_route({"task_type": "draft_email", "risk_tags": ["money"]})
    assert out["route"] == "owner"
    assert out["approval_required"] is True


def test_explicit_approval_required_flag_routes_to_owner():
    out = decide_route(
        {"task_type": "draft_caption", "risk_tags": [], "approval_required": True}
    )
    assert out["route"] == "owner"


def test_blocked_risk_tag_prevents_nvidia_route():
    out = decide_route({"task_type": "draft_email", "risk_tags": ["customer_payment_data"]})
    assert out["route"] != "nvidia"


def test_multiple_owner_risk_tags_still_routes_owner():
    out = decide_route(
        {"task_type": "draft_caption", "risk_tags": ["money", "certification", "legal"]}
    )
    assert out["route"] == "owner"
    assert out["approval_required"] is True


def test_missing_task_type_safe_default():
    out = decide_route({"risk_tags": []})
    assert out["route"] == "premium_review"


def test_missing_risk_tags_safe_default():
    out = decide_route({"task_type": "draft_caption"})
    assert out["route"] == "nvidia"


def test_decision_always_includes_required_fields():
    out = decide_route({"task_type": "draft_caption", "risk_tags": []})
    for key in ("route", "reason", "approval_required", "execution_allowed"):
        assert key in out
    assert isinstance(out["approval_required"], bool)
    assert isinstance(out["execution_allowed"], bool)


def test_execution_allowed_always_false_at_routing_time():
    """Execution gate is never granted at routing time; openclaw decides post-approval."""
    for tt in ["draft_caption", "supplier_due_diligence", "totally_unknown_thing"]:
        out = decide_route({"task_type": tt, "risk_tags": []})
        assert out["execution_allowed"] is False
