"""Forge Chronicle — Ledger (internal audit artifact emitter).

Phase 5 implementation. Defines the interface for internal audit emission.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import UUID


@dataclass(frozen=True)
class LedgerEntry:
    """Internal audit record for a Forge run."""

    run_id: UUID
    workflow_id: str
    timestamp: datetime
    step_results: dict[str, Any]
    gate_verdicts: dict[str, bool]


class LedgerEmitter:
    """Emits Ledger entries for internal audit.

    Ledgers capture full step-by-step results and gate verdicts
    for compliance and debugging.
    """

    async def emit(
        self,
        run_id: UUID,
        workflow_id: str,
        outputs: dict[str, Any],
    ) -> LedgerEntry:
        """Create and persist a Ledger entry.

        Args:
            run_id: UUID of the Forge run.
            workflow_id: Workflow that produced this entry.
            outputs: Collected step outputs.

        Returns:
            The emitted LedgerEntry.
        """
        gate_verdicts: dict[str, bool] = {}
        for step_id, step_output in outputs.items():
            if isinstance(step_output, dict) and "gate_results" in step_output:
                gate_verdicts.update(step_output["gate_results"])

        return LedgerEntry(
            run_id=run_id,
            workflow_id=workflow_id,
            timestamp=datetime.now(tz=timezone.utc),
            step_results=outputs,
            gate_verdicts=gate_verdicts,
        )
