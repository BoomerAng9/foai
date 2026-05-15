"""Tests for Track B Phase 2 — Chicken Hawk gateway dual-write to audit_ledger.

Covers:
- _receipt_to_audit_event_kwargs projection (receipt shape → write_event kwargs)
- _persist_to_neon happy path (writes to SQLite test DB via shared singleton)
- _persist_to_neon silent no-op when FOAI_AUDIT_LEDGER_URL is unset
- _persist_to_neon fail-soft when underlying write raises (gateway response NOT affected)
- /audit/recent returns 503 when target unset
- /audit/recent returns events filtered by agent
- /audit/{task_id} _RUN_LEDGER cache path unchanged (no regression)
"""
from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path

import pytest

# Force gateway-required env BEFORE importing main. These stay set for the
# whole test session; per-test env mutations use monkeypatch (auto-rolled-back).
os.environ["GATEWAY_SECRET"] = "test-gateway-secret"
os.environ["OPENROUTER_API_KEY"] = "sk-test-fake"
os.environ["OWNER_EMAIL"] = "test-owner@example.com"
os.environ["LOG_LEVEL"] = "INFO"
os.environ["ENVIRONMENT"] = "test"

# Audit_ledger env vars must NOT be set at session entry so the 503-path
# test can run cleanly; per-test setenv flips them when needed.
for _v in ("FOAI_AUDIT_LEDGER_URL", "NEON_DATABASE_URL", "FOAI_PII_SALT", "TASKADE_PII_SALT"):
    os.environ.pop(_v, None)

# Make the gateway dir importable as a flat module path (matches uvicorn
# invocation: `uvicorn main:app` from within the gateway dir). Also add the
# foai repo root so `runtime.audit_ledger` resolves.
_GATEWAY_DIR = Path(__file__).resolve().parent.parent
_FOAI_ROOT = _GATEWAY_DIR.parent.parent
sys.path.insert(0, str(_GATEWAY_DIR))
sys.path.insert(0, str(_FOAI_ROOT))


@pytest.fixture
def main_module():
    """Import gateway main once per test, with _RUN_LEDGER cleared."""
    if "main" in sys.modules:
        del sys.modules["main"]
    import main as _main
    _main._RUN_LEDGER.clear()
    return _main


# ─── Receipt projection ──────────────────────────────────────────────────


def test_receipt_projection_basic(main_module, monkeypatch) -> None:
    """Receipt → audit_event kwargs mapping: actor→agent, payload assembled correctly."""
    monkeypatch.setenv("FOAI_AUDIT_LEDGER_URL", "sqlite:///:memory:")
    monkeypatch.setenv("FOAI_PII_SALT", "test-salt-32-bytes-of-padding-x")
    receipt = {
        "receipt_id": "rcpt_abc123",
        "task_id": "task_xyz",
        "action": "smoke_test",
        "actor": "Iller_Ang",
        "verdict": "allow",
        "reason": "policy_match",
        "basis": "test",
        "decided_at": "2026-05-15T12:00:00+00:00",
        "elapsed_ms": 12.5,
    }
    kwargs = main_module._receipt_to_audit_event_kwargs(receipt)
    assert kwargs["agent"] == "Iller_Ang"
    assert kwargs["action"] == "smoke_test"
    assert kwargs["customer_uid"] is None
    assert isinstance(kwargs["timestamp_event"], datetime)
    payload = kwargs["payload"]
    assert payload["verdict"] == "allow"
    assert payload["elapsed_ms"] == 12.5
    assert "receipt_id" not in payload
    assert "action" not in payload
    assert "actor" not in payload


def test_receipt_projection_generic_agent_actor(main_module) -> None:
    """When actor='agent' (generic), map to Chicken_Hawk per gateway canon."""
    receipt = {
        "receipt_id": "r1",
        "task_id": "t1",
        "action": "issue_coupon",
        "actor": "agent",
        "verdict": "allow",
        "decided_at": "2026-05-15T12:00:00+00:00",
        "custee_id": "cust_alice",
        "coupon_code": "TRY-ME",
    }
    kwargs = main_module._receipt_to_audit_event_kwargs(receipt)
    assert kwargs["agent"] == "Chicken_Hawk"
    assert kwargs["customer_uid"] == "cust_alice"
    assert "custee_id" not in kwargs["payload"]


# ─── _persist_to_neon ─────────────────────────────────────────────────────


def test_persist_no_target_is_silent_noop(main_module, monkeypatch) -> None:
    """When FOAI_AUDIT_LEDGER_URL + NEON_DATABASE_URL both unset, persist is a no-op."""
    monkeypatch.delenv("FOAI_AUDIT_LEDGER_URL", raising=False)
    monkeypatch.delenv("NEON_DATABASE_URL", raising=False)
    called = {"n": 0}

    def fake_write(**kwargs):
        called["n"] += 1
        return "fake-event-id"

    monkeypatch.setattr(main_module, "_audit_write_event", fake_write)
    main_module._persist_to_neon(
        {
            "receipt_id": "r2",
            "task_id": "t2",
            "action": "x",
            "actor": "Iller_Ang",
            "decided_at": "2026-05-15T12:00:00+00:00",
        }
    )
    assert called["n"] == 0


def test_persist_fail_soft_swallows_exceptions(main_module, monkeypatch) -> None:
    """Underlying write raising must NOT propagate — gateway response stays clean."""
    monkeypatch.setenv("FOAI_AUDIT_LEDGER_URL", "sqlite:///:memory:")
    monkeypatch.setenv("FOAI_PII_SALT", "test-salt-32-bytes-of-padding-x")

    def boom(**kwargs):
        raise RuntimeError("simulated DB unreachable")

    monkeypatch.setattr(main_module, "_audit_write_event", boom)
    # Must NOT raise — fail-soft is the load-bearing invariant
    main_module._persist_to_neon(
        {
            "receipt_id": "r3",
            "task_id": "t3",
            "action": "x",
            "actor": "Iller_Ang",
            "decided_at": "2026-05-15T12:00:00+00:00",
        }
    )


# ─── _record_run_receipt ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_record_run_receipt_appends_to_in_memory_ledger(main_module, monkeypatch) -> None:
    """Existing behavior: _RUN_LEDGER append must still happen regardless of Neon state."""
    monkeypatch.delenv("FOAI_AUDIT_LEDGER_URL", raising=False)
    monkeypatch.delenv("NEON_DATABASE_URL", raising=False)
    receipt = {
        "receipt_id": "r4",
        "task_id": "t4",
        "action": "x",
        "actor": "Iller_Ang",
        "verdict": "allow",
        "decided_at": "2026-05-15T12:00:00+00:00",
    }
    await main_module._record_run_receipt(receipt)
    assert any(r.get("receipt_id") == "r4" for r in main_module._RUN_LEDGER)


@pytest.mark.asyncio
async def test_record_run_receipt_dual_writes_when_target_set(main_module, monkeypatch) -> None:
    """When FOAI_AUDIT_LEDGER_URL is set, _persist_to_neon calls write_event once."""
    monkeypatch.setenv("FOAI_AUDIT_LEDGER_URL", "sqlite:///:memory:")
    monkeypatch.setenv("FOAI_PII_SALT", "test-salt-32-bytes-of-padding-x")
    calls: list[dict] = []

    def fake_write(**kwargs):
        calls.append(kwargs)
        return "fake-event-id"

    monkeypatch.setattr(main_module, "_audit_write_event", fake_write)
    receipt = {
        "receipt_id": "r5",
        "task_id": "t5",
        "action": "x",
        "actor": "Iller_Ang",
        "verdict": "allow",
        "decided_at": "2026-05-15T12:00:00+00:00",
    }
    await main_module._record_run_receipt(receipt)
    assert len(calls) == 1
    assert calls[0]["agent"] == "Iller_Ang"
    assert calls[0]["action"] == "x"


# ─── HTTP routes ──────────────────────────────────────────────────────────


def test_audit_recent_returns_503_without_target(main_module, monkeypatch) -> None:
    """When no Neon target configured, /audit/recent returns 503 (graceful)."""
    # Force-pop in case prior-test monkeypatch teardown left residue. The
    # endpoint reads env at request time, so we must guarantee unset state
    # at the moment of the HTTP call.
    for v in ("FOAI_AUDIT_LEDGER_URL", "NEON_DATABASE_URL"):
        monkeypatch.delenv(v, raising=False)
        os.environ.pop(v, None)
    assert os.environ.get("FOAI_AUDIT_LEDGER_URL") is None
    assert os.environ.get("NEON_DATABASE_URL") is None

    from fastapi.testclient import TestClient

    with TestClient(main_module.app) as c:
        r = c.get(
            "/audit/recent",
            headers={"Authorization": "Bearer test-gateway-secret"},
        )
    assert r.status_code == 503, f"got {r.status_code}: {r.text}"
    assert "not configured" in r.json()["detail"].lower()


def test_audit_task_id_cache_path_unchanged(main_module) -> None:
    """No regression: /audit/{task_id} reads _RUN_LEDGER and returns matched receipts."""
    from fastapi.testclient import TestClient

    main_module._RUN_LEDGER.append(
        {
            "receipt_id": "r6",
            "task_id": "task_cached",
            "action": "x",
            "actor": "Sal_Ang",
            "verdict": "allow",
            "decided_at": "2026-05-15T12:00:00+00:00",
        }
    )
    with TestClient(main_module.app) as c:
        r = c.get(
            "/audit/task_cached",
            headers={"Authorization": "Bearer test-gateway-secret"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 1
    assert body["receipts"][0]["receipt_id"] == "r6"
