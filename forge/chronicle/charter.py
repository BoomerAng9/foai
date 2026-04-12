"""Forge Chronicle — Charter (customer-facing artifact emitter).

Generates a customer-facing markdown document summarizing what was built,
quality gates passed, and ingot tier achieved. Persists to Neon forge.chronicles.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

from forge.core.schema import ForgeRun

logger = logging.getLogger("forge.chronicle.charter")

_CHRONICLES_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS forge.chronicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES forge.runs(id),
    workflow_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('charter', 'ledger')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""
_CHRONICLES_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_forge_chronicles_run_id ON forge.chronicles (run_id);
"""


async def _persist_to_neon(
    run_id: str,
    workflow_id: str,
    chronicle_type: str,
    content: str,
) -> bool:
    """Persist a chronicle entry to Neon forge.chronicles table.

    Returns True if persisted, False if database is unavailable.
    """
    dsn = os.environ.get("FORGE_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not dsn:
        logger.warning("No database URL configured, skipping chronicle persistence")
        return False

    try:
        import asyncpg
        conn = await asyncpg.connect(dsn)
        try:
            await conn.execute("CREATE SCHEMA IF NOT EXISTS forge;")
            await conn.execute(_CHRONICLES_TABLE_SQL)
            await conn.execute(_CHRONICLES_INDEX_SQL)
            await conn.execute(
                """
                INSERT INTO forge.chronicles (run_id, workflow_id, type, content)
                VALUES ($1::uuid, $2, $3, $4)
                """,
                str(run_id),
                workflow_id,
                chronicle_type,
                content,
            )
            return True
        finally:
            await conn.close()
    except Exception as exc:
        logger.warning("Failed to persist chronicle to Neon: %s", exc)
        return False


class CharterEmitter:
    """Emits Charter artifacts for customer consumption.

    Charters are human-readable markdown summaries of what was built, changed,
    and validated during a Forge run. Persisted to forge.chronicles table.
    """

    async def emit(
        self,
        run: ForgeRun,
        workflow_description: str = "",
        gate_results: Optional[dict[str, Any]] = None,
    ) -> str:
        """Create and persist a Charter artifact.

        Args:
            run: The completed ForgeRun.
            workflow_description: Human-readable description of the workflow.
            gate_results: Gate validation results (optional).

        Returns:
            The charter content as a markdown string.
        """
        now = datetime.now(tz=timezone.utc)
        gate_results = gate_results or run.outputs.get("gate", {})

        # Build the charter markdown
        charter = self._build_charter(
            run=run,
            workflow_description=workflow_description,
            gate_results=gate_results,
            timestamp=now,
        )

        # Persist to Neon
        persisted = await _persist_to_neon(
            run_id=str(run.id),
            workflow_id=run.workflow_id,
            chronicle_type="charter",
            content=charter,
        )
        if persisted:
            logger.info("Charter persisted to Neon for run %s", run.id)
        else:
            logger.info("Charter generated (not persisted) for run %s", run.id)

        return charter

    def _build_charter(
        self,
        run: ForgeRun,
        workflow_description: str,
        gate_results: dict[str, Any],
        timestamp: datetime,
    ) -> str:
        """Build the charter markdown content.

        Args:
            run: The ForgeRun.
            workflow_description: Description text.
            gate_results: Gate results dict.
            timestamp: Generation timestamp.

        Returns:
            Markdown string.
        """
        lines: list[str] = [
            f"# Forge Charter — {run.workflow_id}",
            "",
            f"**Run ID:** `{run.id}`",
            f"**Task:** `{run.task_id}`",
            f"**Timestamp:** {timestamp.isoformat()}",
            "",
            "## What Was Built",
            "",
            workflow_description or f"Workflow `{run.workflow_id}` completed successfully.",
            "",
        ]

        # Summarize outputs
        if run.outputs:
            lines.append("## Execution Summary")
            lines.append("")
            for step_id, output in run.outputs.items():
                if isinstance(output, dict):
                    status = output.get("status", "completed")
                    lines.append(f"- **{step_id}**: {status}")
                else:
                    lines.append(f"- **{step_id}**: {output}")
            lines.append("")

        # Gate results
        if gate_results:
            lines.append("## Quality Gates")
            lines.append("")
            if isinstance(gate_results, dict):
                gate_detail = gate_results.get("gate_results", gate_results)
                if isinstance(gate_detail, dict):
                    for gate_name, passed in gate_detail.items():
                        status = "PASS" if passed else "FAIL"
                        lines.append(f"- **{gate_name}**: {status}")
            lines.append("")

        # Ingot tier
        for step_id, output in run.outputs.items():
            if isinstance(output, dict) and "to_tier" in output:
                lines.append(f"## Ingot Tier: {output['to_tier']}")
                lines.append("")
                break

        lines.append("---")
        lines.append("*Generated by Forge Harness (Smelter OS)*")
        return "\n".join(lines)
