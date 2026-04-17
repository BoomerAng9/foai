"""Core diffusion loop for TTD-DR.

Orchestrates one cycle (think → test → decide → do → review) and the
multi-cycle runner (max_cycles + confidence threshold).

The per-phase functions are SCAFFOLD — each returns structurally-valid
placeholder data so the persistence + API layers can ship. LLM wiring is
a follow-up.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

import structlog

from ledger import append_cycle, append_fdh_entry, append_icar
from schemas import (
    ContextPack,
    PhaseDecide,
    PhaseDo,
    PhaseReview,
    PhaseTest,
    PhaseThink,
    Stage,
    TTD_DR_STAGES,
    TtdDrCycle,
)

logger = structlog.get_logger("ttd_dr.core")


DEFAULT_MAX_CYCLES = int(os.getenv("TTD_DR_MAX_CYCLES", "5"))
DEFAULT_CONFIDENCE_THRESHOLD = float(os.getenv("TTD_DR_CONFIDENCE_THRESHOLD", "0.85"))


class StageNotAllowedError(Exception):
    """TTD-DR only fires at RFP Response, SoW, Quote, or Five-Use-Cases stages."""


def _require_stage(stage: Stage) -> None:
    if stage not in TTD_DR_STAGES:
        raise StageNotAllowedError(
            f"TTD-DR does not fire at stage '{stage.value}'. "
            f"Allowed: {sorted(s.value for s in TTD_DR_STAGES)}"
        )


# ── Phase stubs ────────────────────────────────────────────────────
#
# Each phase returns schema-valid data. Real LLM calls land in a
# follow-up PR once Gemini 3.1 Flash is wired through @aims/spinner.


def _phase_think(context: ContextPack) -> PhaseThink:
    """Load Context Pack, emit task plan + MLE-STAR mapping."""
    plan = [
        f"Load Charter excerpt for {context.stage.value}",
        "Identify open CTQs and prior rationale",
        "Map tasks to MLE-STAR cells",
        "Emit ordered task list + confidence target",
    ]
    mle_star = {ctq: "STAR_primary" for ctq in context.ctqs[:5]}
    return PhaseThink(task_plan=plan, mle_star_mapping=mle_star, target_confidence=0.85)


def _phase_test(context: ContextPack, think: PhaseThink) -> PhaseTest:
    """Generate source-grounded assertions. Returns pre-score confidence."""
    assertions = [
        {
            "step": step,
            "verifier": f"artifact://{context.engagement_id}/{context.stage.value}",
            "status": "pending",
        }
        for step in think.task_plan
    ]
    # Pre-score confidence proxy: half of target, climbs each cycle.
    return PhaseTest(assertions=assertions, confidence_pre=0.4)


def _phase_decide(context: ContextPack, test: PhaseTest) -> PhaseDecide:
    """Option matrix → choose option satisfying governance + constraints."""
    options = [
        {
            "id": "conservative",
            "iir": {"impact": 0.6, "integration_fit": 0.85, "risk": 0.2},
            "knr": {"knowledge": 0.7, "network": 0.6, "reputation": 0.8},
            "cost_band": "low",
        },
        {
            "id": "differentiated",
            "iir": {"impact": 0.85, "integration_fit": 0.7, "risk": 0.35},
            "knr": {"knowledge": 0.75, "network": 0.6, "reputation": 0.7},
            "cost_band": "mid",
        },
        {
            "id": "experimental",
            "iir": {"impact": 0.95, "integration_fit": 0.5, "risk": 0.6},
            "knr": {"knowledge": 0.8, "network": 0.7, "reputation": 0.6},
            "cost_band": "high",
        },
    ]
    return PhaseDecide(
        options_considered=options,
        chosen_option_id="differentiated",
        rationale="Differentiated option maximizes weighted IIR within governance envelope.",
    )


def _phase_do(context: ContextPack, decide: PhaseDecide) -> PhaseDo:
    """Orchestrated tool calls. Schema-strict I/O. RAG before generation."""
    return PhaseDo(
        tool_calls=[
            {"tool": "rag_query", "args": {"topic": context.stage.value}, "status": "stub"},
            {"tool": "generative_step", "args": {"option": decide.chosen_option_id}, "status": "stub"},
        ],
        outputs={"draft_ready": False, "note": "phase stub — real tool wiring in follow-up"},
    )


def _phase_review(
    context: ContextPack, think: PhaseThink, test: PhaseTest, do: PhaseDo, cycle_index: int
) -> PhaseReview:
    """Verification battery. Pass/fail + confidence_post."""
    # Confidence climbs toward the target over cycles; real scoring comes
    # from a verification battery once tools are wired.
    confidence_post = min(0.95, test.confidence_pre + 0.2 + 0.1 * cycle_index)
    passed = confidence_post >= think.target_confidence

    fdh_opened = not passed and cycle_index >= DEFAULT_MAX_CYCLES - 1
    fdh_trigger = "low_confidence" if fdh_opened else None

    return PhaseReview(
        passed=passed,
        confidence_pre=test.confidence_pre,
        confidence_post=confidence_post,
        evidence=[f"cycle_{cycle_index}_stub"],
        fdh_ticket_opened=fdh_opened,
        fdh_trigger=fdh_trigger,
    )


# ── Single cycle ───────────────────────────────────────────────────

def run_single_cycle(context: ContextPack, cycle_index: int = 0) -> TtdDrCycle:
    """Run one k-step cycle for a given engagement+stage.

    Persists to `ledgers.ttd_dr_cycles` + appends an ICAR entry.
    Opens an FDH ticket if review reports `fdh_ticket_opened`.
    """
    _require_stage(context.stage)

    think = _phase_think(context)
    test = _phase_test(context, think)
    decide = _phase_decide(context, test)
    do = _phase_do(context, decide)
    review = _phase_review(context, think, test, do, cycle_index)

    cycle = TtdDrCycle(
        stage=context.stage,
        cycle_index=cycle_index,
        think=think,
        test=test,
        decide=decide,
        doResult=do,
        review=review,
        timestamp=datetime.now(timezone.utc),
    )

    # Persist.
    append_cycle(context.engagement_id, cycle)
    append_icar(
        engagement_id=context.engagement_id,
        stage=context.stage,
        intent=f"TTD-DR cycle {cycle_index} at {context.stage.value}",
        context=f"CTQs: {context.ctqs[:3]}",
        action=f"Think→Test→Decide→Do→Review; chose option '{decide.chosen_option_id}'",
        result=f"confidence_post={review.confidence_post:.2f}; passed={review.passed}",
        confidence=review.confidence_post,
    )
    if review.fdh_ticket_opened:
        append_fdh_entry(
            engagement_id=context.engagement_id,
            stage=context.stage,
            trigger=review.fdh_trigger or "low_confidence",
            foster=f"Cycle {cycle_index} exhausted without reaching threshold",
            develop=f"Candidate options: {[o['id'] for o in decide.options_considered]}",
            hone="Escalate to NTNTN HITL + re-plan",
            resolution="awaiting NTNTN review",
        )
    return cycle


# ── Multi-cycle runner ─────────────────────────────────────────────

def run_loop(
    context: ContextPack,
    max_cycles: int | None = None,
    confidence_threshold: float | None = None,
) -> tuple[list[TtdDrCycle], bool, float]:
    """Run cycles until converged or max_cycles. Returns (cycles, converged, final_conf)."""
    _require_stage(context.stage)
    cap = max_cycles or DEFAULT_MAX_CYCLES
    threshold = confidence_threshold or DEFAULT_CONFIDENCE_THRESHOLD

    cycles: list[TtdDrCycle] = []
    final_conf = 0.0
    converged = False
    for k in range(cap):
        cycle = run_single_cycle(context, cycle_index=k)
        cycles.append(cycle)
        final_conf = cycle.review.confidence_post
        if final_conf >= threshold:
            converged = True
            break

    return cycles, converged, final_conf
