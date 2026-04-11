"""Forge state — async run state persistence to Neon (PostgreSQL)."""

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Optional
from uuid import UUID, uuid4

from forge.core.schema import ForgeRun, RunState

# SQL for auto-creating the forge schema and runs table.
_CREATE_SCHEMA_SQL = "CREATE SCHEMA IF NOT EXISTS forge;"
_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS forge.runs (
    id UUID PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'pending',
    current_step_index INTEGER NOT NULL DEFAULT 0,
    inputs JSONB NOT NULL DEFAULT '{}',
    outputs JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""
_CREATE_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_forge_runs_workflow_id ON forge.runs (workflow_id);
"""


def _get_connection_string() -> str:
    """Resolve the database connection string from environment.

    Falls back from FORGE_DATABASE_URL to DATABASE_URL.

    Raises:
        RuntimeError: If no connection string is configured.
    """
    url = os.environ.get("FORGE_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        msg = (
            "No database connection string found. "
            "Set FORGE_DATABASE_URL or DATABASE_URL environment variable."
        )
        raise RuntimeError(msg)
    return url


class ForgeStateStore:
    """Async state store for Forge runs, backed by Neon PostgreSQL.

    Uses asyncpg for non-blocking database operations.
    Auto-creates the forge.runs table on first use.
    """

    def __init__(self, connection_string: Optional[str] = None) -> None:
        self._connection_string = connection_string
        self._pool: Any = None  # asyncpg.Pool, typed as Any to avoid import at module level
        self._initialized: bool = False

    async def _get_pool(self) -> Any:
        """Get or create the connection pool."""
        if self._pool is None:
            import asyncpg

            dsn = self._connection_string or _get_connection_string()
            self._pool = await asyncpg.create_pool(dsn, min_size=1, max_size=5)
        return self._pool

    async def _ensure_schema(self) -> None:
        """Create the forge schema and runs table if they don't exist."""
        if self._initialized:
            return
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            await conn.execute(_CREATE_SCHEMA_SQL)
            await conn.execute(_CREATE_TABLE_SQL)
            await conn.execute(_CREATE_INDEX_SQL)
        self._initialized = True

    async def create_run(
        self,
        workflow_id: str,
        task_id: str,
        inputs: dict[str, Any],
    ) -> ForgeRun:
        """Create a new Forge run and persist it.

        Args:
            workflow_id: The workflow being executed.
            task_id: External task or RFP fragment identifier.
            inputs: Workflow input parameters.

        Returns:
            The created ForgeRun with a new UUID.
        """
        await self._ensure_schema()
        run = ForgeRun(
            id=uuid4(),
            workflow_id=workflow_id,
            task_id=task_id,
            state=RunState.pending,
            current_step_index=0,
            inputs=inputs,
            outputs={},
            started_at=None,
            completed_at=None,
            error=None,
        )
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO forge.runs (id, workflow_id, task_id, state, current_step_index,
                                        inputs, outputs, started_at, completed_at, error)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """,
                run.id,
                run.workflow_id,
                run.task_id,
                run.state.value,
                run.current_step_index,
                json.dumps(run.inputs),
                json.dumps(run.outputs),
                run.started_at,
                run.completed_at,
                run.error,
            )
        return run

    async def get_run(self, run_id: UUID) -> Optional[ForgeRun]:
        """Retrieve a run by its ID.

        Args:
            run_id: UUID of the run.

        Returns:
            ForgeRun if found, None otherwise.
        """
        await self._ensure_schema()
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM forge.runs WHERE id = $1",
                run_id,
            )
        if row is None:
            return None
        return self._row_to_run(row)

    async def update_run(
        self,
        run_id: UUID,
        state: Optional[RunState] = None,
        current_step_index: Optional[int] = None,
        outputs: Optional[dict[str, Any]] = None,
        error: Optional[str] = None,
        started_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
    ) -> None:
        """Update fields on an existing run.

        Args:
            run_id: UUID of the run to update.
            state: New run state (if changing).
            current_step_index: New step index (if advancing).
            outputs: Updated outputs dict (if changed).
            error: Error message (if aborting).
            started_at: Run start time (if starting).
            completed_at: Run completion time (if finishing).
        """
        await self._ensure_schema()
        pool = await self._get_pool()

        # Build dynamic SET clauses
        set_parts: list[str] = []
        params: list[Any] = []
        param_idx = 1

        if state is not None:
            set_parts.append(f"state = ${param_idx}")
            params.append(state.value)
            param_idx += 1
        if current_step_index is not None:
            set_parts.append(f"current_step_index = ${param_idx}")
            params.append(current_step_index)
            param_idx += 1
        if outputs is not None:
            set_parts.append(f"outputs = ${param_idx}")
            params.append(json.dumps(outputs))
            param_idx += 1
        if error is not None:
            set_parts.append(f"error = ${param_idx}")
            params.append(error)
            param_idx += 1
        if started_at is not None:
            set_parts.append(f"started_at = ${param_idx}")
            params.append(started_at)
            param_idx += 1
        if completed_at is not None:
            set_parts.append(f"completed_at = ${param_idx}")
            params.append(completed_at)
            param_idx += 1

        if not set_parts:
            return

        params.append(run_id)
        sql = f"UPDATE forge.runs SET {', '.join(set_parts)} WHERE id = ${param_idx}"

        async with pool.acquire() as conn:
            await conn.execute(sql, *params)

    async def list_runs(
        self,
        workflow_id: Optional[str] = None,
        limit: int = 50,
    ) -> list[ForgeRun]:
        """List recent runs, optionally filtered by workflow.

        Args:
            workflow_id: Filter to a specific workflow (optional).
            limit: Max number of runs to return.

        Returns:
            List of ForgeRun objects, newest first.
        """
        await self._ensure_schema()
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            if workflow_id:
                rows = await conn.fetch(
                    "SELECT * FROM forge.runs WHERE workflow_id = $1 "
                    "ORDER BY created_at DESC LIMIT $2",
                    workflow_id,
                    limit,
                )
            else:
                rows = await conn.fetch(
                    "SELECT * FROM forge.runs ORDER BY created_at DESC LIMIT $1",
                    limit,
                )
        return [self._row_to_run(row) for row in rows]

    async def close(self) -> None:
        """Close the connection pool."""
        if self._pool is not None:
            await self._pool.close()
            self._pool = None
            self._initialized = False

    @staticmethod
    def _row_to_run(row: Any) -> ForgeRun:
        """Convert a database row to a ForgeRun model."""
        inputs_raw = row["inputs"]
        outputs_raw = row["outputs"]

        # asyncpg returns JSONB as dict directly, but handle string case too
        inputs = inputs_raw if isinstance(inputs_raw, dict) else json.loads(inputs_raw)
        outputs = outputs_raw if isinstance(outputs_raw, dict) else json.loads(outputs_raw)

        return ForgeRun(
            id=row["id"],
            workflow_id=row["workflow_id"],
            task_id=row["task_id"],
            state=RunState(row["state"]),
            current_step_index=row["current_step_index"],
            inputs=inputs,
            outputs=outputs,
            started_at=row["started_at"],
            completed_at=row["completed_at"],
            error=row["error"],
        )
