"""Writer for foai.audit_ledger.

Library entry-point: `write_event(agent, action, payload=..., customer_uid=...)`.
Default engine resolves from env; tests inject their own engine via AuditWriter.

Defense in depth (per memory `feedback_secure_coastal_in_all_ways_during_foai_work_2026_05_15`):
- customer_uid SHA-256 hashed with FOAI_PII_SALT before write
- payload values under PII-pattern keys auto-hashed
- agent + action canonicalized (control chars stripped, length bounded)
- writer refuses to write raw UIDs when salt is empty (fail-closed)
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from .config import WriterSettings
from .models import AuditEvent, Base, drop_schema_prefix_for_sqlite
from .redactors import (
    canonicalize_action,
    canonicalize_agent,
    hash_customer_uid,
    redact_payload,
)

log = logging.getLogger("foai.runtime.audit_ledger.writer")

# Module-level lazy singleton engine. Tests override via AuditWriter(engine=...).
_DEFAULT_ENGINE: Optional[Engine] = None
_DEFAULT_SETTINGS: Optional[WriterSettings] = None


def _get_default_engine() -> tuple[Engine, WriterSettings]:
    """Resolve + cache the module-level engine. Idempotent."""
    global _DEFAULT_ENGINE, _DEFAULT_SETTINGS
    if _DEFAULT_ENGINE is not None and _DEFAULT_SETTINGS is not None:
        return _DEFAULT_ENGINE, _DEFAULT_SETTINGS

    settings = WriterSettings()
    database_url = settings.resolved_database_url()
    drop_schema_prefix_for_sqlite(database_url)
    connect_args: dict[str, Any] = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    engine = create_engine(database_url, connect_args=connect_args, future=True)
    _DEFAULT_ENGINE = engine
    _DEFAULT_SETTINGS = settings
    return engine, settings


def reset_default_engine_for_tests() -> None:
    """Force the module-level singleton to re-resolve on the next call.

    Only call from tests — production should hold the engine for the process
    lifetime.
    """
    global _DEFAULT_ENGINE, _DEFAULT_SETTINGS
    _DEFAULT_ENGINE = None
    _DEFAULT_SETTINGS = None


# ─── Library entry-point ─────────────────────────────────────────────────


def write_event(
    agent: str,
    action: str,
    payload: dict[str, Any] | None = None,
    customer_uid: str | None = None,
    timestamp_event: datetime | None = None,
) -> str:
    """Write one audit event. Returns the event_id (UUID hex).

    Coastal-protection invariants:
      - customer_uid is SHA-256 hashed with FOAI_PII_SALT before write
      - payload values under PII-pattern keys are auto-hashed
      - agent + action are canonicalized (stripped + length-bounded)
      - if FOAI_PII_SALT is empty and customer_uid is provided, write fails closed
    """
    engine, settings = _get_default_engine()
    return AuditWriter(engine, settings).write(
        agent=agent,
        action=action,
        payload=payload,
        customer_uid=customer_uid,
        timestamp_event=timestamp_event,
    )


# ─── Class form — explicit DI for tests + cross-service callers ───────────


class AuditWriter:
    """Engine-and-salt-bound writer. Use the module-level write_event() for
    standard callers; instantiate AuditWriter directly for tests or for
    services that need an isolated engine.
    """

    def __init__(self, engine: Engine, settings: Optional[WriterSettings] = None):
        self._engine = engine
        self._settings = settings or WriterSettings()

    def init_schema_for_tests(self) -> None:
        """Create the audit_ledger table on the bound engine. NEVER call against Postgres."""
        Base.metadata.create_all(self._engine)

    def write(
        self,
        *,
        agent: str,
        action: str,
        payload: dict[str, Any] | None = None,
        customer_uid: str | None = None,
        timestamp_event: datetime | None = None,
    ) -> str:
        pii_salt = self._settings.resolved_pii_salt()

        # Fail-closed: refuse to write a raw UID without a salt
        if customer_uid and not pii_salt:
            raise ValueError(
                "audit_ledger: customer_uid provided but FOAI_PII_SALT is empty — "
                "refusing to write raw PII (fail-closed)."
            )

        clean_agent = canonicalize_agent(agent)
        clean_action = canonicalize_action(action)
        if not clean_agent:
            raise ValueError("audit_ledger: agent name empty after canonicalization")
        if not clean_action:
            raise ValueError("audit_ledger: action empty after canonicalization")

        clean_payload = redact_payload(payload, pii_salt)
        hashed_uid = hash_customer_uid(customer_uid, pii_salt)
        ts_event = timestamp_event or datetime.now(timezone.utc)

        event_id = uuid.uuid4().hex
        event = AuditEvent(
            event_id=event_id,
            agent=clean_agent,
            action=clean_action,
            payload=clean_payload,
            customer_uid=hashed_uid,
            timestamp_event=ts_event,
            sync_attempt_count=0,
        )
        with Session(self._engine) as session:
            session.add(event)
            session.commit()
        log.info(
            "audit_ledger write: event_id=%s agent=%s action=%s",
            event_id, clean_agent, clean_action,
        )
        return event_id
