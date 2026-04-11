"""Forge Chronicle — Ledger (internal audit artifact emitter).

Generates an internal audit JSON record with full step-by-step execution log,
gate results with timing, adapter used for each step, and error details.
Persists to Neon forge.chronicles table.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from forge.core.schema import ForgeRun

logger = logging.getLogger("forge.chronicle.ledger")


class LedgerEmitter:
    """Emits Ledger entries for internal audit.

    Ledgers are structured JSON records capturing full step-by-step results,
    gate verdicts with timing, and adapter details for compliance and debugging.
    Persisted to forge.chronicles table.
    """

    async def emit(
        self,
        run: ForgeRun,
        gate_results: Optional[dict[str, Any]] = None,
    ) -> str:
        """Create and persist a Ledger entry.

        Args:
            run: The completed ForgeRun.
            gate_results: Gate validation results (optional).

        Returns:
            The ledger content as a JSON string.
        """
        now = datetime.now(tz=timezone.utc)
        gate_results = gate_results or run.outputs.get("gate", {})

        # Build the ledger record
        ledger = self._build_ledger(
            run=run,
            gate_results=gate_results,
            timestamp=now,
        )

        ledger_json = json.dumps(ledger, indent=2, default=str)

        # Persist to Neon (import here to reuse charter's persistence fn)
        from forge.chronicle.charter import _persist_to_neon
        persisted = await _persist_to_neon(
            run_id=str(run.id),
            workflow_id=run.workflow_id,
            chronicle_type="ledger",
            content=ledger_json,
        )
        if persisted:
            logger.info("Ledger persisted to Neon for run %s", run.id)
        else:
            logger.info("Ledger generated (not persisted) for run %s", run.id)

        return ledger_json

    def _build_ledger(
        self,
        run: ForgeRun,
        gate_results: dict[str, Any],
        timestamp: datetime,
    ) -> dict[str, Any]:
        """Build the ledger JSON structure.

        Args:
            run: The ForgeRun.
            gate_results: Gate results dict.
            timestamp: Generation timestamp.

        Returns:
            Dict representing the ledger record.
        """
        # Extract adapter info from step outputs
        step_log: list[dict[str, Any]] = []
        for step_id, output in run.outputs.items():
            entry: dict[str, Any] = {"step_id": step_id}
            if isinstance(output, dict):
                entry["status"] = output.get("status", "unknown")
                entry["adapter"] = output.get("adapter")
                if "result" in output and isinstance(output["result"], dict):
                    entry["exit_code"] = output["result"].get("exit_code")
                    entry["duration_ms"] = output["result"].get("duration_ms")
                    entry["files_changed"] = output["result"].get("files_changed", [])
                if "gate_results" in output:
                    entry["gate_results"] = output["gate_results"]
                if "error" in output:
                    entry["error"] = output["error"]
            else:
                entry["raw_output"] = str(output)
            step_log.append(entry)

        # Extract gate timing from GateOutput objects
        gate_detail: dict[str, Any] = {}
        if isinstance(gate_results, dict):
            for gate_name, gate_val in gate_results.items():
                if isinstance(gate_val, dict):
                    gate_detail[gate_name] = {
                        "passed": gate_val.get("passed", False),
                        "duration_ms": gate_val.get("duration_ms", 0),
                    }
                elif hasattr(gate_val, "passed"):
                    gate_detail[gate_name] = {
                        "passed": gate_val.passed,
                        "duration_ms": getattr(gate_val, "duration_ms", 0),
                    }
                else:
                    gate_detail[gate_name] = {"passed": bool(gate_val)}

        return {
            "type": "ledger",
            "version": "1.0",
            "run_id": str(run.id),
            "workflow_id": run.workflow_id,
            "task_id": run.task_id,
            "state": run.state.value,
            "timestamp": timestamp.isoformat(),
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "error": run.error,
            "step_log": step_log,
            "gate_results": gate_detail,
            "inputs": run.inputs,
        }
