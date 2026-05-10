"""Ledger writes for TTD-DR.

Appends cycles to `ledgers.ttd_dr_cycles` (JSONB array) and writes ICAR
entries to `ledger_entries`. Both tables from @aims/contracts (PR 2).
"""

from __future__ import annotations

import json
import os
from contextlib import contextmanager
from typing import Any, Iterator

import psycopg
import structlog

from schemas import Stage, TtdDrCycle

logger = structlog.get_logger("ttd_dr.ledger")


def _resolve_db_url() -> str:
    url = (
        os.getenv("TTD_DR_DATABASE_URL")
        or os.getenv("CONTRACTS_DATABASE_URL")
        or os.getenv("NEON_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or ""
    )
    if not url:
        raise RuntimeError(
            "[ttd-dr] No database URL — set TTD_DR_DATABASE_URL, "
            "CONTRACTS_DATABASE_URL, NEON_DATABASE_URL, or DATABASE_URL"
        )
    return url


@contextmanager
def _conn() -> Iterator[psycopg.Connection]:
    url = _resolve_db_url()
    with psycopg.connect(url, autocommit=False) as connection:
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise


def append_cycle(engagement_id: str, cycle: TtdDrCycle) -> None:
    """Append one cycle to ledgers.ttd_dr_cycles (JSONB array)."""

    payload = json.loads(cycle.model_dump_json(by_alias=True))
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE ledgers
               SET ttd_dr_cycles = COALESCE(ttd_dr_cycles, '[]'::jsonb) || %s::jsonb
             WHERE id = %s
            """,
            (json.dumps([payload]), engagement_id),
        )
        if cur.rowcount == 0:
            # Ledger row must already exist (created via @aims/contracts.createEngagement).
            # If absent, we cannot silently create one here — that would bypass Charter.
            logger.warning(
                "ledger_missing_on_cycle_append",
                engagement_id=engagement_id,
                stage=cycle.stage.value,
            )
            raise RuntimeError(
                f"Ledger row for engagement '{engagement_id}' does not exist. "
                "Create it via @aims/contracts.createEngagement before running TTD-DR."
            )


def append_icar(
    engagement_id: str,
    stage: Stage,
    intent: str,
    context: str,
    action: str,
    result: str,
    confidence: float,
    source_attribution: list[dict[str, Any]] | None = None,
) -> None:
    """Append an ICAR entry to ledger_entries (one per cycle, audit-friendly)."""

    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ledger_entries (
                ledger_id, stage, entry_type,
                intent, context, action, result,
                confidence, owner, source_attribution
            ) VALUES (%s, %s, 'ICAR', %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                engagement_id,
                stage.value,
                intent,
                context,
                action,
                result,
                confidence,
                "ttd_dr",
                json.dumps(source_attribution) if source_attribution else None,
            ),
        )


def append_fdh_entry(
    engagement_id: str,
    stage: Stage,
    trigger: str,
    foster: str,
    develop: str,
    hone: str,
    resolution: str,
) -> None:
    """FDH ticket — fires when a cycle fails its confidence threshold."""

    payload = {
        "trigger": trigger,
        "foster": foster,
        "develop": develop,
        "hone": hone,
        "resolution": resolution,
    }
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ledger_entries (
                ledger_id, stage, entry_type, owner, payload
            ) VALUES (%s, %s, 'FDH', 'ttd_dr', %s::jsonb)
            """,
            (engagement_id, stage.value, json.dumps(payload)),
        )
