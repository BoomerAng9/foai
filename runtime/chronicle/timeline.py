"""
Chronicle Timeline Indexer — Wave 4
====================================
Structured timeline recording for the FOAI agent fleet.
Uses Neon PostgreSQL with a dedicated `chronicle` schema.

Adapted from Intelligent-Internet/Common_Chronicle event model patterns.
Does NOT import Chronicle's heavy dependencies — uses asyncpg directly.

API:
    record_event(agent_name, task_id, event_type, payload) -> dict
    get_timeline(task_id) -> list[dict]
    get_agent_timeline(agent_name, since) -> list[dict]
"""

from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

try:
    import asyncpg
except ImportError:
    asyncpg = None  # type: ignore[assignment]


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
CHRONICLE_SCHEMA: str = "chronicle"


# ---------------------------------------------------------------------------
# Connection pool (lazy singleton)
# ---------------------------------------------------------------------------

_pool: Optional[asyncpg.Pool] = None  # type: ignore[name-defined]
_pool_lock = asyncio.Lock()


async def _get_pool() -> asyncpg.Pool:  # type: ignore[name-defined]
    """Return (and lazily create) the connection pool."""
    global _pool
    if _pool is not None:
        return _pool
    async with _pool_lock:
        if _pool is not None:
            return _pool
        if asyncpg is None:
            raise RuntimeError("asyncpg is not installed — run: pip install asyncpg")
        if not DATABASE_URL:
            raise RuntimeError(
                "DATABASE_URL is not set. "
                "Export it or set it before importing chronicle.timeline."
            )
        dsn = DATABASE_URL
        # Neon requires sslmode
        if "neon.tech" in dsn and "sslmode" not in dsn:
            sep = "&" if "?" in dsn else "?"
            dsn += f"{sep}sslmode=require"
        _pool = await asyncpg.create_pool(dsn, min_size=1, max_size=5)
        await _ensure_schema(_pool)
        return _pool


async def _ensure_schema(pool: asyncpg.Pool) -> None:  # type: ignore[name-defined]
    """Create the chronicle schema and events table if they don't exist."""
    async with pool.acquire() as conn:
        await conn.execute(f"CREATE SCHEMA IF NOT EXISTS {CHRONICLE_SCHEMA}")
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS {CHRONICLE_SCHEMA}.events (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                agent_name  TEXT NOT NULL,
                task_id     TEXT NOT NULL,
                event_type  TEXT NOT NULL,
                payload     JSONB NOT NULL DEFAULT '{{}}'::jsonb,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)
        # Indexes for the two main query patterns
        await conn.execute(f"""
            CREATE INDEX IF NOT EXISTS idx_events_task_id
                ON {CHRONICLE_SCHEMA}.events (task_id, created_at)
        """)
        await conn.execute(f"""
            CREATE INDEX IF NOT EXISTS idx_events_agent_name
                ON {CHRONICLE_SCHEMA}.events (agent_name, created_at)
        """)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def record_event(
    agent_name: str,
    task_id: str,
    event_type: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Write a structured timeline entry.

    Returns the created event as a dict with keys:
        id, agent_name, task_id, event_type, payload, created_at
    """
    pool = await _get_pool()
    event_id = str(uuid.uuid4())
    payload_json = json.dumps(payload or {})
    now = datetime.now(timezone.utc)

    async with pool.acquire() as conn:
        await conn.execute(
            f"""
            INSERT INTO {CHRONICLE_SCHEMA}.events
                (id, agent_name, task_id, event_type, payload, created_at)
            VALUES ($1, $2, $3, $4, $5::jsonb, $6)
            """,
            uuid.UUID(event_id),
            agent_name,
            task_id,
            event_type,
            payload_json,
            now,
        )

    return {
        "id": event_id,
        "agent_name": agent_name,
        "task_id": task_id,
        "event_type": event_type,
        "payload": payload or {},
        "created_at": now.isoformat(),
    }


async def get_timeline(task_id: str) -> list[dict[str, Any]]:
    """
    Return all events for a task, ordered chronologically.
    """
    pool = await _get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT id, agent_name, task_id, event_type, payload, created_at
            FROM {CHRONICLE_SCHEMA}.events
            WHERE task_id = $1
            ORDER BY created_at ASC
            """,
            task_id,
        )
    return [_row_to_dict(r) for r in rows]


async def get_agent_timeline(
    agent_name: str,
    since: datetime | str | None = None,
) -> list[dict[str, Any]]:
    """
    Return events for a specific agent, optionally filtered by time.

    ``since`` can be a datetime object or an ISO-8601 string.
    """
    pool = await _get_pool()

    if since is not None:
        if isinstance(since, str):
            since = datetime.fromisoformat(since)
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                f"""
                SELECT id, agent_name, task_id, event_type, payload, created_at
                FROM {CHRONICLE_SCHEMA}.events
                WHERE agent_name = $1 AND created_at >= $2
                ORDER BY created_at ASC
                """,
                agent_name,
                since,
            )
    else:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                f"""
                SELECT id, agent_name, task_id, event_type, payload, created_at
                FROM {CHRONICLE_SCHEMA}.events
                WHERE agent_name = $1
                ORDER BY created_at ASC
                """,
                agent_name,
            )
    return [_row_to_dict(r) for r in rows]


async def close() -> None:
    """Shut down the connection pool (call on app exit)."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _row_to_dict(row: asyncpg.Record) -> dict[str, Any]:  # type: ignore[name-defined]
    """Convert an asyncpg Record to a plain dict."""
    d = dict(row)
    d["id"] = str(d["id"])
    if isinstance(d.get("created_at"), datetime):
        d["created_at"] = d["created_at"].isoformat()
    if isinstance(d.get("payload"), str):
        d["payload"] = json.loads(d["payload"])
    return d
