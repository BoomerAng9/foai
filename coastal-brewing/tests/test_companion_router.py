"""Companion router skeleton tests. Mirrors test_owner_console_reads.py
deep-mock pattern for psycopg2 + env setup."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest import mock

import pytest
from fastapi.testclient import TestClient

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

_HEAVY = ["psycopg2", "psycopg2.extras", "psycopg2.pool"]
for _name in _HEAVY:
    sys.modules.setdefault(_name, mock.MagicMock())

os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy")
os.environ.setdefault("COASTAL_GATEWAY_TOKEN", "ut-gw")
os.environ.setdefault("COASTAL_AUTH_SECRET", "ut-auth-secret")

import api_server  # noqa: E402


@pytest.fixture
def client():
    return TestClient(api_server.app)


def test_companion_workspace_me_rejects_missing_uid_cookie(client):
    r = client.get("/api/v1/companion/workspace/me")
    assert r.status_code == 401


def test_byok_post_stores_key(client, monkeypatch):
    monkeypatch.setenv("COASTAL_BYOK_ENCRYPTION_KEY",
                       "z+gRO7t-3z5y6Yk8w0qFvB9JzLnNbC2H4XwYxVrTuM0=")
    import api_server
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_test_user_1" if raw else None)
    r = client.post(
        "/api/v1/companion/byok/key",
        json={"vendor": "inworld", "api_key": "iw-test-abc-1234567890abcdef"},
        cookies={"coastal_uid": "cuid_test_user_1.testsig"},
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_byok_post_rejects_unknown_vendor(client, monkeypatch):
    monkeypatch.setenv("COASTAL_BYOK_ENCRYPTION_KEY",
                       "z+gRO7t-3z5y6Yk8w0qFvB9JzLnNbC2H4XwYxVrTuM0=")
    import api_server
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_test_user_1" if raw else None)
    r = client.post(
        "/api/v1/companion/byok/key",
        json={"vendor": "shady", "api_key": "x-1234567890abcdef1234"},
        cookies={"coastal_uid": "cuid_test_user_1.testsig"},
    )
    assert r.status_code == 400


def test_byok_post_rejects_short_key(client, monkeypatch):
    monkeypatch.setenv("COASTAL_BYOK_ENCRYPTION_KEY",
                       "z+gRO7t-3z5y6Yk8w0qFvB9JzLnNbC2H4XwYxVrTuM0=")
    import api_server
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_test_user_1" if raw else None)
    r = client.post(
        "/api/v1/companion/byok/key",
        json={"vendor": "inworld", "api_key": "tooshort"},
        cookies={"coastal_uid": "cuid_test_user_1.testsig"},
    )
    assert r.status_code == 400


def test_byok_delete_removes_key(client, monkeypatch):
    monkeypatch.setenv("COASTAL_BYOK_ENCRYPTION_KEY",
                       "z+gRO7t-3z5y6Yk8w0qFvB9JzLnNbC2H4XwYxVrTuM0=")
    import api_server
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_test_user_1" if raw else None)
    # Store first
    client.post(
        "/api/v1/companion/byok/key",
        json={"vendor": "inworld", "api_key": "iw-test-abc-1234567890abcdef"},
        cookies={"coastal_uid": "cuid_test_user_1.testsig"},
    )
    r = client.delete(
        "/api/v1/companion/byok/key?vendor=inworld",
        cookies={"coastal_uid": "cuid_test_user_1.testsig"},
    )
    assert r.status_code == 200
