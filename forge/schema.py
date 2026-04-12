"""Forge Harness Pydantic schema. Enforces Smelter OS grammar at load time."""
from __future__ import annotations
from enum import Enum
from typing import Any, Literal
from pydantic import BaseModel, Field, model_validator


class IngotTier(str, Enum):
    RAW = "Raw"
    REFINED = "Refined"
    FORGED = "Forged"
    HOLO = "Holo"
    BAMR = "BAMR"


class GateName(str, Enum):
    PYTEST = "pytest"
    MYPY = "mypy"
    RUFF = "ruff"
    PIP_AUDIT = "pip-audit"
    INTEGRATION = "integration"
    LEANSTRAL = "leanstral"


HawkName = Literal[
    "Lil_Plan_Hawk", "Lil_Worktree_Hawk", "Lil_Exec_Hawk",
    "Lil_Gate_Hawk", "Lil_Chronicle_Hawk", "Buildsmith",
]


class Step(BaseModel):
    id: str
    hawk: HawkName
    action: str | None = None
    gates: list[GateName] = Field(default_factory=list)
    adapter: str | None = None
    branch: str | None = None
    auto_prune_on_exit: bool = False
    iterate_until_gate_passes: bool = False
    max_iterations: int = 5
    from_tier: IngotTier | None = None
    to_tier: IngotTier | None = None
    emit: list[Literal["charter", "ledger"]] = Field(default_factory=list)
    when: str | None = None
    on_failure_return_to: str | None = None


class WorkflowInput(BaseModel):
    type: str
    required: bool = False
    default: Any = None


class Workflow(BaseModel):
    id: str
    version: str
    owner: Literal["Buildsmith", "Code_Ang"]
    description: str
    inputs: dict[str, WorkflowInput] = Field(default_factory=dict)
    steps: list[Step]

    @model_validator(mode="after")
    def enforce_smelter_grammar(self) -> "Workflow":
        ids = [s.id for s in self.steps]
        if len(set(ids)) != len(ids):
            raise ValueError(f"Workflow {self.id}: duplicate step ids")
        has_gate = any(s.hawk == "Lil_Gate_Hawk" for s in self.steps)
        has_chronicle = any(s.hawk == "Lil_Chronicle_Hawk" for s in self.steps)
        if not has_gate:
            raise ValueError(f"Workflow {self.id}: MUST have a Lil_Gate_Hawk step (five-gate)")
        if not has_chronicle:
            raise ValueError(f"Workflow {self.id}: MUST end with a Lil_Chronicle_Hawk step")
        gate_idx = next(i for i, s in enumerate(self.steps) if s.hawk == "Lil_Gate_Hawk")
        for i, s in enumerate(self.steps):
            if s.action == "promote_ingot" and i < gate_idx:
                raise ValueError(f"Workflow {self.id}: promote_ingot must come AFTER gate step")
            if s.action == "fire_bamaram_event" and s.to_tier and s.to_tier not in (
                IngotTier.FORGED, IngotTier.HOLO, IngotTier.BAMR
            ):
                raise ValueError(f"Workflow {self.id}: BAMARAM only valid for Forged+ tier")
        return self


class RunState(BaseModel):
    run_id: str
    workflow_id: str
    status: Literal["pending", "running", "passed", "failed", "aborted"]
    current_step: str | None = None
    ingot_tier: IngotTier = IngotTier.RAW
    worktree_path: str | None = None
    iterations: dict[str, int] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)
