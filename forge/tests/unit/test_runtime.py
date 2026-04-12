"""Tests for forge.core.runtime — ForgeRuntime and AdapterRegistry."""

from __future__ import annotations

from typing import Any
from uuid import UUID

import pytest

from forge.adapters.base import ExecutionResult, ExecutorAdapter
from forge.core.runtime import AdapterRegistry, ForgeRuntime
from forge.core.schema import (
    ForgeRun,
    GateType,
    IngestTier,
    RunState,
    StepDefinition,
    Workflow,
)


# ---------------------------------------------------------------------------
# Mock state store (no DB dependency)
# ---------------------------------------------------------------------------


class MockStateStore:
    """In-memory state store for testing (no asyncpg needed)."""

    def __init__(self) -> None:
        self._runs: dict[UUID, ForgeRun] = {}

    async def create_run(
        self, workflow_id: str, task_id: str, inputs: dict[str, Any]
    ) -> ForgeRun:
        from uuid import uuid4

        run = ForgeRun(
            id=uuid4(),
            workflow_id=workflow_id,
            task_id=task_id,
            inputs=inputs,
        )
        self._runs[run.id] = run
        return run

    async def get_run(self, run_id: UUID) -> ForgeRun | None:
        return self._runs.get(run_id)

    async def update_run(self, run_id: UUID, **kwargs: Any) -> None:
        run = self._runs.get(run_id)
        if run:
            for key, value in kwargs.items():
                if value is not None and hasattr(run, key):
                    object.__setattr__(run, key, value)

    async def list_runs(
        self, workflow_id: str | None = None, limit: int = 50
    ) -> list[ForgeRun]:
        runs = list(self._runs.values())
        if workflow_id:
            runs = [r for r in runs if r.workflow_id == workflow_id]
        return runs[:limit]


# ---------------------------------------------------------------------------
# Mock adapter
# ---------------------------------------------------------------------------


class MockAdapter(ExecutorAdapter):
    """Test adapter that returns a configurable result."""

    def __init__(self, adapter_name: str = "mock") -> None:
        self._name = adapter_name

    @property
    def name(self) -> str:
        return self._name

    async def execute(
        self, prompt: str, context: dict[str, object], cwd: str
    ) -> ExecutionResult:
        return ExecutionResult(
            stdout="mock output",
            stderr="",
            exit_code=0,
            files_changed=["test.py"],
            duration_ms=42,
        )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestForgeRuntime:
    @pytest.fixture
    def runtime(self) -> ForgeRuntime:
        store = MockStateStore()
        registry = AdapterRegistry()
        registry.register(MockAdapter("claw_code"))
        return ForgeRuntime(
            state_store=store,  # type: ignore[arg-type]
            adapter_registry=registry,
        )

    @pytest.mark.asyncio
    async def test_execute_minimal_workflow(self, runtime: ForgeRuntime) -> None:
        """Run a minimal valid workflow through the runtime."""
        wf = Workflow(
            id="test-minimal",
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
                StepDefinition(id="chronicle", hawk="Lil_Chronicle_Hawk", emit=["charter"]),
            ],
        )

        run = await runtime.execute_workflow(wf, inputs={}, task_id="test-task")
        assert run.state == RunState.completed
        assert "gate" in run.outputs
        assert "promote" in run.outputs
        assert "chronicle" in run.outputs

    @pytest.mark.asyncio
    async def test_execute_with_implement_step(self, runtime: ForgeRuntime) -> None:
        """Run a workflow that includes an implement step with a known adapter."""
        wf = Workflow(
            id="test-impl",
            version="1.0",
            owner="Test",
            steps=[
                StepDefinition(
                    id="implement",
                    hawk="Lil_Exec_Hawk",
                    action="execute",
                    adapter="claw_code",
                    iterate_until_gate_passes=True,
                    max_iterations=3,
                ),
                StepDefinition(id="gate", hawk="Lil_Gate_Hawk", gates=[GateType.pytest]),
                StepDefinition(
                    id="promote",
                    hawk="Buildsmith",
                    from_tier=IngestTier.Raw,
                    to_tier=IngestTier.Forged,
                ),
                StepDefinition(id="chronicle", hawk="Lil_Chronicle_Hawk", emit=["ledger"]),
            ],
        )

        run = await runtime.execute_workflow(wf, inputs={"target_repo_path": "/tmp/test"})
        assert run.state == RunState.completed
        impl_result = run.outputs["implement"]
        assert impl_result["adapter"] == "claw_code"

    @pytest.mark.asyncio
    async def test_run_state_transitions(self, runtime: ForgeRuntime) -> None:
        """Verify the state machine transitions during execution."""
        events: list[str] = []

        async def capture_event(
            event: str, run_id: UUID, payload: dict[str, Any]
        ) -> None:
            events.append(event)

        runtime._on_event = capture_event

        wf = Workflow(
            id="state-test",
            version="1.0",
            owner="Test",
            steps=[
                StepDefinition(id="chronicle", hawk="Lil_Chronicle_Hawk", emit=["charter"]),
            ],
        )

        run = await runtime.execute_workflow(wf, inputs={})
        assert run.state == RunState.completed
        assert "run_started" in events
        assert "run_completed" in events
