"""Tests for the Taskade sync worker — SQLite in-memory + mocked adapter."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone

# Configure env BEFORE importing the worker modules so pydantic-settings picks it up.
os.environ.setdefault("NEON_DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("TASKADE_ADAPTER_URL", "http://adapter.test.example:8000")
os.environ.setdefault("TASKADE_ADAPTER_BEARER", "test-bearer")
os.environ.setdefault("TASKADE_DEFAULT_WORKSPACE_ID", "ws_test")
os.environ.setdefault("TASKADE_AUDIT_LEDGER_FOLDER_ID", "folder_audit")
os.environ.setdefault("TASKADE_PII_SALT", "test-pii-salt-32-bytes-padding-xxxx")
os.environ.setdefault("CHICKEN_HAWK_NOTIFIER_URL", "")
os.environ.setdefault("MAX_CONSECUTIVE_FAILURES", "3")
os.environ.setdefault("SYNC_INTERVAL_SECONDS", "1")

import pytest  # noqa: E402

from services.taskade_sync_worker import adapter_client  # noqa: E402 — package alias hack below
from services.taskade_sync_worker.config import Settings  # noqa: E402
from services.taskade_sync_worker.worker import SyncWorker  # noqa: E402


@pytest.fixture
def settings() -> Settings:
    """One Settings per test — picks up env at construction."""
    return Settings()


@pytest.fixture
def worker(settings: Settings) -> SyncWorker:
    w = SyncWorker(settings)
    w.reader.init_schema_for_tests()
    return w


def _seed_event(
    worker: SyncWorker,
    *,
    agent: str = "Iller_Ang",
    action: str = "asset_generated",
    customer_uid: str | None = None,
    payload: dict | None = None,
) -> str:
    event_id = uuid.uuid4().hex
    worker.reader.insert_for_tests(
        event_id=event_id,
        agent=agent,
        action=action,
        payload=payload or {},
        customer_uid=customer_uid,
        timestamp_event=datetime(2026, 5, 14, 20, 0, 0, tzinfo=timezone.utc),
    )
    return event_id


# ─── happy-path cycle ─────────────────────────────────────────────────────


def test_cycle_no_unsynced_returns_zero(worker: SyncWorker) -> None:
    result = worker.run_one_cycle()
    assert result == {"synced": 0, "failed": 0}


def test_cycle_syncs_single_event(monkeypatch, worker: SyncWorker) -> None:
    event_id = _seed_event(worker)

    calls = []

    def fake_invoke(capability: str, params: dict) -> dict:
        calls.append((capability, params))
        if capability == "audit_event.render_html":
            return {"html": "<article>rendered</article>", "surface": "client_tier"}
        if capability == "project.create":
            return {"project": {"id": "proj_audit_2026_05_14"}}
        if capability == "project.update":
            return {"project": {"id": "proj_audit_2026_05_14"}}
        raise AssertionError(f"unexpected capability {capability}")

    monkeypatch.setattr(worker.adapter, "invoke", fake_invoke)

    result = worker.run_one_cycle()
    assert result == {"synced": 1, "failed": 0}

    # Row is marked synced — re-running yields no work
    second = worker.run_one_cycle()
    assert second == {"synced": 0, "failed": 0}

    # First call rendered, second call created the bucket project, no update yet
    capabilities_called = [c[0] for c in calls]
    assert "audit_event.render_html" in capabilities_called
    assert "project.create" in capabilities_called


def test_cycle_reuses_daily_bucket_within_run(monkeypatch, worker: SyncWorker) -> None:
    """Two events on the same day → one project.create + one project.update."""
    _seed_event(worker, action="action_a")
    _seed_event(worker, action="action_b")

    create_count = {"n": 0}
    update_count = {"n": 0}

    def fake_invoke(capability: str, params: dict) -> dict:
        if capability == "audit_event.render_html":
            return {"html": "<x/>", "surface": "client_tier"}
        if capability == "project.create":
            create_count["n"] += 1
            return {"project": {"id": "proj_audit_2026_05_14"}}
        if capability == "project.update":
            update_count["n"] += 1
            return {"project": {"id": "proj_audit_2026_05_14"}}
        raise AssertionError(capability)

    monkeypatch.setattr(worker.adapter, "invoke", fake_invoke)
    result = worker.run_one_cycle()
    assert result["synced"] == 2
    assert create_count["n"] == 1  # one project for the day
    assert update_count["n"] == 1  # second event appended via update


# ─── failure paths ────────────────────────────────────────────────────────


def test_cycle_adapter_error_marks_row_failed(monkeypatch, worker: SyncWorker) -> None:
    event_id = _seed_event(worker)

    def fake_invoke(capability: str, params: dict) -> dict:
        raise adapter_client.AdapterError("simulated 502 from adapter")

    monkeypatch.setattr(worker.adapter, "invoke", fake_invoke)
    result = worker.run_one_cycle()
    assert result["failed"] == 1
    assert result["synced"] == 0

    # Row should still be unsynced; sync_attempt_count should be 1
    unsynced = worker.reader.fetch_unsynced()
    assert len(unsynced) == 1
    assert unsynced[0].sync_attempt_count == 1
    assert "simulated 502" in unsynced[0].last_sync_error


def test_consecutive_failures_threshold_breaks_cycle(
    monkeypatch, worker: SyncWorker
) -> None:
    """When MAX_CONSECUTIVE_FAILURES is hit mid-cycle, loop bails so the
    Telegram alert fires once and the next cycle retries fresh.
    """
    for _ in range(5):
        _seed_event(worker)

    monkeypatch.setattr(
        worker.adapter,
        "invoke",
        lambda cap, p: (_ for _ in ()).throw(adapter_client.AdapterError("nope")),
    )

    alerts: list[tuple[str, str]] = []
    monkeypatch.setattr(
        "services.taskade_sync_worker.worker.send_alert",
        lambda **kwargs: alerts.append((kwargs["subject"], kwargs["body"])) or True,
    )

    result = worker.run_one_cycle()
    # MAX_CONSECUTIVE_FAILURES=3 from env, loop bails at 3
    assert result["failed"] == 3
    assert result["synced"] == 0
    assert len(alerts) == 1
    assert "consecutive failures" in alerts[0][0]


# ─── PII hashing ──────────────────────────────────────────────────────────


def test_customer_uid_hashed_before_adapter_call(
    monkeypatch, worker: SyncWorker
) -> None:
    _seed_event(worker, customer_uid="cust_alice")

    captured: dict = {}

    def fake_invoke(capability: str, params: dict) -> dict:
        if capability == "audit_event.render_html":
            captured.update(params)
            return {"html": "<x/>", "surface": "client_tier"}
        if capability == "project.create":
            return {"project": {"id": "proj_x"}}
        return {}

    monkeypatch.setattr(worker.adapter, "invoke", fake_invoke)
    worker.run_one_cycle()

    # Customer UID should be hex-hashed by the worker before adapter sees it
    assert captured["customer_uid"] != "cust_alice"
    assert len(captured["customer_uid"]) == 64  # SHA-256 hex digest


def test_no_pii_salt_drops_customer_uid(monkeypatch, worker: SyncWorker) -> None:
    worker.settings.taskade_pii_salt = ""
    _seed_event(worker, customer_uid="cust_alice")

    captured: dict = {}

    def fake_invoke(capability: str, params: dict) -> dict:
        if capability == "audit_event.render_html":
            captured.update(params)
        return {"html": "<x/>", "project": {"id": "p"}} if capability != "project.update" else {}

    monkeypatch.setattr(worker.adapter, "invoke", fake_invoke)
    worker.run_one_cycle()

    # Without salt, worker must NOT pass raw customer_uid downstream
    assert captured.get("customer_uid") is None


def test_to_render_params_serializes_payload(worker: SyncWorker) -> None:
    _seed_event(worker, payload={"nested": {"key": "value"}})
    events = worker.reader.fetch_unsynced()
    params = worker.reader.to_render_params(events[0], surface="client_tier")
    assert params["payload"] == {"nested": {"key": "value"}}
    assert params["surface"] == "client_tier"
    assert isinstance(params["timestamp"], str)
