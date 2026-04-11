"""Forge Chronicle — Charter (customer-facing artifact emitter).

Phase 5 implementation. Defines the interface for customer-facing artifact emission.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID


@dataclass(frozen=True)
class Charter:
    """Customer-facing artifact summarizing the Forge run outcome."""

    run_id: UUID
    workflow_id: str
    summary: str
    artifacts: dict[str, Any]


class CharterEmitter:
    """Emits Charter artifacts for customer consumption.

    Charters are human-readable summaries of what was built, changed,
    and validated during a Forge run.
    """

    async def emit(
        self,
        run_id: UUID,
        workflow_id: str,
        outputs: dict[str, Any],
    ) -> Charter:
        """Create and persist a Charter artifact.

        Args:
            run_id: UUID of the Forge run.
            workflow_id: Workflow that produced this charter.
            outputs: Collected step outputs.

        Returns:
            The emitted Charter.
        """
        summary = f"Forge run {run_id} completed workflow '{workflow_id}'"
        return Charter(
            run_id=run_id,
            workflow_id=workflow_id,
            summary=summary,
            artifacts=outputs,
        )
