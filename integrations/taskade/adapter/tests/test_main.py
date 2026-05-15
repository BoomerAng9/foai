"""Tests for the Taskade adapter FastAPI surface — health, auth, dispatch errors, jobs.

Taskade upstream is mocked via the `responses` library; no real API calls.
"""
from __future__ import annotations

import os

# Set env BEFORE importing the app so module-level config picks it up.
os.environ.setdefault("TASKADE_API_KEY", "test-taskade-key")
os.environ.setdefault("TASKADE_API_BASE", "https://api.test.taskade.example/api/v1")
os.environ.setdefault("TASKADE_PII_SALT", "test-pii-salt-32bytes-padding-xxxxxxx")
os.environ.setdefault("ADAPTER_BEARER_SECRET", "test-adapter-secret")

import pytest  # noqa: E402
import responses  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from integrations.taskade.adapter import main as adapter_main  # noqa: E402

BASE = os.environ["TASKADE_API_BASE"]


@pytest.fixture
def client() -> TestClient:
    return TestClient(adapter_main.app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-adapter-secret"}


# ─── /health ─────────────────────────────────────────────────────────────


@responses.activate
def test_health_taskade_reachable(client: TestClient) -> None:
    responses.add(responses.GET, f"{BASE}/me", json={"ok": True}, status=200)
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["taskade_api_reachable"] is True
    assert body["trust_status"] == "APPROVED_SANDBOX_ONLY"
    assert body["version"] == "0.1.0"


@responses.activate
def test_health_taskade_unreachable(client: TestClient) -> None:
    responses.add(responses.GET, f"{BASE}/me", status=500)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["taskade_api_reachable"] is False


# ─── Auth ─────────────────────────────────────────────────────────────────


def test_invoke_requires_bearer(client: TestClient) -> None:
    r = client.post("/invoke", json={"capability": "workspace.list", "params": {}})
    assert r.status_code == 401
    assert r.json()["detail"]["code"] == "unauthorized"


def test_invoke_wrong_bearer(client: TestClient) -> None:
    r = client.post(
        "/invoke",
        headers={"Authorization": "Bearer wrong-secret"},
        json={"capability": "workspace.list", "params": {}},
    )
    assert r.status_code == 401


# ─── Dispatch errors ──────────────────────────────────────────────────────


def test_invoke_unknown_capability(client: TestClient, auth_headers: dict[str, str]) -> None:
    r = client.post(
        "/invoke",
        headers=auth_headers,
        json={"capability": "not.a.real.capability", "params": {}},
    )
    assert r.status_code == 404
    assert r.json()["detail"]["code"] == "unknown_capability"


def test_invoke_invalid_params(client: TestClient, auth_headers: dict[str, str]) -> None:
    # workspace.get requires workspace_id — omit it
    r = client.post(
        "/invoke",
        headers=auth_headers,
        json={"capability": "workspace.get", "params": {}},
    )
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "invalid_params"


# ─── Successful invoke ────────────────────────────────────────────────────


@responses.activate
def test_invoke_workspace_list(client: TestClient, auth_headers: dict[str, str]) -> None:
    responses.add(
        responses.GET,
        f"{BASE}/workspaces",
        json={"workspaces": [{"id": "ws_1", "name": "The Future of AI"}]},
        status=200,
    )
    r = client.post(
        "/invoke",
        headers=auth_headers,
        json={"capability": "workspace.list", "params": {}},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["capability"] == "workspace.list"
    assert body["result"]["workspaces"][0]["id"] == "ws_1"


@responses.activate
def test_invoke_audit_event_render_html_client_tier(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Pure function — should not hit Taskade. Sacred Separation must redact."""
    r = client.post(
        "/invoke",
        headers=auth_headers,
        json={
            "capability": "audit_event.render_html",
            "params": {
                "event_id": "evt_test",
                "agent": "Iller_Ang",
                "action": "asset_generated via claude-opus-4.7",
                "payload": {"asset": "test", "model": "claude-sonnet-4.6"},
                "timestamp": "2026-05-14T20:00:00Z",
                "surface": "client_tier",
                "customer_uid": "cust_alice",
            },
        },
    )
    assert r.status_code == 200
    body = r.json()
    html = body["result"]["html"]
    # Agent name redacted to role descriptor
    assert "Creative Director" in html
    assert "Iller_Ang" not in html
    # Model name redacted
    assert "claude-opus" not in html
    assert "claude-sonnet" not in html
    assert "language model" in html
    # Customer UID hashed (12-char SHA-256 prefix)
    assert "cust_alice" not in html
    assert "customer:" in html


@responses.activate
def test_invoke_audit_event_render_html_owner_tier(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """owner_tier surface passes through without redaction."""
    r = client.post(
        "/invoke",
        headers=auth_headers,
        json={
            "capability": "audit_event.render_html",
            "params": {
                "event_id": "evt_test",
                "agent": "Iller_Ang",
                "action": "asset_generated",
                "payload": {},
                "timestamp": "2026-05-14T20:00:00Z",
                "surface": "owner_tier",
                "customer_uid": "cust_alice",
            },
        },
    )
    assert r.status_code == 200
    html = r.json()["result"]["html"]
    assert "Iller_Ang" in html  # NOT redacted at owner_tier
    assert "cust_alice" in html  # NOT hashed at owner_tier


@responses.activate
def test_invoke_taskade_upstream_error(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    responses.add(responses.GET, f"{BASE}/workspaces", status=500)
    r = client.post(
        "/invoke",
        headers=auth_headers,
        json={"capability": "workspace.list", "params": {}},
    )
    assert r.status_code == 502
    assert r.json()["detail"]["code"] == "taskade_upstream_error"


@responses.activate
def test_invoke_html_injection_sanitized(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Adversarial payload must NOT escape into raw HTML."""
    r = client.post(
        "/invoke",
        headers=auth_headers,
        json={
            "capability": "audit_event.render_html",
            "params": {
                "event_id": "evt_inj",
                "agent": "ACHEEVY",
                "action": "<script>alert(1)</script>",
                "payload": {"note": "<img src=x onerror=alert(1)>"},
                "timestamp": "2026-05-14T20:00:00Z",
                "surface": "owner_tier",
            },
        },
    )
    assert r.status_code == 200
    html = r.json()["result"]["html"]
    assert "<script>" not in html
    assert "onerror=" not in html


# ─── Jobs API ─────────────────────────────────────────────────────────────


@responses.activate
def test_jobs_full_lifecycle(client: TestClient, auth_headers: dict[str, str]) -> None:
    responses.add(
        responses.GET,
        f"{BASE}/workspaces",
        json={"workspaces": [{"id": "ws_1", "name": "The Future of AI"}]},
        status=200,
    )

    # Create job
    r = client.post(
        "/jobs",
        headers=auth_headers,
        json={"capability": "workspace.list", "params": {}},
    )
    assert r.status_code == 200
    job_id = r.json()["job_id"]
    assert r.json()["status"] == "queued"

    # Poll until completed (sync test — give the executor a tick)
    import time
    for _ in range(20):
        r = client.get(f"/jobs/{job_id}", headers=auth_headers)
        if r.json()["status"] == "completed":
            break
        time.sleep(0.05)
    assert r.json()["status"] == "completed"
    assert r.json()["result"]["workspaces"][0]["id"] == "ws_1"


def test_jobs_get_unknown(client: TestClient, auth_headers: dict[str, str]) -> None:
    r = client.get("/jobs/does-not-exist", headers=auth_headers)
    assert r.status_code == 404
    assert r.json()["detail"]["code"] == "unknown_job"


def test_jobs_cancel_unknown(client: TestClient, auth_headers: dict[str, str]) -> None:
    r = client.post("/jobs/does-not-exist/cancel", headers=auth_headers)
    assert r.status_code == 404
