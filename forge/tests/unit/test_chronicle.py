"""Tests for forge.chronicle — Charter and Ledger emission."""

from __future__ import annotations

import json
from unittest.mock import patch
from uuid import uuid4

import pytest

from forge.chronicle.charter import CharterEmitter
from forge.chronicle.ledger import LedgerEmitter
from forge.core.schema import ForgeRun, RunState


# ---------------------------------------------------------------------------
# CharterEmitter tests
# ---------------------------------------------------------------------------


class TestCharterEmitter:
    @pytest.mark.asyncio
    async def test_emit_produces_markdown(self) -> None:
        """emit() returns a markdown string with run details."""
        run = ForgeRun(
            id=uuid4(),
            workflow_id="smelt-ingot",
            task_id="rfp-001",
            state=RunState.completed,
            outputs={
                "plan": {"status": "planned"},
                "gate": {
                    "status": "gated",
                    "passed": True,
                    "gate_results": {"pytest": True, "ruff": True},
                },
                "promote": {"status": "promoted", "to_tier": "Forged"},
            },
        )
        emitter = CharterEmitter()
        with patch("forge.chronicle.charter._persist_to_neon", return_value=False):
            charter = await emitter.emit(run, workflow_description="Test workflow run")
        assert "# Forge Charter" in charter
        assert "smelt-ingot" in charter
        assert "rfp-001" in charter
        assert "Forged" in charter
        assert "Smelter OS" in charter

    @pytest.mark.asyncio
    async def test_emit_with_no_outputs(self) -> None:
        """emit() works even with empty outputs."""
        run = ForgeRun(
            id=uuid4(),
            workflow_id="test",
            task_id="t-1",
            state=RunState.completed,
        )
        emitter = CharterEmitter()
        with patch("forge.chronicle.charter._persist_to_neon", return_value=False):
            charter = await emitter.emit(run)
        assert "# Forge Charter" in charter
        assert str(run.id) in charter

    @pytest.mark.asyncio
    async def test_emit_persists_to_neon(self) -> None:
        """emit() calls _persist_to_neon with correct parameters."""
        run = ForgeRun(
            id=uuid4(),
            workflow_id="test-wf",
            task_id="t-1",
            state=RunState.completed,
        )
        emitter = CharterEmitter()
        with patch("forge.chronicle.charter._persist_to_neon", return_value=True) as mock_persist:
            await emitter.emit(run)
            mock_persist.assert_called_once()
            call_args = mock_persist.call_args
            assert call_args[1]["chronicle_type"] == "charter"
            assert call_args[1]["workflow_id"] == "test-wf"


# ---------------------------------------------------------------------------
# LedgerEmitter tests
# ---------------------------------------------------------------------------


class TestLedgerEmitter:
    @pytest.mark.asyncio
    async def test_emit_produces_json(self) -> None:
        """emit() returns a valid JSON string."""
        run = ForgeRun(
            id=uuid4(),
            workflow_id="smelt-ingot",
            task_id="rfp-002",
            state=RunState.completed,
            outputs={
                "implement": {
                    "status": "implemented",
                    "adapter": "claw_code",
                    "result": {
                        "exit_code": 0,
                        "duration_ms": 1500,
                        "files_changed": ["api.py"],
                    },
                },
                "gate": {
                    "status": "gated",
                    "gate_results": {"pytest": True, "mypy": False},
                },
            },
        )
        emitter = LedgerEmitter()
        with patch("forge.chronicle.charter._persist_to_neon", return_value=False):
            ledger_json = await emitter.emit(run)
        ledger = json.loads(ledger_json)
        assert ledger["type"] == "ledger"
        assert ledger["version"] == "1.0"
        assert ledger["workflow_id"] == "smelt-ingot"
        assert ledger["run_id"] == str(run.id)
        assert len(ledger["step_log"]) == 2

    @pytest.mark.asyncio
    async def test_emit_captures_adapter_info(self) -> None:
        """Ledger step_log includes adapter name from implement steps."""
        run = ForgeRun(
            id=uuid4(),
            workflow_id="test",
            task_id="t-1",
            state=RunState.completed,
            outputs={
                "implement": {
                    "status": "implemented",
                    "adapter": "gemini_cli",
                },
            },
        )
        emitter = LedgerEmitter()
        with patch("forge.chronicle.charter._persist_to_neon", return_value=False):
            ledger_json = await emitter.emit(run)
        ledger = json.loads(ledger_json)
        impl_step = ledger["step_log"][0]
        assert impl_step["adapter"] == "gemini_cli"

    @pytest.mark.asyncio
    async def test_emit_handles_error_state(self) -> None:
        """Ledger captures error info from aborted runs."""
        run = ForgeRun(
            id=uuid4(),
            workflow_id="test",
            task_id="t-1",
            state=RunState.aborted,
            error="Gate failed after 5 iterations",
            outputs={},
        )
        emitter = LedgerEmitter()
        with patch("forge.chronicle.charter._persist_to_neon", return_value=False):
            ledger_json = await emitter.emit(run)
        ledger = json.loads(ledger_json)
        assert ledger["error"] == "Gate failed after 5 iterations"
        assert ledger["state"] == "aborted"

    @pytest.mark.asyncio
    async def test_emit_persists_to_neon(self) -> None:
        """emit() calls _persist_to_neon with type='ledger'."""
        run = ForgeRun(
            id=uuid4(),
            workflow_id="test-wf",
            task_id="t-1",
            state=RunState.completed,
        )
        emitter = LedgerEmitter()
        with patch("forge.chronicle.charter._persist_to_neon", return_value=True) as mock_persist:
            await emitter.emit(run)
            mock_persist.assert_called_once()
            call_args = mock_persist.call_args
            assert call_args[1]["chronicle_type"] == "ledger"
