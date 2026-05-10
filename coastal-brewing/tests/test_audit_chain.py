"""Tamper-evident audit_chain tests.

Per Wave 1 Step B replacement plan: prove that mutating any historical
audit_chain row breaks the verify_chain() walk. Without this evidence
we cannot honestly tell AOF buyers "every action ACHEEVY takes is
signed into a tamper-evident chain."

Code_Ang Ship Checklist Item 19 (history/persistence) + Item 38 (secrets
management — tamper-evidence is the integrity dimension of secrets).
"""
from __future__ import annotations

import importlib
import sys
import tempfile
from pathlib import Path

import pytest


@pytest.fixture
def fresh_ledger(monkeypatch, tmp_path):
    """Spin up a fresh audit_ledger module pointed at a tmp SQLite file.

    The module caches DB_PATH at import; use monkeypatch + reload so each
    test gets a clean DB without leaking writes between cases.
    """
    db_dir = tmp_path / "audit_ledger"
    db_dir.mkdir()
    db_file = db_dir / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///audit_ledger/test.db")

    # Reload the module so the env var is picked up
    if "audit_ledger" in sys.modules:
        del sys.modules["audit_ledger"]
    repo_root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(repo_root / "scripts"))
    monkeypatch.chdir(repo_root)

    import audit_ledger  # noqa
    importlib.reload(audit_ledger)
    audit_ledger.DB_PATH = db_file
    audit_ledger._initialized = False
    audit_ledger.init_schema()
    yield audit_ledger


def test_empty_chain_verifies_clean(fresh_ledger):
    result = fresh_ledger.verify_chain()
    assert result == {"ok": True, "chain_length": 0, "broken_at": None}


def test_single_entry_verifies(fresh_ledger):
    fresh_ledger.insert_risk_event(
        severity="low", category="test", description="first entry",
        task_id="t1", actor="pytest"
    )
    r = fresh_ledger.verify_chain()
    assert r["ok"] is True
    assert r["chain_length"] == 1


def test_five_entries_chain_clean(fresh_ledger):
    for i in range(5):
        fresh_ledger.insert_risk_event(
            severity="low", category="test", description=f"event {i}",
            task_id=f"t{i}", actor="pytest"
        )
    r = fresh_ledger.verify_chain()
    assert r["ok"] is True
    assert r["chain_length"] == 5
    assert r["broken_at"] is None


def test_tamper_payload_breaks_chain(fresh_ledger):
    """The headline test: mutating row 3's payload_hash invalidates everything from row 3 forward.

    This is the property that lets us tell AOF buyers "you can prove the
    audit log hasn't been altered." Without this PASS, the cognitive-
    lineage promise is theater.
    """
    for i in range(5):
        fresh_ledger.insert_risk_event(
            severity="low", category="test", description=f"event {i}",
            task_id=f"t{i}", actor="pytest"
        )

    # Tamper: rewrite the payload_hash of chain_id=3
    import sqlite3
    conn = sqlite3.connect(str(fresh_ledger.DB_PATH))
    conn.execute(
        "UPDATE audit_chain SET payload_hash = 'TAMPERED' WHERE chain_id = 3"
    )
    conn.commit()
    conn.close()

    r = fresh_ledger.verify_chain()
    assert r["ok"] is False
    assert r["broken_at"] == 3, f"expected break at chain_id 3, got {r}"


def test_tamper_prev_hash_breaks_chain(fresh_ledger):
    """Mutating a prev_hash also breaks the chain (different reason path)."""
    for i in range(3):
        fresh_ledger.insert_risk_event(
            severity="low", category="test", description=f"event {i}",
            task_id=f"t{i}", actor="pytest"
        )

    import sqlite3
    conn = sqlite3.connect(str(fresh_ledger.DB_PATH))
    conn.execute(
        "UPDATE audit_chain SET prev_hash = 'FORGED' WHERE chain_id = 2"
    )
    conn.commit()
    conn.close()

    r = fresh_ledger.verify_chain()
    assert r["ok"] is False
    assert r["broken_at"] == 2


def test_chain_spans_multiple_tables(fresh_ledger):
    """Verifies the global chain — task_packets + risk_events + action_receipts
    interleave into one ordered ledger, all hashing forward."""
    fresh_ledger.insert_task_packet(
        packet={"task_id": "tp1", "owner_goal": "test", "department": "ops",
                "task_type": "summarize"},
        decision={"route": "summarize", "approval_required": False},
        receipt_path=None,
    )
    fresh_ledger.insert_risk_event(
        severity="medium", category="test_cross", description="mid",
        task_id="tp1", actor="pytest"
    )
    fresh_ledger.insert_action_receipt(
        task_id="tp1", executor="pytest", action_type="run",
        status="ok", result_summary="done"
    )

    r = fresh_ledger.verify_chain()
    assert r["ok"] is True
    assert r["chain_length"] == 3

    # And the chain is ordered task_packets → risk_events → action_receipts
    import sqlite3
    conn = sqlite3.connect(str(fresh_ledger.DB_PATH))
    rows = conn.execute(
        "SELECT source_table FROM audit_chain ORDER BY chain_id ASC"
    ).fetchall()
    conn.close()
    assert [r[0] for r in rows] == ["task_packets", "risk_events", "action_receipts"]
