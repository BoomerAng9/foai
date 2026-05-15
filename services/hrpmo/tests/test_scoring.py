"""Tests for the V.I.B.E. / KPI / Org Fit scoring engine."""
from __future__ import annotations

from services.hrpmo import scoring


def _event(action: str, **payload) -> dict:
    return {
        "event_id": "x",
        "agent": "Test_Agent",
        "action": action,
        "payload": payload,
    }


# ─── V.I.B.E. sub-scores ──────────────────────────────────────────────────


def test_value_pure_success() -> None:
    events = [_event("a", status="success") for _ in range(5)]
    assert scoring._value_score(events) == 1.0


def test_value_pure_failure() -> None:
    events = [_event("a", status="failure") for _ in range(5)]
    assert scoring._value_score(events) == 0.0


def test_value_no_signal_returns_half() -> None:
    events = [_event("a", note="neutral") for _ in range(3)]
    assert scoring._value_score(events) == 0.5


def test_initiative_all_proactive() -> None:
    events = [_event("a", trigger_source="cron") for _ in range(4)]
    assert scoring._initiative_score(events) == 1.0


def test_initiative_all_reactive() -> None:
    events = [_event("a", trigger_source="user_request") for _ in range(4)]
    assert scoring._initiative_score(events) == 0.0


def test_behavior_clean() -> None:
    events = [_event("a", status="success") for _ in range(5)]
    assert scoring._behavior_score(events) == 1.0


def test_behavior_with_violations() -> None:
    events = [
        _event("a", status="success"),
        _event("b", nemoclaw_verdict="blocked"),
        _event("c", constraint_violated=True),
    ]
    # 1.0 - 0.1 - 0.1 = 0.8
    assert scoring._behavior_score(events) == pytest_approx(0.8)


def test_excellence_high_quality() -> None:
    events = [_event("a", quality_score=0.9) for _ in range(4)]
    assert scoring._excellence_score(events) == 1.0


def test_excellence_low_quality() -> None:
    events = [_event("a", quality_score=0.4) for _ in range(4)]
    assert scoring._excellence_score(events) == 0.0


def test_excellence_no_scores_returns_half() -> None:
    events = [_event("a") for _ in range(3)]
    assert scoring._excellence_score(events) == 0.5


# ─── KPI hit rate ─────────────────────────────────────────────────────────


def test_kpi_no_metrics_full_credit() -> None:
    assert scoring.kpi_hit_rate([], []) == 1.0


def test_kpi_hits_one_metric() -> None:
    events = [
        _event("publish", status="success", kpi_hit="weekly_publish_count"),
        _event("publish", status="success", kpi_hit="weekly_publish_count"),
    ]
    rate = scoring.kpi_hit_rate(
        events, ["weekly_publish_count", "engagement_rate"]
    )
    # 1 of 2 metrics hit
    assert rate == 0.5


def test_kpi_list_value_counts() -> None:
    events = [
        _event(
            "do",
            status="success",
            kpi_hit=["a", "b"],
        )
    ]
    assert scoring.kpi_hit_rate(events, ["a", "b", "c"]) == pytest_approx(2 / 3)


def test_kpi_failure_doesnt_count() -> None:
    events = [_event("do", status="failure", kpi_hit="m1")]
    assert scoring.kpi_hit_rate(events, ["m1"]) == 0.0


# ─── Org fit ──────────────────────────────────────────────────────────────


def test_org_fit_no_events_neutral() -> None:
    assert scoring.org_fit_score([], "render assets for brand work", []) == 0.5


def test_org_fit_alignment_high() -> None:
    events = [
        _event("render_asset"),
        _event("brand_asset_generated"),
        _event("render_asset"),
    ]
    score = scoring.org_fit_score(
        events,
        mission="Render and produce brand assets",
        constraints=[],
    )
    assert score > 0.5


def test_org_fit_violations_penalize() -> None:
    events = [
        _event("render_asset", constraint_violated=True),
        _event("render_asset", constraint_violated=True),
    ]
    score = scoring.org_fit_score(
        events, mission="Render assets", constraints=[]
    )
    assert score == 0.0


# ─── Full score_agent ─────────────────────────────────────────────────────


def test_score_agent_flagged_low_vibe() -> None:
    events = [_event("a", status="failure") for _ in range(5)]
    s = scoring.score_agent(
        "Test_Agent",
        events,
        success_metrics=["m1"],
        mission="do things",
        constraints=[],
        vibe_threshold=0.7,
        kpi_threshold=0.5,
    )
    assert s.flagged is True
    assert any("vibe" in r for r in s.flagged_reasons)


def test_score_agent_flagged_low_kpi() -> None:
    events = [_event("idle", status="success")]
    s = scoring.score_agent(
        "Test_Agent",
        events,
        success_metrics=["m1", "m2", "m3"],
        mission="idle",
        constraints=[],
        vibe_threshold=0.5,
        kpi_threshold=0.5,
    )
    assert s.flagged is True
    assert any("kpi_hit_rate" in r for r in s.flagged_reasons)


def test_score_agent_not_flagged_when_above_thresholds() -> None:
    events = [
        _event("publish", status="success", trigger_source="cron",
               quality_score=0.9, kpi_hit="m1"),
        _event("publish", status="success", trigger_source="cron",
               quality_score=0.85, kpi_hit="m1"),
    ]
    s = scoring.score_agent(
        "Test_Agent",
        events,
        success_metrics=["m1"],
        mission="publish content",
        constraints=[],
        vibe_threshold=0.7,
        kpi_threshold=0.5,
    )
    assert s.flagged is False
    assert s.flagged_reasons == []


def test_summarize_action_counts() -> None:
    events = [
        _event("a"), _event("a"), _event("b"), _event("c"), _event("c"), _event("c"),
    ]
    counts = scoring.summarize_action_counts(events)
    assert counts == {"a": 2, "b": 1, "c": 3}


# tiny float-approx helper to avoid extra deps in the runtime
def pytest_approx(target: float, tol: float = 1e-6):
    class _Approx:
        def __init__(self, t: float, tol: float):
            self.t = t
            self.tol = tol
        def __eq__(self, other):
            return abs(other - self.t) < self.tol
        def __repr__(self):
            return f"<approx {self.t} ± {self.tol}>"
    return _Approx(target, tol)
