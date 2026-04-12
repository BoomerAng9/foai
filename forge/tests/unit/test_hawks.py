"""Tests for forge.hawks — all 5 Lil_Forge_Hawks."""

from __future__ import annotations

from dataclasses import dataclass
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from forge.adapters.base import ExecutionResult
from forge.core.runtime import AdapterRegistry
from forge.core.schema import ForgeRun, RunState
from forge.gates.five_gate import GateOutput
from forge.hawks.chronicle_hawk import ChronicleHawk
from forge.hawks.exec_hawk import ExecHawk
from forge.hawks.gate_hawk import GateHawk, GateResult
from forge.hawks.plan_hawk import PlanHawk, TaskDAG
from forge.hawks.worktree_hawk import WorktreeHawk


# ---------------------------------------------------------------------------
# PlanHawk tests
# ---------------------------------------------------------------------------


class TestPlanHawk:
    @pytest.mark.asyncio
    async def test_decompose_rfp_no_llm_returns_fallback(self) -> None:
        """Without an LLM adapter, PlanHawk returns a single-task fallback."""
        hawk = PlanHawk(llm_adapter=None)
        result = await hawk.decompose_rfp("Build a REST API", {})
        assert isinstance(result, TaskDAG)
        assert len(result.tasks) == 1
        assert result.tasks[0].id == "task-0"
        assert result.metadata["source"] == "fallback"

    @pytest.mark.asyncio
    async def test_decompose_rfp_with_llm(self) -> None:
        """With an LLM adapter, PlanHawk decomposes into multiple tasks."""
        mock_llm = AsyncMock()

        @dataclass
        class FakeResult:
            stdout: str = '[{"id": "auth", "description": "Set up auth", "dependencies": [], "complexity": "medium"}, {"id": "api", "description": "Build endpoints", "dependencies": ["auth"], "complexity": "high"}]'

        mock_llm.execute.return_value = FakeResult()
        hawk = PlanHawk(llm_adapter=mock_llm)
        result = await hawk.decompose_rfp("Build a REST API with auth", {"env": "prod"})
        assert len(result.tasks) == 2
        assert result.tasks[0].id == "auth"
        assert result.tasks[1].dependencies == ["auth"]
        assert result.metadata["source"] == "llm"

    @pytest.mark.asyncio
    async def test_decompose_rfp_llm_failure_falls_back(self) -> None:
        """If LLM fails, PlanHawk falls back to single-task plan."""
        mock_llm = AsyncMock()
        mock_llm.execute.side_effect = RuntimeError("LLM unavailable")
        hawk = PlanHawk(llm_adapter=mock_llm)
        result = await hawk.decompose_rfp("Build something", {})
        assert len(result.tasks) == 1
        assert result.metadata["source"] == "fallback"

    def test_parse_llm_output_bad_json(self) -> None:
        """Malformed JSON from LLM should produce a fallback plan."""
        hawk = PlanHawk()
        result = hawk._parse_llm_output("not valid json at all", "rfp text")
        assert len(result.tasks) == 1
        assert result.metadata["source"] == "fallback"

    def test_task_dag_ids(self) -> None:
        """TaskDAG.task_ids() returns all IDs in order."""
        from forge.hawks.plan_hawk import TaskNode

        dag = TaskDAG(tasks=[
            TaskNode(id="a", description="first"),
            TaskNode(id="b", description="second"),
        ])
        assert dag.task_ids() == ["a", "b"]
        assert dag.get_task("a") is not None
        assert dag.get_task("c") is None


# ---------------------------------------------------------------------------
# WorktreeHawk tests
# ---------------------------------------------------------------------------


class TestWorktreeHawk:
    @pytest.mark.asyncio
    async def test_create_worktree_delegates_to_manager(self) -> None:
        """create_worktree calls manager.create with correct branch name."""
        mock_mgr = MagicMock()
        mock_mgr.create.return_value = "/tmp/forge-worktrees/forge-smelt-abcd1234"
        hawk = WorktreeHawk(manager=mock_mgr)
        path = await hawk.create_worktree("/repo", "abcd1234-5678-9abc-def0")
        mock_mgr.create.assert_called_once_with(
            repo_path="/repo",
            branch_name="forge/smelt-abcd1234",
            worktree_dir=None,
        )
        assert path == "/tmp/forge-worktrees/forge-smelt-abcd1234"

    @pytest.mark.asyncio
    async def test_cleanup_delegates_to_manager(self) -> None:
        """cleanup calls manager.destroy."""
        mock_mgr = MagicMock()
        hawk = WorktreeHawk(manager=mock_mgr)
        await hawk.cleanup("/tmp/worktree-path")
        mock_mgr.destroy.assert_called_once_with("/tmp/worktree-path", force=False)

    @pytest.mark.asyncio
    async def test_prune_stale_returns_count(self) -> None:
        """prune_stale returns the number of pruned worktrees."""
        mock_mgr = MagicMock()
        mock_mgr.prune_stale.return_value = 3
        hawk = WorktreeHawk(manager=mock_mgr)
        count = await hawk.prune_stale("/repo", max_age_seconds=3600)
        assert count == 3


# ---------------------------------------------------------------------------
# ExecHawk tests
# ---------------------------------------------------------------------------


class TestExecHawk:
    @pytest.mark.asyncio
    async def test_execute_task_with_valid_adapter(self) -> None:
        """ExecHawk executes a task through the resolved adapter."""
        mock_adapter = AsyncMock()
        mock_adapter.name = "claw_code"
        mock_adapter.execute.return_value = ExecutionResult(
            stdout="OK", stderr="", exit_code=0, duration_ms=100
        )
        registry = AdapterRegistry()
        registry.register(mock_adapter)
        hawk = ExecHawk(adapter_registry=registry)

        result = await hawk.execute_task(
            task={"id": "task-1", "description": "Build auth"},
            adapter_name="claw_code",
            cwd="/tmp",
        )
        assert result.exit_code == 0
        assert result.stdout == "OK"

    @pytest.mark.asyncio
    async def test_execute_task_unknown_adapter_raises(self) -> None:
        """ExecHawk raises ValueError for an unknown adapter."""
        hawk = ExecHawk(adapter_registry=AdapterRegistry())
        with pytest.raises(ValueError, match="not found in registry"):
            await hawk.execute_task(
                task={"id": "task-1", "description": "do stuff"},
                adapter_name="nonexistent",
                cwd="/tmp",
            )

    def test_build_prompt_with_gate_feedback(self) -> None:
        """Prompt includes gate feedback when retrying."""
        prompt = ExecHawk._build_prompt(
            task={"description": "Fix the linting"},
            gate_feedback="ruff: E302 expected 2 blank lines",
            iteration=2,
        )
        assert "Gate Feedback" in prompt
        assert "E302" in prompt
        assert "iteration 2" in prompt


# ---------------------------------------------------------------------------
# GateHawk tests
# ---------------------------------------------------------------------------


class TestGateHawk:
    @pytest.mark.asyncio
    async def test_run_gates_all_pass(self) -> None:
        """When all gates pass, GateResult.passed is True."""
        mock_runner = AsyncMock()
        mock_runner.run_all.return_value = {
            "pytest": GateOutput(passed=True, output="OK", duration_ms=50.0),
            "ruff": GateOutput(passed=True, output="OK", duration_ms=30.0),
        }
        hawk = GateHawk(runner=mock_runner)
        result = await hawk.run_gates("/tmp", gates=["pytest", "ruff"])
        assert result.passed is True
        assert len(result.results) == 2

    @pytest.mark.asyncio
    async def test_run_gates_one_fails(self) -> None:
        """When one gate fails, GateResult.passed is False."""
        mock_runner = AsyncMock()
        mock_runner.run_all.return_value = {
            "pytest": GateOutput(passed=True, output="OK", duration_ms=50.0),
            "mypy": GateOutput(passed=False, output="error: found 3 errors", duration_ms=80.0),
        }
        hawk = GateHawk(runner=mock_runner)
        result = await hawk.run_gates("/tmp", gates=["pytest", "mypy"])
        assert result.passed is False
        assert result.failed_gates() == ["mypy"]

    def test_gate_result_summary(self) -> None:
        """GateResult.summary() produces readable output."""
        result = GateResult(
            passed=False,
            results={
                "pytest": GateOutput(passed=True, output="", duration_ms=10.0),
                "ruff": GateOutput(passed=False, output="error", duration_ms=5.0),
            },
        )
        summary = result.summary()
        assert "FAILED" in summary
        assert "pytest" in summary

    def test_gate_result_feedback_for_retry(self) -> None:
        """feedback_for_retry() includes only failed gates."""
        result = GateResult(
            passed=False,
            results={
                "pytest": GateOutput(passed=True, output="all passed", duration_ms=10.0),
                "ruff": GateOutput(passed=False, output="E302 blank lines", duration_ms=5.0),
            },
        )
        feedback = result.feedback_for_retry()
        assert "ruff" in feedback
        assert "E302" in feedback
        assert "pytest" not in feedback


# ---------------------------------------------------------------------------
# ChronicleHawk tests
# ---------------------------------------------------------------------------


class TestChronicleHawk:
    @pytest.mark.asyncio
    async def test_emit_both_types(self) -> None:
        """ChronicleHawk emits both charter and ledger."""
        mock_charter = AsyncMock()
        mock_charter.emit.return_value = "# Charter content"
        mock_ledger = AsyncMock()
        mock_ledger.emit.return_value = '{"type": "ledger"}'

        hawk = ChronicleHawk(charter_emitter=mock_charter, ledger_emitter=mock_ledger)
        run = ForgeRun(
            id=uuid4(),
            workflow_id="smelt-ingot",
            task_id="test-task",
            state=RunState.completed,
            outputs={"gate": {"passed": True}},
        )
        results = await hawk.emit(run, emit_types=["charter", "ledger"])
        assert "charter" in results
        assert "ledger" in results
        mock_charter.emit.assert_called_once()
        mock_ledger.emit.assert_called_once()

    @pytest.mark.asyncio
    async def test_emit_charter_only(self) -> None:
        """ChronicleHawk can emit only charter."""
        mock_charter = AsyncMock()
        mock_charter.emit.return_value = "# Charter"
        mock_ledger = AsyncMock()

        hawk = ChronicleHawk(charter_emitter=mock_charter, ledger_emitter=mock_ledger)
        run = ForgeRun(workflow_id="test", task_id="t1", state=RunState.completed)
        results = await hawk.emit(run, emit_types=["charter"])
        assert "charter" in results
        assert "ledger" not in results
        mock_ledger.emit.assert_not_called()
