"""Tests for the foai.audit_ledger writer library."""
from __future__ import annotations

import os
from datetime import datetime, timezone

# Force test env BEFORE imports
os.environ.setdefault("FOAI_AUDIT_LEDGER_URL", "sqlite:///:memory:")
os.environ.setdefault("FOAI_PII_SALT", "test-salt-32-bytes-of-padding-here")

import pytest  # noqa: E402
from sqlalchemy import create_engine, select  # noqa: E402

from runtime.audit_ledger import models  # noqa: E402
from runtime.audit_ledger import redactors  # noqa: E402
from runtime.audit_ledger.config import WriterSettings  # noqa: E402
from runtime.audit_ledger.writer import AuditWriter, reset_default_engine_for_tests  # noqa: E402


@pytest.fixture
def settings() -> WriterSettings:
    return WriterSettings()


@pytest.fixture
def engine():
    """Fresh SQLite in-memory engine per test."""
    models.drop_schema_prefix_for_sqlite("sqlite:///:memory:")
    eng = create_engine("sqlite:///:memory:", future=True, connect_args={"check_same_thread": False})
    return eng


@pytest.fixture
def writer(engine, settings):
    reset_default_engine_for_tests()
    w = AuditWriter(engine, settings)
    w.init_schema_for_tests()
    return w


# ─── Happy path ──────────────────────────────────────────────────────────


def test_write_returns_event_id(writer: AuditWriter) -> None:
    event_id = writer.write(agent="Iller_Ang", action="asset_generated")
    assert isinstance(event_id, str)
    assert len(event_id) == 32  # uuid4().hex


def test_write_round_trip(writer: AuditWriter, engine) -> None:
    eid = writer.write(
        agent="Iller_Ang",
        action="asset_generated",
        payload={"asset": "savannah_v3.mp4"},
    )
    with engine.connect() as conn:
        row = conn.execute(
            select(models.AuditEvent).where(models.AuditEvent.event_id == eid)
        ).mappings().one()
    assert row["agent"] == "Iller_Ang"
    assert row["action"] == "asset_generated"
    assert row["payload"] == {"asset": "savannah_v3.mp4"}
    assert row["customer_uid"] is None


# ─── PII hashing — the load-bearing Coastal-protection invariant ─────────


def test_customer_uid_hashed_before_write(writer: AuditWriter, engine) -> None:
    eid = writer.write(
        agent="Sal_Ang",
        action="order_completed",
        customer_uid="cust_alice@example.com",
    )
    with engine.connect() as conn:
        stored = conn.execute(
            select(models.AuditEvent.customer_uid).where(
                models.AuditEvent.event_id == eid
            )
        ).scalar_one()
    assert stored != "cust_alice@example.com"
    assert len(stored) == 64  # SHA-256 hex


def test_no_salt_with_uid_raises(engine) -> None:
    """Fail-closed: providing customer_uid with empty FOAI_PII_SALT must error."""
    s = WriterSettings(FOAI_PII_SALT="", TASKADE_PII_SALT=None)
    w = AuditWriter(engine, s)
    w.init_schema_for_tests()
    with pytest.raises(ValueError, match="refusing to write raw PII"):
        w.write(agent="Sal_Ang", action="leak_attempt", customer_uid="cust_raw")


def test_no_salt_without_uid_succeeds(engine) -> None:
    """Empty salt is fine if no customer_uid is provided."""
    s = WriterSettings(FOAI_PII_SALT="", TASKADE_PII_SALT=None)
    w = AuditWriter(engine, s)
    w.init_schema_for_tests()
    eid = w.write(agent="Iller_Ang", action="no_pii_action")
    assert isinstance(eid, str)


def test_payload_pii_key_auto_hashed(writer: AuditWriter, engine) -> None:
    """Values under PII-pattern keys in payload are hashed automatically."""
    eid = writer.write(
        agent="Sal_Ang",
        action="profile_update",
        payload={
            "non_pii_field": "ok to keep",
            "customer_email": "alice@example.com",
            "nested": {"phone_number": "+15551234567"},
        },
    )
    with engine.connect() as conn:
        payload = conn.execute(
            select(models.AuditEvent.payload).where(
                models.AuditEvent.event_id == eid
            )
        ).scalar_one()
    assert payload["non_pii_field"] == "ok to keep"
    assert payload["customer_email"].startswith("sha256:")
    assert "alice@example.com" not in str(payload)
    assert payload["nested"]["phone_number"].startswith("sha256:")
    assert "+15551234567" not in str(payload)


# ─── Canonicalization ────────────────────────────────────────────────────


def test_agent_canonicalization_strips_injection(writer: AuditWriter, engine) -> None:
    eid = writer.write(
        agent="Iller_Ang\x00<script>alert(1)</script>",
        action="asset_generated",
    )
    with engine.connect() as conn:
        agent = conn.execute(
            select(models.AuditEvent.agent).where(models.AuditEvent.event_id == eid)
        ).scalar_one()
    assert "<" not in agent
    assert ">" not in agent
    assert "\x00" not in agent
    assert "Iller_Ang" in agent


def test_empty_agent_raises(writer: AuditWriter) -> None:
    with pytest.raises(ValueError, match="agent name empty"):
        writer.write(agent="!!!@@@", action="action")


def test_empty_action_raises(writer: AuditWriter) -> None:
    with pytest.raises(ValueError, match="action empty"):
        writer.write(agent="Iller_Ang", action="!!!@@@")


def test_action_length_bounded(writer: AuditWriter, engine) -> None:
    long_action = "a" * 500
    eid = writer.write(agent="Iller_Ang", action=long_action)
    with engine.connect() as conn:
        action = conn.execute(
            select(models.AuditEvent.action).where(models.AuditEvent.event_id == eid)
        ).scalar_one()
    assert len(action) == 256


# ─── Direct redactor unit tests ──────────────────────────────────────────


def test_hash_customer_uid_returns_none_for_empty() -> None:
    assert redactors.hash_customer_uid(None, "salt") is None
    assert redactors.hash_customer_uid("", "salt") is None


def test_hash_customer_uid_deterministic() -> None:
    a = redactors.hash_customer_uid("cust_alice", "test-salt")
    b = redactors.hash_customer_uid("cust_alice", "test-salt")
    assert a == b
    assert len(a) == 64


def test_redact_payload_empty() -> None:
    assert redactors.redact_payload(None, "salt") == {}
    assert redactors.redact_payload({}, "salt") == {}


def test_redact_payload_passes_non_pii() -> None:
    payload = {"asset": "file.mp4", "duration": 90}
    assert redactors.redact_payload(payload, "salt") == payload


def test_redact_payload_no_salt_uses_placeholder() -> None:
    payload = {"customer_email": "alice@example.com"}
    out = redactors.redact_payload(payload, "")
    assert out["customer_email"] == "<redacted:no_salt>"


def test_redact_payload_walks_lists() -> None:
    payload = {"items": [{"customer_id": "a"}, {"customer_id": "b"}]}
    out = redactors.redact_payload(payload, "salt")
    assert out["items"][0]["customer_id"].startswith("sha256:")
    assert out["items"][1]["customer_id"].startswith("sha256:")
    assert out["items"][0]["customer_id"] != out["items"][1]["customer_id"]
