"""Cookie-gate enforcement on /api/v1/owner/* endpoints. Per-endpoint
read tests come in later tasks; this file pins the gate behaviour."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest import mock

import pytest
from fastapi.testclient import TestClient

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

# Deep mocks for the heavy import chain (matches the pattern in
# test_checkout_call_site_metadata_wiring.py).
_HEAVY = ["psycopg2", "psycopg2.extras", "psycopg2.pool"]
for _name in _HEAVY:
    sys.modules.setdefault(_name, mock.MagicMock())

os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy")
os.environ.setdefault("COASTAL_GATEWAY_TOKEN", "ut-gw")
os.environ.setdefault("COASTAL_OWNER_EMAILS", "asg@achievemor.io")
os.environ.setdefault("COASTAL_OWNER_SESSION_SECRET", "ut-owner-secret")

import api_server  # noqa: E402
import owner_auth  # noqa: E402


@pytest.fixture
def client():
    return TestClient(api_server.app)


def test_owner_activity_rejects_missing_cookie(client):
    r = client.get("/api/v1/owner/activity")
    assert r.status_code == 401


def test_owner_activity_rejects_invalid_cookie(client):
    r = client.get("/api/v1/owner/activity", cookies={"coastal_owner": "not.a.valid.cookie"})
    assert r.status_code == 401


def test_owner_activity_rejects_email_not_in_allowlist(client, monkeypatch):
    cookie = owner_auth.sign_owner_cookie("not-owner@example.com", "ut-owner-secret", ttl_sec=3600)
    monkeypatch.setenv("COASTAL_OWNER_EMAILS", "asg@achievemor.io")
    r = client.get("/api/v1/owner/activity", cookies={"coastal_owner": cookie})
    assert r.status_code == 403


def test_owner_activity_accepts_valid_owner_cookie(client):
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", "ut-owner-secret", ttl_sec=3600)
    r = client.get("/api/v1/owner/activity", cookies={"coastal_owner": cookie})
    assert r.status_code == 200


def test_owner_activity_returns_owner_email(client):
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", "ut-owner-secret", ttl_sec=3600)
    r = client.get("/api/v1/owner/activity?include_stripe=false", cookies={"coastal_owner": cookie})
    assert r.status_code == 200
    data = r.json()
    assert data["owner_email"] == "asg@achievemor.io"
    assert "events" in data
    assert isinstance(data["events"], list)
    assert "stripe_events" in data


def test_owner_audit_rejects_missing_cookie(client):
    r = client.get("/api/v1/owner/audit")
    assert r.status_code == 401


def test_owner_audit_rejects_invalid_cookie(client):
    r = client.get("/api/v1/owner/audit", cookies={"coastal_owner": "not.a.valid.cookie"})
    assert r.status_code == 401


def test_owner_audit_returns_paginated_rows(client):
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", "ut-owner-secret", ttl_sec=3600)
    r = client.get("/api/v1/owner/audit?per_page=10", cookies={"coastal_owner": cookie})
    assert r.status_code == 200
    data = r.json()
    assert data["per_page"] == 10
    assert data["page"] == 1
    assert isinstance(data["rows"], list)
    assert "total" in data
    assert "ok" in data
    assert data["ok"] is True


def test_owner_audit_clamps_per_page(client):
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", "ut-owner-secret", ttl_sec=3600)
    r = client.get("/api/v1/owner/audit?per_page=5000", cookies={"coastal_owner": cookie})
    assert r.status_code == 200
    data = r.json()
    assert data["per_page"] <= 200


def test_owner_audit_rejects_bad_table_param(client):
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", "ut-owner-secret", ttl_sec=3600)
    r = client.get("/api/v1/owner/audit?table=DROP_TABLE_users", cookies={"coastal_owner": cookie})
    # Should NOT 500 — either 200 with empty rows (rejected by audit_ledger layer)
    # or 400 (rejected at endpoint layer). Test that it doesn't crash.
    assert r.status_code in (200, 400)
    if r.status_code == 200:
        data = r.json()
        assert isinstance(data["rows"], list)
