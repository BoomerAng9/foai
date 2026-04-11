"""Lil_Chronicle_Hawk — Charter (customer) + Ledger (audit) dual-emission.

Emits dual artifacts for every completed Forge run: a customer-facing Charter
and an internal audit Ledger. Persists both to Neon forge.chronicles table.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from forge.chronicle.charter import CharterEmitter
from forge.chronicle.ledger import LedgerEmitter
from forge.core.schema import ForgeRun

logger = logging.getLogger("forge.hawks.chronicle")


class ChronicleHawk:
    """Lil_Chronicle_Hawk: emits Charter and Ledger artifacts.

    Orchestrates dual-emission of customer-facing Charters and internal
    audit Ledgers for every Forge run. Both are persisted to the
    forge.chronicles Neon table.
    """

    name: str = "Lil_Chronicle_Hawk"
    role: str = "CHRONICLE"

    def __init__(
        self,
        charter_emitter: Optional[CharterEmitter] = None,
        ledger_emitter: Optional[LedgerEmitter] = None,
    ) -> None:
        self._charter = charter_emitter or CharterEmitter()
        self._ledger = ledger_emitter or LedgerEmitter()

    async def emit(
        self,
        run: ForgeRun,
        emit_types: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """Emit Charter and/or Ledger artifacts for a Forge run.

        Args:
            run: The completed ForgeRun with outputs.
            emit_types: Which artifacts to emit. Defaults to ["charter", "ledger"].

        Returns:
            Dict mapping emit type to the emitted content string.
        """
        if emit_types is None:
            emit_types = ["charter", "ledger"]

        results: dict[str, Any] = {}

        if "charter" in emit_types:
            logger.info("Emitting Charter for run %s", run.id)
            charter_content = await self._charter.emit(
                run=run,
                workflow_description=f"Workflow '{run.workflow_id}' run",
            )
            results["charter"] = charter_content
            logger.info("Charter emitted for run %s (%d chars)", run.id, len(charter_content))

        if "ledger" in emit_types:
            logger.info("Emitting Ledger for run %s", run.id)
            ledger_content = await self._ledger.emit(
                run=run,
                gate_results=run.outputs.get("gate", {}),
            )
            results["ledger"] = ledger_content
            logger.info("Ledger emitted for run %s (%d chars)", run.id, len(ledger_content))

        return results
