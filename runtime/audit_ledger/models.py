"""SQLAlchemy models for foai.audit_ledger.

Single source of truth — promoted from
`services/taskade_sync_worker/ledger_reader.py` so writer (Track B) +
reader (Phase 5 sync worker) + HRPMO loop (Phase 6) all share one
model definition. Schema DDL lives at
`services/taskade_sync_worker/schema/audit_ledger.sql`.

Postgres-first; SQLite-tolerant for tests via column-type variants
(JSONB → JSON, UUID → String).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Single declarative base for every FOAI service that touches the ledger."""


def _portable_json() -> Any:
    return JSONB().with_variant(JSON(), "sqlite")


def _portable_uuid() -> Any:
    return UUID(as_uuid=False).with_variant(String(36), "sqlite")


class AuditEvent(Base):
    __tablename__ = "audit_ledger"
    __table_args__ = {"schema": "foai"}

    event_id = Column(_portable_uuid(), primary_key=True)
    agent = Column(Text, nullable=False)
    action = Column(Text, nullable=False)
    payload = Column(_portable_json(), nullable=False, default=dict)
    customer_uid = Column(Text, nullable=True)
    timestamp_event = Column(DateTime(timezone=True), nullable=False)
    synced_to_taskade_at = Column(DateTime(timezone=True), nullable=True)
    sync_attempt_count = Column(Integer, nullable=False, default=0)
    last_sync_error = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


def drop_schema_prefix_for_sqlite(database_url: str) -> None:
    """Translate the foai. schema prefix into a plain table name on SQLite.

    Production Postgres uses the real schema. SQLite ignores schemas, so the
    test path must remove the prefix before metadata creation.

    Called once per test-engine init; idempotent.
    """
    if database_url.startswith("sqlite"):
        AuditEvent.__table__.schema = None  # type: ignore[assignment]
