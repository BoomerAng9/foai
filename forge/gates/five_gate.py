"""Forge five-gate — pytest, mypy, ruff, pip-audit, integration validation suite.

Phase 5 implementation. Currently defines the interface; gate runners will be
wired in Phase 5.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from forge.core.schema import GateType


@dataclass(frozen=True)
class GateResult:
    """Result of a single gate check."""

    gate: GateType
    passed: bool
    output: str
    error: Optional[str] = None


class FiveGateRunner:
    """Runs the five-gate validation suite on a target directory.

    Gates: pytest, mypy, ruff, pip-audit, integration.
    Each gate is run as a subprocess; failures block promotion.
    """

    async def run_all(
        self, target_dir: str, gates: list[GateType]
    ) -> list[GateResult]:
        """Run all specified gates and return results.

        Args:
            target_dir: Directory to validate.
            gates: Which gates to run.

        Returns:
            List of GateResult, one per gate.
        """
        results: list[GateResult] = []
        for gate in gates:
            result = await self.run_gate(target_dir, gate)
            results.append(result)
        return results

    async def run_gate(self, target_dir: str, gate: GateType) -> GateResult:
        """Run a single gate check.

        Args:
            target_dir: Directory to validate.
            gate: Which gate to run.

        Returns:
            GateResult with pass/fail status.
        """
        # Phase 5 will implement actual subprocess calls.
        # Stub returns passed=True for now.
        return GateResult(
            gate=gate,
            passed=True,
            output=f"[stub] {gate.value} gate passed on {target_dir}",
        )
