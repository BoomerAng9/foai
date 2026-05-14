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
