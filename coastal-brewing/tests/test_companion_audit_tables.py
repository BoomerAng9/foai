"""Schema + CRUD tests for the 4 companion tables added to audit_ledger.db."""
from __future__ import annotations

import sqlite3
import sys
import time
from pathlib import Path

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

import audit_ledger  # noqa: E402


@pytest.fixture
def db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_ledger.db"
    schema_path = Path(__file__).resolve().parents[1] / "memory" / "audit_ledger_schema.sql"
    monkeypatch.setattr(audit_ledger, "DB_PATH", db_path)
    monkeypatch.setattr(audit_ledger, "SCHEMA_PATH", schema_path)
    monkeypatch.setattr(audit_ledger, "_initialized", False)
    conn = audit_ledger._connect()
    try:
        conn.executescript(schema_path.read_text(encoding="utf-8"))
        audit_ledger._migrate(conn)
        conn.commit()
    finally:
        conn.close()
    # mark initialized so CRUD helpers skip re-init but use the patched DB_PATH
    monkeypatch.setattr(audit_ledger, "_initialized", True)
    return db_path


def _table_columns(db_path: Path, table: str) -> list[str]:
    conn = sqlite3.connect(db_path)
    cur = conn.execute(f"PRAGMA table_info({table})")
    return [row[1] for row in cur.fetchall()]


def test_companion_sessions_table_exists(db):
    cols = _table_columns(db, "companion_sessions")
    assert set(cols) == {
        "session_id", "coastal_uid", "started_at", "ended_at",
        "source_lang", "target_lang", "minutes_used", "tier_at_start",
    }


def test_companion_byok_table_exists(db):
    cols = _table_columns(db, "companion_byok")
    assert set(cols) == {
        "coastal_uid", "vendor", "encrypted_key", "stored_at", "last_used_at",
    }


def test_companion_paid_users_table_exists(db):
    cols = _table_columns(db, "companion_paid_users")
    assert set(cols) == {
        "coastal_uid", "stripe_customer_id", "stripe_subscription_id",
        "status", "started_at", "current_period_end", "canceled_at",
    }


def test_companion_workspaces_table_exists(db):
    cols = _table_columns(db, "companion_workspaces")
    assert set(cols) == {
        "coastal_uid", "taskade_workspace_id", "provisioned_at",
    }


def test_session_start_and_end_round_trip(db):
    audit_ledger.companion_session_start(
        session_id="ccs_test_1", coastal_uid="cuid_x",
        source_lang="es", target_lang="en", tier_at_start="free",
    )
    audit_ledger.companion_session_end(session_id="ccs_test_1", minutes_used=12.5)
    row = audit_ledger.companion_session_fetch("ccs_test_1")
    assert row is not None
    assert row["minutes_used"] == 12.5
    assert row["ended_at"] is not None


def test_byok_store_fetch_delete(db):
    audit_ledger.companion_byok_store(
        coastal_uid="cuid_x", vendor="inworld", encrypted_key=b"\x01\x02\x03",
    )
    assert audit_ledger.companion_byok_fetch("cuid_x", "inworld") == b"\x01\x02\x03"
    audit_ledger.companion_byok_delete("cuid_x", "inworld")
    assert audit_ledger.companion_byok_fetch("cuid_x", "inworld") is None


def test_paid_user_upsert_then_is_paid(db):
    audit_ledger.companion_paid_user_upsert(
        coastal_uid="cuid_x", stripe_customer_id="cus_x",
        stripe_subscription_id="sub_x", status="active",
        current_period_end=None,
    )
    assert audit_ledger.companion_is_paid("cuid_x") is True
    audit_ledger.companion_paid_user_upsert(
        coastal_uid="cuid_x", stripe_customer_id="cus_x",
        stripe_subscription_id="sub_x", status="canceled",
        current_period_end=None,
    )
    assert audit_ledger.companion_is_paid("cuid_x") is False


def test_workspace_set_get(db):
    assert audit_ledger.companion_workspace_get("cuid_x") is None
    audit_ledger.companion_workspace_set(
        coastal_uid="cuid_x", taskade_workspace_id="tw_ABC",
    )
    assert audit_ledger.companion_workspace_get("cuid_x") == "tw_ABC"
