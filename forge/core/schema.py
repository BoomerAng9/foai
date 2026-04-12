"""Forge schema — Pydantic v2 models for workflows, steps, gates, ingots, and runs."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from enum import StrEnum
from typing import Any, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class StepType(StrEnum):
    """Types of steps in a Forge workflow."""

    plan = "plan"
    isolate = "isolate"
    implement = "implement"
    gate = "gate"
    promote = "promote"
    chronicle = "chronicle"
    bamaram = "bamaram"


class IngestTier(StrEnum):
    """Ingot maturity tiers."""

    Raw = "Raw"
    Refined = "Refined"
    Forged = "Forged"


class GateType(StrEnum):
    """Available gate validation types."""

    pytest = "pytest"
    mypy = "mypy"
    ruff = "ruff"
    pip_audit = "pip-audit"
    integration = "integration"


class RunState(StrEnum):
    """State machine states for a Forge run."""

    pending = "pending"
    running = "running"
    gate_failed = "gate_failed"
    completed = "completed"
    aborted = "aborted"


# ---------------------------------------------------------------------------
# Step & Workflow Models
# ---------------------------------------------------------------------------

# Known adapter names (non-env-var references).
KNOWN_ADAPTERS = frozenset({"claw_code", "codex_cli", "gemini_cli"})


class StepDefinition(BaseModel):
    """A single step in a Forge workflow."""

    id: str = Field(..., min_length=1, description="Unique step identifier within the workflow")
    hawk: str = Field(..., min_length=1, description="Assigned hawk or Boomer_Ang")
    action: Optional[str] = Field(default=None, description="Action to execute")
    gates: Optional[list[GateType]] = Field(default=None, description="Gate types to enforce")
    adapter: Optional[str] = Field(default=None, description="MoEx adapter name or $ENV_VAR ref")
    on_failure: Optional[str] = Field(default=None, description="Step to return to on failure")
    when: Optional[str] = Field(default=None, description="Conditional expression for this step")
    emit: Optional[list[str]] = Field(default=None, description="Artifacts to emit")
    output: Optional[str] = Field(default=None, description="Named output key")
    iterate_until_gate_passes: Optional[bool] = Field(
        default=None, description="Loop until gates pass"
    )
    max_iterations: Optional[int] = Field(
        default=None, ge=1, le=20, description="Max iteration attempts"
    )
    branch: Optional[str] = Field(default=None, description="Branch name template")
    auto_prune_on_exit: Optional[bool] = Field(
        default=None, description="Auto-prune worktree on run exit"
    )
    from_tier: Optional[IngestTier] = Field(default=None, description="Source ingot tier")
    to_tier: Optional[IngestTier] = Field(default=None, description="Target ingot tier")

    def inferred_type(self) -> StepType:
        """Infer the step type from the step's id and fields."""
        if self.gates is not None:
            return StepType.gate
        if self.id == "bamaram" or (self.action and "bamaram" in self.action):
            return StepType.bamaram
        if self.emit is not None:
            return StepType.chronicle
        if self.from_tier is not None or self.to_tier is not None:
            return StepType.promote
        if self.branch is not None or self.auto_prune_on_exit is not None:
            return StepType.isolate
        if self.iterate_until_gate_passes:
            return StepType.implement
        if self.action and "plan" in self.id:
            return StepType.plan
        return StepType.implement

    def validate_adapter(self) -> None:
        """Validate that adapter field is a known name or env-var reference."""
        if self.adapter is None:
            return
        if self.adapter.startswith("$"):
            # Env-var reference like ${FORGE_ADAPTER} or $FORGE_ADAPTER
            pattern = r"^\$\{?[A-Z_][A-Z0-9_]*\}?$"
            if not re.match(pattern, self.adapter):
                msg = f"Invalid adapter env-var reference: {self.adapter}"
                raise ValueError(msg)
        elif self.adapter not in KNOWN_ADAPTERS:
            msg = f"Unknown adapter: {self.adapter}. Known: {sorted(KNOWN_ADAPTERS)}"
            raise ValueError(msg)


class WorkflowInput(BaseModel):
    """Input parameter definition for a workflow."""

    name: str = Field(default="", description="Input parameter name (set from dict key)")
    type: str = Field(..., description="Type of the input (string, enum, etc.)")
    required: bool = Field(default=True, description="Whether this input is required")
    default: Optional[str] = Field(default=None, description="Default value")
    values: Optional[list[str]] = Field(
        default=None, description="Allowed values for enum types"
    )


class Workflow(BaseModel):
    """A complete Forge workflow definition."""

    id: str = Field(..., min_length=1, description="Unique workflow identifier")
    version: float | str = Field(..., description="Workflow version")
    owner: str = Field(..., min_length=1, description="Owning Boomer_Ang or hawk")
    description: str = Field(default="", description="Human-readable description")
    inputs: dict[str, WorkflowInput] = Field(
        default_factory=dict, description="Named input parameters"
    )
    steps: list[StepDefinition] = Field(
        ..., min_length=1, description="Ordered list of workflow steps"
    )

    @model_validator(mode="after")
    def validate_workflow_rules(self) -> "Workflow":
        """Enforce Forge workflow schema rules.

        Rules:
        1. Every workflow MUST have a gate step before any promote step.
        2. Every workflow MUST end with a chronicle step (bamaram may follow).
        3. bamaram step is only valid when paired with a promote step.
        4. Adapter fields must be valid references.
        """
        # Validate each step's adapter
        for step in self.steps:
            step.validate_adapter()

        # Rule 1: gate before promote
        has_gate = False
        for step in self.steps:
            step_type = step.inferred_type()
            if step_type == StepType.gate:
                has_gate = True
            if step_type == StepType.promote and not has_gate:
                msg = (
                    f"Workflow '{self.id}': promote step '{step.id}' must be preceded "
                    f"by a gate step"
                )
                raise ValueError(msg)

        # Rule 2: last step (ignoring bamaram) must be chronicle
        non_bamaram_steps = [
            s for s in self.steps if s.inferred_type() != StepType.bamaram
        ]
        if non_bamaram_steps:
            last_step = non_bamaram_steps[-1]
            if last_step.inferred_type() != StepType.chronicle:
                msg = (
                    f"Workflow '{self.id}': last non-bamaram step must be chronicle, "
                    f"got '{last_step.id}' ({last_step.inferred_type()})"
                )
                raise ValueError(msg)

        # Rule 3: bamaram only valid when promote step exists
        has_promote = any(
            s.inferred_type() == StepType.promote for s in self.steps
        )
        has_bamaram = any(
            s.inferred_type() == StepType.bamaram for s in self.steps
        )
        if has_bamaram and not has_promote:
            msg = (
                f"Workflow '{self.id}': bamaram step requires a promote step in the workflow"
            )
            raise ValueError(msg)

        return self


# ---------------------------------------------------------------------------
# Ingot Record
# ---------------------------------------------------------------------------


class IngotRecord(BaseModel):
    """Tracks an Ingot's lifecycle through tiers."""

    id: UUID = Field(default_factory=uuid4, description="Unique ingot identifier")
    workflow_id: str = Field(..., description="Source workflow that produced this ingot")
    run_id: UUID = Field(..., description="Run that produced this ingot")
    tier: IngestTier = Field(default=IngestTier.Raw, description="Current ingot tier")
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))
    promoted_at: Optional[datetime] = Field(default=None, description="Last promotion timestamp")
    artifacts: dict[str, Any] = Field(
        default_factory=dict, description="Artifact paths and metadata"
    )


# ---------------------------------------------------------------------------
# Run State
# ---------------------------------------------------------------------------


class ForgeRun(BaseModel):
    """Tracks the execution state of a single Forge workflow run."""

    id: UUID = Field(default_factory=uuid4, description="Unique run identifier")
    workflow_id: str = Field(..., description="Workflow being executed")
    task_id: str = Field(..., description="External task/RFP fragment identifier")
    state: RunState = Field(default=RunState.pending, description="Current run state")
    current_step_index: int = Field(default=0, description="Index of the current step")
    inputs: dict[str, Any] = Field(default_factory=dict, description="Workflow inputs")
    outputs: dict[str, Any] = Field(default_factory=dict, description="Step outputs")
    started_at: Optional[datetime] = Field(default=None, description="Run start time")
    completed_at: Optional[datetime] = Field(default=None, description="Run completion time")
    error: Optional[str] = Field(default=None, description="Error message if aborted")
