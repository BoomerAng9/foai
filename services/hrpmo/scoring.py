"""V.I.B.E. + KPI hit-rate + Org Fit Index scoring.

All three are in [0, 1]. Combined verdict is below_threshold = either V.I.B.E.
below settings.vibe_threshold OR KPI hit-rate below settings.kpi_threshold.

Scoring is intentionally simple and explainable — the HRPMO loop has to
defend its conclusions to ACHEEVY (and ultimately the owner) on every
cycle. Opaque ML scoring would create a black-box review pipeline that
violates the spirit of the audit trail.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import Any


@dataclass
class AgentScore:
    agent: str
    vibe: float                  # 0–1, weighted blend of V/I/B/E
    kpi_hit_rate: float          # 0–1, fraction of success_metrics hit this period
    org_fit: float               # 0–1, behavior-to-mission alignment
    event_count: int             # raw activity volume for the period
    flagged: bool                # below_threshold = True
    flagged_reasons: list[str] = field(default_factory=list)

    def to_row(self) -> dict[str, Any]:
        return {
            "agent": self.agent,
            "vibe": round(self.vibe, 3),
            "kpi_hit_rate": round(self.kpi_hit_rate, 3),
            "org_fit": round(self.org_fit, 3),
            "event_count": self.event_count,
            "flagged": self.flagged,
            "flagged_reasons": self.flagged_reasons,
        }


# ─── V.I.B.E. sub-scores ─────────────────────────────────────────────────


def _value_score(events: list[dict]) -> float:
    """V = success / (success + failure) rate, with a 0.5 floor for low N."""
    succ = sum(1 for e in events if _is_success(e))
    fail = sum(1 for e in events if _is_failure(e))
    total = succ + fail
    if total == 0:
        return 0.5
    return succ / total


def _initiative_score(events: list[dict]) -> float:
    """I = fraction of events that were unsolicited (auto-triggered, scheduled,
    proactive) vs reactive. Looks for `trigger_source` in payload — 'cron',
    'heartbeat', 'autonomous', 'opportunity_scout' count as initiative.
    """
    if not events:
        return 0.5
    proactive_triggers = {"cron", "heartbeat", "autonomous", "opportunity_scout", "scheduled"}
    proactive = 0
    for e in events:
        payload = e.get("payload") or {}
        src = (payload.get("trigger_source") or "").lower()
        if src in proactive_triggers:
            proactive += 1
    return proactive / len(events)


def _behavior_score(events: list[dict]) -> float:
    """B = absence of constraint violations + NemoClaw blocks.

    Each event with `nemoclaw_verdict=blocked` or `constraint_violated=true`
    in payload costs 0.1 (clamped to [0, 1]).
    """
    score = 1.0
    for e in events:
        payload = e.get("payload") or {}
        if payload.get("nemoclaw_verdict") == "blocked":
            score -= 0.1
        if payload.get("constraint_violated"):
            score -= 0.1
    return max(0.0, score)


def _excellence_score(events: list[dict]) -> float:
    """E = fraction of events with `quality_score` >= 0.8 in payload.

    Quality scores come from Boomer_Quality reviews + Hermes audit reports.
    If no events have quality_score, returns 0.5 (no signal).
    """
    scored = [e for e in events if isinstance((e.get("payload") or {}).get("quality_score"), (int, float))]
    if not scored:
        return 0.5
    high = sum(1 for e in scored if e["payload"]["quality_score"] >= 0.8)
    return high / len(scored)


def _is_success(event: dict) -> bool:
    payload = event.get("payload") or {}
    if payload.get("status") in {"success", "completed", "ok", "delivered"}:
        return True
    if (event.get("action") or "").endswith("_succeeded"):
        return True
    return False


def _is_failure(event: dict) -> bool:
    payload = event.get("payload") or {}
    if payload.get("status") in {"failure", "failed", "error"}:
        return True
    if (event.get("action") or "").endswith("_failed"):
        return True
    return False


def vibe_score(events: list[dict]) -> float:
    """Blended V.I.B.E. score — equal-weighted average of the four sub-scores."""
    if not events:
        return 0.5  # No signal; don't penalize idle agents
    parts = [
        _value_score(events),
        _initiative_score(events),
        _behavior_score(events),
        _excellence_score(events),
    ]
    return sum(parts) / len(parts)


# ─── KPI hit-rate ────────────────────────────────────────────────────────


def kpi_hit_rate(
    events: list[dict],
    success_metrics: list[str],
) -> float:
    """For each declared success_metric, did the period produce at least one
    event tagged with that metric (in payload.kpi_hit) and status=success?

    Returns the fraction of metrics covered. If success_metrics is empty,
    returns 1.0 (no expectations).
    """
    if not success_metrics:
        return 1.0
    hit_metrics = set()
    for e in events:
        if not _is_success(e):
            continue
        payload = e.get("payload") or {}
        kpi = payload.get("kpi_hit")
        if isinstance(kpi, str) and kpi in success_metrics:
            hit_metrics.add(kpi)
        elif isinstance(kpi, list):
            hit_metrics.update(k for k in kpi if k in success_metrics)
    return len(hit_metrics) / len(success_metrics)


# ─── Org Fit Index ───────────────────────────────────────────────────────


def org_fit_score(
    events: list[dict],
    mission: str,
    constraints: list[str],
) -> float:
    """Org Fit = (action-mission keyword overlap) × (1 - constraint violation rate).

    Lightweight heuristic. Coaching recipes can recommend strengthening
    mission alignment; constraint violations should already trigger NemoClaw,
    so this is a defense-in-depth measure.
    """
    if not events:
        return 0.5

    # Mission alignment — fraction of events whose action contains any of the
    # mission's noun-y keywords (length >= 5, after lowercase + tokenize).
    mission_tokens = {
        t.lower()
        for t in mission.split()
        if len(t) >= 5 and t.isalpha()
    }
    if not mission_tokens:
        alignment = 0.5
    else:
        aligned = 0
        for e in events:
            action_words = (e.get("action") or "").lower().split("_")
            if any(w in mission_tokens for w in action_words):
                aligned += 1
        alignment = aligned / len(events)

    # Constraint violations
    violations = 0
    for e in events:
        payload = e.get("payload") or {}
        if payload.get("constraint_violated"):
            violations += 1
    violation_rate = violations / len(events)

    return max(0.0, alignment * (1 - violation_rate))


# ─── Top-level scorer ────────────────────────────────────────────────────


def score_agent(
    agent_name: str,
    events: list[dict],
    *,
    success_metrics: list[str],
    mission: str,
    constraints: list[str],
    vibe_threshold: float,
    kpi_threshold: float,
) -> AgentScore:
    v = vibe_score(events)
    k = kpi_hit_rate(events, success_metrics)
    o = org_fit_score(events, mission, constraints)

    reasons = []
    if v < vibe_threshold:
        reasons.append(f"vibe {v:.2f} < threshold {vibe_threshold}")
    if k < kpi_threshold:
        reasons.append(f"kpi_hit_rate {k:.2f} < threshold {kpi_threshold}")
    flagged = bool(reasons)

    return AgentScore(
        agent=agent_name,
        vibe=v,
        kpi_hit_rate=k,
        org_fit=o,
        event_count=len(events),
        flagged=flagged,
        flagged_reasons=reasons,
    )


# ─── Helpers ──────────────────────────────────────────────────────────────


def summarize_action_counts(events: list[dict]) -> dict[str, int]:
    """Used by coaching recipes — what was this agent actually doing?"""
    return dict(Counter(e.get("action") or "unknown" for e in events))
