"""Schema test for the owner_passkeys table — one row per owner email,
stores the WebAuthn credential public key + signature counter."""
from __future__ import annotations

import sqlite3
import sys
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
    # Reset initialized flag so init_schema will run
    monkeypatch.setattr(audit_ledger, "_initialized", False)
    conn = audit_ledger._connect()
    try:
        # Load base schema first
        conn.executescript(schema_path.read_text(encoding="utf-8"))
        # Then run migrations (including owner_passkeys)
        audit_ledger._migrate(conn)
        conn.commit()
    finally:
        conn.close()
    return db_path


def test_owner_passkeys_table_exists(db):
    conn = sqlite3.connect(db)
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='owner_passkeys'")
    assert cur.fetchone() is not None
    conn.close()


def test_owner_passkeys_columns(db):
    conn = sqlite3.connect(db)
    cur = conn.execute("PRAGMA table_info(owner_passkeys)")
    cols = {row[1]: row[2] for row in cur.fetchall()}
    conn.close()
    assert cols == {
        "email": "TEXT",
        "credential_id": "BLOB",
        "public_key": "BLOB",
        "sign_count": "INTEGER",
        "registered_at": "INTEGER",
        "last_used_at": "INTEGER",
    }


def test_owner_passkeys_email_is_primary_key(db):
    conn = sqlite3.connect(db)
    cur = conn.execute("PRAGMA table_info(owner_passkeys)")
    pk_cols = [row[1] for row in cur.fetchall() if row[5] > 0]
    conn.close()
    assert pk_cols == ["email"]


def test_register_passkey_and_fetch(db, monkeypatch):
    monkeypatch.setattr(audit_ledger, "DB_PATH", db)
    audit_ledger.register_owner_passkey(
        email="asg@achievemor.io",
        credential_id=b"\x01\x02\x03",
        public_key=b"\xab\xcd",
        sign_count=0,
    )
    row = audit_ledger.fetch_owner_passkey("asg@achievemor.io")
    assert row is not None
    assert row["email"] == "asg@achievemor.io"
    assert row["credential_id"] == b"\x01\x02\x03"
    assert row["public_key"] == b"\xab\xcd"
    assert row["sign_count"] == 0


def test_bump_sign_count(db, monkeypatch):
    monkeypatch.setattr(audit_ledger, "DB_PATH", db)
    audit_ledger.register_owner_passkey(
        email="asg@achievemor.io",
        credential_id=b"\x01",
        public_key=b"\x02",
        sign_count=5,
    )
    audit_ledger.bump_owner_passkey_sign_count("asg@achievemor.io", 6)
    row = audit_ledger.fetch_owner_passkey("asg@achievemor.io")
    assert row["sign_count"] == 6
    assert row["last_used_at"] > 0


def test_delete_passkey(db, monkeypatch):
    monkeypatch.setattr(audit_ledger, "DB_PATH", db)
    audit_ledger.register_owner_passkey(
        email="asg@achievemor.io",
        credential_id=b"\x01",
        public_key=b"\x02",
        sign_count=0,
    )
    audit_ledger.delete_owner_passkey("asg@achievemor.io")
    assert audit_ledger.fetch_owner_passkey("asg@achievemor.io") is None
