"""Lil_Gate_Hawk — five-gate enforcement at every gate transition.

Runs the five-gate validation suite against a directory and returns
structured results for the runtime to evaluate.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

from forge.core.schema import GateType
from forge.gates.five_gate import FiveGateRunner, GateOutput

logger = logging.getLogger("forge.hawks.gate")


@dataclass
class GateResult:
    """Aggregated result of running multiple gates."""

    passed: bool
    results: dict[str, GateOutput] = field(default_factory=dict)

    def summary(self) -> str:
        """Return a human-readable summary of gate results."""
        lines: list[str] = []
        for gate_name, output in self.results.items():
            status = "PASS" if output.passed else "FAIL"
            lines.append(f"  {gate_name}: {status} ({output.duration_ms:.0f}ms)")
        overall = "PASSED" if self.passed else "FAILED"
        lines.insert(0, f"Gate Suite: {overall}")
        return "\n".join(lines)

    def failed_gates(self) -> list[str]:
        """Return names of gates that failed."""
        return [name for name, output in self.results.items() if not output.passed]

    def feedback_for_retry(self) -> str:
        """Build feedback string for re-execution after gate failure."""
        parts: list[str] = []
        for name, output in self.results.items():
            if not output.passed:
                parts.append(f"--- {name} (FAILED) ---\n{output.output}")
        return "\n\n".join(parts) if parts else "All gates passed."


class GateHawk:
    """Lil_Gate_Hawk: enforces the five-gate validation suite.

    Wraps FiveGateRunner to provide a hawk-level interface compatible
    with Chicken Hawk dispatch.
    """

    name: str = "Lil_Gate_Hawk"
    role: str = "GATE"

    def __init__(self, runner: Optional[FiveGateRunner] = None) -> None:
        self._runner = runner or FiveGateRunner()

    async def run_gates(
        self,
        cwd: str,
        gates: Optional[list[str]] = None,
    ) -> GateResult:
        """Run the specified gates against a directory.

        Args:
            cwd: Working directory to validate.
            gates: List of gate names to run. Defaults to all five gates.

        Returns:
            GateResult with per-gate pass/fail and outputs.
        """
        if gates is None:
            gate_types = list(GateType)
        else:
            gate_types = [GateType(g) for g in gates]

        logger.info("Running %d gate(s) on %s: %s", len(gate_types), cwd, gates)

        raw_results = await self._runner.run_all(cwd, gate_types)

        results: dict[str, GateOutput] = {}
        all_passed = True
        for gate_name, output in raw_results.items():
            results[gate_name] = output
            if not output.passed:
                all_passed = False
                logger.warning("Gate '%s' FAILED on %s", gate_name, cwd)

        gate_result = GateResult(passed=all_passed, results=results)
        logger.info("Gate suite %s: %s", "PASSED" if all_passed else "FAILED", cwd)
        return gate_result
