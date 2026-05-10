"""Pydantic models for TTD-DR.

Must stay aligned with `@aims/contracts/ledger-schema` `TtdDrCycle` and
`IcarEntry` shapes — Ledger rows are read by the TypeScript world.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class Stage(str, Enum):
    rfp_intake = "rfp_intake"
    rfp_response = "rfp_response"
    commercial_proposal = "commercial_proposal"
    technical_sow = "technical_sow"
    formal_quote = "formal_quote"
    purchase_order = "purchase_order"
    assignment_log = "assignment_log"
    qa_security = "qa_security"
    delivery_receipt = "delivery_receipt"
    completion_summary = "completion_summary"


TTD_DR_STAGES: set[Stage] = {
    Stage.rfp_response,
    Stage.technical_sow,
    Stage.formal_quote,
    Stage.purchase_order,
}


class ContextPack(BaseModel):
    """Subset of the Charter + prior Completion Summaries a cycle loads."""

    engagement_id: str
    stage: Stage
    charter_excerpt: dict[str, Any] = Field(default_factory=dict)
    prior_completions: list[dict[str, Any]] = Field(default_factory=list)
    policies: list[str] = Field(default_factory=list)
    ctqs: list[str] = Field(default_factory=list)


class PhaseThink(BaseModel):
    task_plan: list[str]
    mle_star_mapping: dict[str, str] = Field(default_factory=dict)
    target_confidence: float = 0.85


class PhaseTest(BaseModel):
    assertions: list[dict[str, Any]]
    confidence_pre: float = Field(ge=0.0, le=1.0)


class PhaseDecide(BaseModel):
    options_considered: list[dict[str, Any]]
    chosen_option_id: str
    rationale: str


class PhaseDo(BaseModel):
    tool_calls: list[dict[str, Any]]
    outputs: dict[str, Any] = Field(default_factory=dict)


class PhaseReview(BaseModel):
    passed: bool
    confidence_pre: float = Field(ge=0.0, le=1.0)
    confidence_post: float = Field(ge=0.0, le=1.0)
    evidence: list[str] = Field(default_factory=list)
    fdh_ticket_opened: bool = False
    fdh_trigger: str | None = None

    @field_validator("fdh_trigger")
    @classmethod
    def _trigger_only_when_ticket_opened(cls, v: str | None, info: Any) -> str | None:
        if info.data.get("fdh_ticket_opened") and not v:
            raise ValueError("fdh_trigger required when fdh_ticket_opened is True")
        return v


class TtdDrCycle(BaseModel):
    """One k-step cycle. Persisted into ledgers.ttd_dr_cycles (JSONB array)."""

    stage: Stage
    cycle_index: int = Field(ge=0)
    think: PhaseThink
    test: PhaseTest
    decide: PhaseDecide
    do_result: PhaseDo = Field(alias="doResult")
    review: PhaseReview
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}


class CycleRequest(BaseModel):
    engagement_id: str
    stage: Stage
    context_pack: ContextPack
    cycle_index: int = 0


class CycleResponse(BaseModel):
    engagement_id: str
    stage: Stage
    cycle: TtdDrCycle
    continue_loop: bool
    reason: str


class RunRequest(BaseModel):
    engagement_id: str
    stage: Stage
    context_pack: ContextPack
    max_cycles: int | None = None
    confidence_threshold: float | None = None


class RunResponse(BaseModel):
    engagement_id: str
    stage: Stage
    cycles_executed: int
    cycles: list[TtdDrCycle]
    converged: bool
    final_confidence: float
