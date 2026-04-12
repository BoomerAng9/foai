"""Tests for forge.core.schema — Pydantic models and workflow validation."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from forge.core.schema import (
    GateType,
    IngestTier,
    RunState,
    StepDefinition,
    StepType,
    Workflow,
    WorkflowInput,
    ForgeRun,
    IngotRecord,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

WORKFLOWS_DIR = Path(__file__).resolve().parent.parent.parent / "workflows"


def _load_workflow_yaml(name: str) -> dict:
    """Load a workflow YAML file and return as dict."""
    path = WORKFLOWS_DIR / name
    with open(path) as f:
        return yaml.safe_load(f)


def _parse_workflow_yaml(raw: dict) -> Workflow:
    """Parse a raw YAML dict into a Workflow model.

    Handles the YAML input format where inputs are dicts of dicts.
    """
    # Convert inputs from YAML format to WorkflowInput objects
    inputs: dict[str, WorkflowInput] = {}
    for key, val in raw.get("inputs", {}).items():
        if isinstance(val, dict):
            inputs[key] = WorkflowInput(name=key, **val)
        else:
            inputs[key] = WorkflowInput(name=key, type="string")

    # Convert steps
    steps: list[StepDefinition] = []
    for step_raw in raw.get("steps", []):
        # Convert gates from string list to GateType list
        if "gates" in step_raw and step_raw["gates"]:
            step_raw["gates"] = [GateType(g) for g in step_raw["gates"]]
        steps.append(StepDefinition(**step_raw))

    return Workflow(
        id=raw["id"],
        version=raw["version"],
        owner=raw["owner"],
        description=raw.get("description", ""),
        inputs=inputs,
        steps=steps,
    )


# ---------------------------------------------------------------------------
# Enum tests
# ---------------------------------------------------------------------------


class TestEnums:
    def test_step_type_values(self) -> None:
        assert StepType.plan == "plan"
        assert StepType.bamaram == "bamaram"

    def test_ingest_tier_values(self) -> None:
        assert IngestTier.Raw == "Raw"
        assert IngestTier.Forged == "Forged"

    def test_gate_type_values(self) -> None:
        assert GateType.pytest == "pytest"
        assert GateType.pip_audit == "pip-audit"

    def test_run_state_values(self) -> None:
        assert RunState.pending == "pending"
        assert RunState.gate_failed == "gate_failed"


# ---------------------------------------------------------------------------
# StepDefinition tests
# ---------------------------------------------------------------------------


class TestStepDefinition:
    def test_inferred_type_gate(self) -> None:
        step = StepDefinition(id="gate", hawk="Lil_Gate_Hawk", gates=[GateType.pytest])
        assert step.inferred_type() == StepType.gate

    def test_inferred_type_bamaram(self) -> None:
        step = StepDefinition(id="bamaram", hawk="Buildsmith", action="fire_bamaram_event")
        assert step.inferred_type() == StepType.bamaram

    def test_inferred_type_chronicle(self) -> None:
        step = StepDefinition(id="chronicle", hawk="Lil_Chronicle_Hawk", emit=["charter"])
        assert step.inferred_type() == StepType.chronicle

    def test_inferred_type_promote(self) -> None:
        step = StepDefinition(
            id="promote", hawk="Buildsmith", from_tier=IngestTier.Raw, to_tier=IngestTier.Forged
        )
        assert step.inferred_type() == StepType.promote

    def test_inferred_type_isolate(self) -> None:
        step = StepDefinition(
            id="isolate", hawk="Lil_Worktree_Hawk", branch="forge/test"
        )
        assert step.inferred_type() == StepType.isolate

    def test_inferred_type_implement(self) -> None:
        step = StepDefinition(
            id="implement",
            hawk="Lil_Exec_Hawk",
            action="execute_dag",
            iterate_until_gate_passes=True,
        )
        assert step.inferred_type() == StepType.implement

    def test_validate_adapter_env_var(self) -> None:
        step = StepDefinition(id="impl", hawk="Lil_Exec_Hawk", adapter="${FORGE_ADAPTER}")
        step.validate_adapter()  # Should not raise

    def test_validate_adapter_known_name(self) -> None:
        step = StepDefinition(id="impl", hawk="Lil_Exec_Hawk", adapter="claw_code")
        step.validate_adapter()  # Should not raise

    def test_validate_adapter_unknown_raises(self) -> None:
        step = StepDefinition(id="impl", hawk="Lil_Exec_Hawk", adapter="unknown_adapter")
        with pytest.raises(ValueError, match="Unknown adapter"):
            step.validate_adapter()

    def test_validate_adapter_bad_env_var_raises(self) -> None:
        step = StepDefinition(id="impl", hawk="Lil_Exec_Hawk", adapter="$123invalid")
        with pytest.raises(ValueError, match="Invalid adapter"):
            step.validate_adapter()


# ---------------------------------------------------------------------------
# Workflow validation tests
# ---------------------------------------------------------------------------


class TestWorkflowValidation:
    def test_gate_before_promote_required(self) -> None:
        """Promote without a preceding gate should fail."""
        with pytest.raises(ValueError, match="must be preceded by a gate"):
            Workflow(
                id="bad",
                version="1.0",
                owner="Test",
                steps=[
                    StepDefinition(
                        id="promote",
                        hawk="Buildsmith",
                        from_tier=IngestTier.Raw,
                        to_tier=IngestTier.Forged,
                    ),
                    StepDefinition(id="chronicle", hawk="Lil_Chronicle_Hawk", emit=["charter"]),
                ],
            )

    def test_must_end_with_chronicle(self) -> None:
        """Last non-bamaram step must be chronicle."""
        with pytest.raises(ValueError, match="last non-bamaram step must be chronicle"):
            Workflow(
                id="bad",
                version="1.0",
                owner="Test",
                steps=[
                    StepDefinition(id="gate", hawk="Lil_Gate_Hawk", gates=[GateType.pytest]),
                    StepDefinition(
                        id="promote",
                        hawk="Buildsmith",
                        from_tier=IngestTier.Raw,
                        to_tier=IngestTier.Forged,
                    ),
                ],
            )

    def test_bamaram_requires_promote(self) -> None:
        """Bamaram without promote should fail."""
        with pytest.raises(ValueError, match="bamaram step requires a promote"):
            Workflow(
                id="bad",
                version="1.0",
                owner="Test",
                steps=[
                    StepDefinition(id="chronicle", hawk="Lil_Chronicle_Hawk", emit=["charter"]),
                    StepDefinition(
                        id="bamaram", hawk="Buildsmith", action="fire_bamaram_event"
                    ),
                ],
            )

    def test_valid_minimal_workflow(self) -> None:
        """Minimal valid workflow: gate -> promote -> chronicle."""
        wf = Workflow(
            id="minimal",
            version="1.0",
            owner="Test",
            steps=[
                StepDefinition(id="gate", hawk="Lil_Gate_Hawk", gates=[GateType.ruff]),
                StepDefinition(
                    id="promote",
                    hawk="Buildsmith",
                    from_tier=IngestTier.Raw,
                    to_tier=IngestTier.Refined,
                ),
                StepDefinition(id="chronicle", hawk="Lil_Chronicle_Hawk", emit=["ledger"]),
            ],
        )
        assert wf.id == "minimal"
        assert len(wf.steps) == 3


# ---------------------------------------------------------------------------
# YAML workflow loading tests
# ---------------------------------------------------------------------------


class TestYAMLWorkflows:
    def test_load_smelt_ingot(self) -> None:
        raw = _load_workflow_yaml("smelt-ingot.yaml")
        wf = _parse_workflow_yaml(raw)
        assert wf.id == "smelt-ingot"
        assert wf.owner == "Buildsmith"
        assert len(wf.steps) == 7

    def test_load_perform_wire(self) -> None:
        raw = _load_workflow_yaml("perform-wire.yaml")
        wf = _parse_workflow_yaml(raw)
        assert wf.id == "perform-wire"

    def test_load_leanstral_verify(self) -> None:
        raw = _load_workflow_yaml("leanstral-verify.yaml")
        wf = _parse_workflow_yaml(raw)
        assert wf.id == "leanstral-verify"

    def test_load_chronicle_pr(self) -> None:
        raw = _load_workflow_yaml("chronicle-pr.yaml")
        wf = _parse_workflow_yaml(raw)
        assert wf.id == "chronicle-pr"

    def test_load_refactor_safely(self) -> None:
        raw = _load_workflow_yaml("refactor-safely.yaml")
        wf = _parse_workflow_yaml(raw)
        assert wf.id == "refactor-safely"

    def test_all_five_workflows_valid(self) -> None:
        """All 5 shipped workflows must pass schema validation."""
        for name in [
            "smelt-ingot.yaml",
            "perform-wire.yaml",
            "leanstral-verify.yaml",
            "chronicle-pr.yaml",
            "refactor-safely.yaml",
        ]:
            raw = _load_workflow_yaml(name)
            wf = _parse_workflow_yaml(raw)
            assert wf.id, f"Workflow {name} has no id"
            assert len(wf.steps) > 0, f"Workflow {name} has no steps"


# ---------------------------------------------------------------------------
# Model instance tests
# ---------------------------------------------------------------------------


class TestModels:
    def test_forge_run_defaults(self) -> None:
        run = ForgeRun(workflow_id="test", task_id="task-1")
        assert run.state == RunState.pending
        assert run.current_step_index == 0
        assert run.inputs == {}
        assert run.outputs == {}
        assert run.error is None

    def test_ingot_record_defaults(self) -> None:
        from uuid import uuid4

        record = IngotRecord(workflow_id="test", run_id=uuid4())
        assert record.tier == IngestTier.Raw
        assert record.artifacts == {}
        assert record.promoted_at is None
