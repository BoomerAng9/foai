"""Tests for forge.gates — FiveGateRunner and Leanstral verifier."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from forge.core.schema import GateType
from forge.gates.five_gate import (
    FiveGateRunner,
    GateOutput,
    run_integration,
    run_mypy,
    run_pip_audit,
    run_pytest,
    run_ruff,
)
from forge.gates.leanstral import LeanstralVerifier


# ---------------------------------------------------------------------------
# FiveGateRunner — individual gate tests with mocked subprocess
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_subprocess_success() -> AsyncMock:
    """Mock asyncio.create_subprocess_exec returning success."""
    mock_proc = AsyncMock()
    mock_proc.communicate.return_value = (b"All checks passed\n", b"")
    mock_proc.returncode = 0
    return mock_proc


@pytest.fixture
def mock_subprocess_failure() -> AsyncMock:
    """Mock asyncio.create_subprocess_exec returning failure."""
    mock_proc = AsyncMock()
    mock_proc.communicate.return_value = (b"", b"Found 3 errors\n")
    mock_proc.returncode = 1
    return mock_proc


class TestRunPytest:
    @pytest.mark.asyncio
    async def test_pytest_no_tests_dir(self, tmp_path: object) -> None:
        """Skip pytest if no tests/ directory exists."""
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            result = await run_pytest(d)
            assert result.passed is True
            assert "skipping" in result.output.lower()

    @pytest.mark.asyncio
    async def test_pytest_success(self, mock_subprocess_success: AsyncMock) -> None:
        """pytest gate passes when subprocess returns 0."""
        import tempfile
        import os
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(os.path.join(d, "tests"))
            with patch("asyncio.create_subprocess_exec", return_value=mock_subprocess_success):
                result = await run_pytest(d)
                assert result.passed is True

    @pytest.mark.asyncio
    async def test_pytest_failure(self, mock_subprocess_failure: AsyncMock) -> None:
        """pytest gate fails when subprocess returns non-zero."""
        import tempfile
        import os
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(os.path.join(d, "tests"))
            with patch("asyncio.create_subprocess_exec", return_value=mock_subprocess_failure):
                result = await run_pytest(d)
                assert result.passed is False
                assert result.error is not None


class TestRunMypy:
    @pytest.mark.asyncio
    async def test_mypy_success(self, mock_subprocess_success: AsyncMock) -> None:
        """mypy gate passes when subprocess returns 0."""
        with patch("asyncio.create_subprocess_exec", return_value=mock_subprocess_success):
            result = await run_mypy("/tmp/project")
            assert result.passed is True

    @pytest.mark.asyncio
    async def test_mypy_failure(self, mock_subprocess_failure: AsyncMock) -> None:
        """mypy gate fails when subprocess returns non-zero."""
        with patch("asyncio.create_subprocess_exec", return_value=mock_subprocess_failure):
            result = await run_mypy("/tmp/project")
            assert result.passed is False


class TestRunRuff:
    @pytest.mark.asyncio
    async def test_ruff_success(self, mock_subprocess_success: AsyncMock) -> None:
        """ruff gate passes when subprocess returns 0."""
        with patch("asyncio.create_subprocess_exec", return_value=mock_subprocess_success):
            result = await run_ruff("/tmp/project")
            assert result.passed is True


class TestRunPipAudit:
    @pytest.mark.asyncio
    async def test_pip_audit_no_requirements(self) -> None:
        """Skip pip-audit if no requirements files exist."""
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            result = await run_pip_audit(d)
            assert result.passed is True
            assert "skipping" in result.output.lower()

    @pytest.mark.asyncio
    async def test_pip_audit_with_requirements(self, mock_subprocess_success: AsyncMock) -> None:
        """pip-audit runs when requirements.txt exists."""
        import tempfile
        import os
        with tempfile.TemporaryDirectory() as d:
            with open(os.path.join(d, "requirements.txt"), "w") as f:
                f.write("requests>=2.0\n")
            with patch("asyncio.create_subprocess_exec", return_value=mock_subprocess_success):
                result = await run_pip_audit(d)
                assert result.passed is True


class TestRunIntegration:
    @pytest.mark.asyncio
    async def test_integration_no_dir(self) -> None:
        """Skip integration if no tests/integration/ directory."""
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            result = await run_integration(d)
            assert result.passed is True
            assert "skipping" in result.output.lower()


# ---------------------------------------------------------------------------
# FiveGateRunner.run_all
# ---------------------------------------------------------------------------


class TestFiveGateRunner:
    @pytest.mark.asyncio
    async def test_run_all_returns_dict(self, mock_subprocess_success: AsyncMock) -> None:
        """run_all returns a dict of gate name -> GateOutput."""
        runner = FiveGateRunner()
        with patch("asyncio.create_subprocess_exec", return_value=mock_subprocess_success):
            results = await runner.run_all("/tmp/project", [GateType.ruff, GateType.mypy])
            assert "ruff" in results
            assert "mypy" in results
            assert all(isinstance(v, GateOutput) for v in results.values())

    @pytest.mark.asyncio
    async def test_run_gate_unknown_type(self) -> None:
        """Running an unregistered gate type should return failure."""
        runner = FiveGateRunner()
        # Temporarily remove a gate runner to test unknown handling
        from forge.gates import five_gate
        original = five_gate._GATE_RUNNERS.copy()
        five_gate._GATE_RUNNERS.clear()
        try:
            result = await runner.run_gate("/tmp", GateType.pytest)
            assert result.passed is False
            assert "Unknown" in result.output or "No runner" in (result.error or "")
        finally:
            five_gate._GATE_RUNNERS.update(original)


# ---------------------------------------------------------------------------
# LeanstralVerifier
# ---------------------------------------------------------------------------


class TestLeanstralVerifier:
    @pytest.mark.asyncio
    async def test_verify_nonexistent_contract(self) -> None:
        """Verification fails for a non-existent file."""
        verifier = LeanstralVerifier()
        result = await verifier.verify_contract("/nonexistent/contract.sol")
        assert result.passed is False
        assert "not found" in result.proof_output.lower()

    @pytest.mark.asyncio
    async def test_verify_no_tools_available(self) -> None:
        """When neither solc nor slither is available, mark for manual review."""
        import tempfile
        import os
        with tempfile.TemporaryDirectory() as d:
            contract = os.path.join(d, "test.sol")
            with open(contract, "w") as f:
                f.write("pragma solidity ^0.8.0; contract Test {}")
            with patch(
                "forge.gates.leanstral._check_tool_available",
                return_value=False,
            ):
                verifier = LeanstralVerifier()
                result = await verifier.verify_contract(contract)
                assert result.requires_manual_review is True
                assert result.passed is False
