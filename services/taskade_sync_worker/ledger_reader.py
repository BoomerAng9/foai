"""SQLAlchemy-backed reader for foai.audit_ledger.

Models live at `runtime/audit_ledger/models.py` (shared source of truth between
writer + reader + HRPMO loop). This module owns reader-side concerns:
session lifecycle, fetch_unsynced, mark_synced, mark_failed, and the
to_render_params projection consumed by the Taskade adapter.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import create_engine, select, update
from sqlalchemy.orm import Session

from runtime.audit_ledger.models import (
    AuditEvent,
    Base,
    drop_schema_prefix_for_sqlite,
)

log = logging.getLogger("taskade.sync_worker.ledger_reader")

# Re-export so existing test imports
# (`from services.taskade_sync_worker.ledger_reader import AuditEvent, Base`)
# continue to resolve.
__all__ = ["AuditEvent", "Base", "LedgerReader"]


class LedgerReader:
    """Owns the DB engine + session lifecycle for the sync worker."""

    def __init__(self, database_url: str):
        connect_args: dict[str, Any] = {}
        if database_url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        self._engine = create_engine(database_url, connect_args=connect_args, future=True)
        # For SQLite tests, the foai schema is virtual — translate to a plain
        # table name in the connection. Production Postgres uses the real schema.
        drop_schema_prefix_for_sqlite(database_url)

    def init_schema_for_tests(self) -> None:
        """Create the audit_ledger table on SQLite. NEVER call against Postgres."""
        Base.metadata.create_all(self._engine)

    def fetch_unsynced(self, limit: int = 100) -> list[AuditEvent]:
        with Session(self._engine) as session:
            stmt = (
                select(AuditEvent)
                .where(AuditEvent.synced_to_taskade_at.is_(None))
                .order_by(AuditEvent.timestamp_event.asc())
                .limit(limit)
            )
            rows = list(session.scalars(stmt))
            session.expunge_all()
            return rows

    def mark_synced(self, event_id: str) -> None:
        with Session(self._engine) as session:
            session.execute(
                update(AuditEvent)
                .where(AuditEvent.event_id == event_id)
                .values(
                    synced_to_taskade_at=datetime.now(timezone.utc),
                    last_sync_error=None,
                )
            )
            session.commit()

    def mark_failed(self, event_id: str, error_message: str) -> None:
        """Increment sync_attempt_count and record the error; row stays unsynced."""
        with Session(self._engine) as session:
            row = session.get(AuditEvent, event_id)
            if row is None:
                log.warning("mark_failed: event_id=%s not found", event_id)
                return
            row.sync_attempt_count = (row.sync_attempt_count or 0) + 1
            row.last_sync_error = error_message[:1000]
            session.commit()

    def insert_for_tests(
        self,
        *,
        event_id: str,
        agent: str,
        action: str,
        payload: Optional[dict[str, Any]] = None,
        customer_uid: Optional[str] = None,
        timestamp_event: Optional[datetime] = None,
    ) -> None:
        """Test-only helper to seed audit events."""
        with Session(self._engine) as session:
            event = AuditEvent(
                event_id=event_id,
                agent=agent,
                action=action,
                payload=payload or {},
                customer_uid=customer_uid,
                timestamp_event=timestamp_event or datetime.now(timezone.utc),
                sync_attempt_count=0,
            )
            session.add(event)
            session.commit()

    @staticmethod
    def to_render_params(
        event: AuditEvent, surface: str = "client_tier"
    ) -> dict[str, Any]:
        """Project an AuditEvent into the audit_event.render_html capability schema."""
        payload = event.payload
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                payload = {"raw": payload}
        return {
            "event_id": str(event.event_id),
            "agent": event.agent,
            "action": event.action,
            "payload": payload or {},
            "timestamp": event.timestamp_event.isoformat()
            if isinstance(event.timestamp_event, datetime)
            else str(event.timestamp_event),
            "surface": surface,
            "customer_uid": event.customer_uid,
        }
