"""Tests for the Forge FastAPI server."""

from __future__ import annotations

import os

os.environ["FORGE_API_SECRET"] = "test-secret"

from fastapi.testclient import TestClient  # noqa: E402

from forge.server.api import app  # noqa: E402

client = TestClient(app)
AUTH = {"Authorization": "Bearer test-secret"}


def test_health_no_auth() -> None:
    assert client.get("/forge/health").status_code == 200


def test_workflows_requires_auth() -> None:
    assert client.get("/forge/workflows").status_code == 401


def test_workflows_with_auth() -> None:
    r = client.get("/forge/workflows", headers=AUTH)
    assert r.status_code == 200
    ids = [w["id"] for w in r.json()]
    assert "smelt-ingot" in ids


def test_create_run() -> None:
    r = client.post("/forge/run", headers=AUTH,
                    json={"workflow_id": "smelt-ingot", "task_id": "t1"})
    assert r.status_code == 202


def test_create_run_missing() -> None:
    r = client.post("/forge/run", headers=AUTH,
                    json={"workflow_id": "nope", "task_id": "t1"})
    assert r.status_code == 404


def test_validate_valid() -> None:
    r = client.post("/forge/validate", headers=AUTH, json={"yaml_content": """
id: test
version: "1.0"
owner: Test
description: test
inputs: {}
steps:
  - id: gate
    hawk: Lil_Gate_Hawk
    gates: [pytest]
  - id: promote
    hawk: Buildsmith
    action: promote_ingot
    from_tier: Raw
    to_tier: Forged
  - id: chronicle
    hawk: Lil_Chronicle_Hawk
    emit: [charter, ledger]
"""})
    assert r.json()["valid"] is True


def test_validate_invalid() -> None:
    r = client.post("/forge/validate", headers=AUTH,
                    json={"yaml_content": "bad: {{"})
    assert r.json()["valid"] is False
