"""Forge five-gate — pytest, mypy, ruff, pip-audit, integration validation suite.

Each gate runs as a real subprocess call. Failures block promotion.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from forge.core.schema import GateType

logger = logging.getLogger("forge.gates.five_gate")


@dataclass(frozen=True)
class GateOutput:
    """Result of a single gate check."""

    passed: bool
    output: str
    duration_ms: float
    error: Optional[str] = None


async def _run_subprocess(cmd: list[str], cwd: str) -> tuple[int, str, str, float]:
    """Run a subprocess and return (exit_code, stdout, stderr, duration_ms).

    Args:
        cmd: Command and arguments.
        cwd: Working directory.

    Returns:
        Tuple of (exit_code, stdout, stderr, duration_ms).
    """
    start = time.monotonic()
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
        )
        stdout_bytes, stderr_bytes = await proc.communicate()
        exit_code = proc.returncode or 0
        stdout = stdout_bytes.decode("utf-8", errors="replace")
        stderr = stderr_bytes.decode("utf-8", errors="replace")
    except FileNotFoundError as exc:
        exit_code = 127
        stdout = ""
        stderr = f"Command not found: {cmd[0]} ({exc})"
    except Exception as exc:
        exit_code = 1
        stdout = ""
        stderr = f"Subprocess error: {exc}"

    duration_ms = (time.monotonic() - start) * 1000
    return exit_code, stdout, stderr, duration_ms


async def run_pytest(cwd: str) -> GateOutput:
    """Run pytest on the target directory.

    Args:
        cwd: Directory containing the tests/ subdirectory.

    Returns:
        GateOutput with pass/fail and test output.
    """
    tests_dir = Path(cwd) / "tests"
    if not tests_dir.exists():
        return GateOutput(
            passed=True,
            output="No tests/ directory found, skipping pytest.",
            duration_ms=0.0,
        )

    cmd = ["python", "-m", "pytest", str(tests_dir), "-v", "--tb=short"]
    exit_code, stdout, stderr, duration_ms = await _run_subprocess(cmd, cwd)
    output = stdout + ("\n" + stderr if stderr else "")

    return GateOutput(
        passed=exit_code == 0,
        output=output,
        duration_ms=duration_ms,
        error=stderr if exit_code != 0 else None,
    )


async def run_mypy(cwd: str) -> GateOutput:
    """Run mypy --strict on the target directory.

    Args:
        cwd: Directory to type-check.

    Returns:
        GateOutput with pass/fail and type-check output.
    """
    cmd = ["python", "-m", "mypy", cwd, "--strict"]
    exit_code, stdout, stderr, duration_ms = await _run_subprocess(cmd, cwd)
    output = stdout + ("\n" + stderr if stderr else "")

    return GateOutput(
        passed=exit_code == 0,
        output=output,
        duration_ms=duration_ms,
        error=stderr if exit_code != 0 else None,
    )


async def run_ruff(cwd: str) -> GateOutput:
    """Run ruff check on the target directory.

    Args:
        cwd: Directory to lint.

    Returns:
        GateOutput with pass/fail and lint output.
    """
    cmd = ["python", "-m", "ruff", "check", cwd]
    exit_code, stdout, stderr, duration_ms = await _run_subprocess(cmd, cwd)
    output = stdout + ("\n" + stderr if stderr else "")

    return GateOutput(
        passed=exit_code == 0,
        output=output,
        duration_ms=duration_ms,
        error=stderr if exit_code != 0 else None,
    )


async def run_pip_audit(cwd: str) -> GateOutput:
    """Run pip-audit against the project's requirements.

    Looks for requirements.txt first, then pyproject.toml.

    Args:
        cwd: Directory containing dependency declarations.

    Returns:
        GateOutput with pass/fail and audit output.
    """
    reqs_path = Path(cwd) / "requirements.txt"
    pyproject_path = Path(cwd) / "pyproject.toml"

    if reqs_path.exists():
        cmd = ["pip-audit", "-r", str(reqs_path)]
    elif pyproject_path.exists():
        cmd = ["pip-audit"]
    else:
        return GateOutput(
            passed=True,
            output="No requirements.txt or pyproject.toml found, skipping pip-audit.",
            duration_ms=0.0,
        )

    exit_code, stdout, stderr, duration_ms = await _run_subprocess(cmd, cwd)
    output = stdout + ("\n" + stderr if stderr else "")

    return GateOutput(
        passed=exit_code == 0,
        output=output,
        duration_ms=duration_ms,
        error=stderr if exit_code != 0 else None,
    )


async def run_integration(cwd: str) -> GateOutput:
    """Run integration tests from the tests/integration/ subdirectory.

    Args:
        cwd: Directory containing tests/integration/.

    Returns:
        GateOutput with pass/fail and test output.
    """
    integration_dir = Path(cwd) / "tests" / "integration"
    if not integration_dir.exists():
        return GateOutput(
            passed=True,
            output="No tests/integration/ directory found, skipping integration tests.",
            duration_ms=0.0,
        )

    cmd = ["python", "-m", "pytest", str(integration_dir), "-v"]
    exit_code, stdout, stderr, duration_ms = await _run_subprocess(cmd, cwd)
    output = stdout + ("\n" + stderr if stderr else "")

    return GateOutput(
        passed=exit_code == 0,
        output=output,
        duration_ms=duration_ms,
        error=stderr if exit_code != 0 else None,
    )


# Map GateType to runner functions
_GATE_RUNNERS: dict[GateType, object] = {
    GateType.pytest: run_pytest,
    GateType.mypy: run_mypy,
    GateType.ruff: run_ruff,
    GateType.pip_audit: run_pip_audit,
    GateType.integration: run_integration,
}


class FiveGateRunner:
    """Runs the five-gate validation suite on a target directory.

    Gates: pytest, mypy, ruff, pip-audit, integration.
    Each gate is run as a subprocess; failures block promotion.
    """

    async def run_gate(self, target_dir: str, gate: GateType) -> GateOutput:
        """Run a single gate check.

        Args:
            target_dir: Directory to validate.
            gate: Which gate to run.

        Returns:
            GateOutput with pass/fail status, output, and timing.
        """
        runner = _GATE_RUNNERS.get(gate)
        if runner is None:
            return GateOutput(
                passed=False,
                output=f"Unknown gate type: {gate}",
                duration_ms=0.0,
                error=f"No runner registered for gate '{gate}'",
            )

        logger.info("Running gate '%s' on %s", gate.value, target_dir)
        result: GateOutput = await runner(target_dir)  # type: ignore[operator]
        status = "PASSED" if result.passed else "FAILED"
        logger.info(
            "Gate '%s' %s on %s (%.0fms)",
            gate.value,
            status,
            target_dir,
            result.duration_ms,
        )
        return result

    async def run_all(
        self,
        cwd: str,
        gates: list[GateType],
    ) -> dict[str, GateOutput]:
        """Run all specified gates and return results.

        Args:
            cwd: Directory to validate.
            gates: Which gates to run.

        Returns:
            Dict mapping gate name to GateOutput.
        """
        results: dict[str, GateOutput] = {}
        for gate in gates:
            result = await self.run_gate(cwd, gate)
            results[gate.value] = result
        return results
