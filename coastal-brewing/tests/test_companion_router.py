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
        json={"vendor": "inworld", "api_key": "test-fixture-aaaaaaaaaaaaaaaaaaa"},
        cookies={"coastal_uid": "cuid_test_user_1.testsig"},
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_session_start_caps_free_tier_at_30_minutes_per_day(client, monkeypatch):
    import uuid
    import api_server, audit_ledger
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_cap_test" if raw else None)
    audit_ledger.init_schema()
    # Insert 30 minutes of free-tier sessions in the last 24h
    _seed_sid = "ccs_used_" + uuid.uuid4().hex[:8]
    audit_ledger.companion_session_start(
        session_id=_seed_sid, coastal_uid="cuid_cap_test",
        source_lang="es", target_lang="en", tier_at_start="free",
    )
    audit_ledger.companion_session_end(session_id=_seed_sid, minutes_used=30.0)
    r = client.post(
        "/api/v1/companion/session/start",
        json={"source_lang": "es", "target_lang": "en"},
        cookies={"coastal_uid": "cuid_cap_test.x"},
    )
    assert r.status_code == 429
    assert "free-tier" in r.json()["detail"].lower() or "cap" in r.json()["detail"].lower()


def test_byok_post_rejects_unknown_vendor(client, monkeypatch):
    monkeypatch.setenv("COASTAL_BYOK_ENCRYPTION_KEY",
                       "z+gRO7t-3z5y6Yk8w0qFvB9JzLnNbC2H4XwYxVrTuM0=")
    import api_server
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_test_user_1" if raw else None)
    r = client.post(
        "/api/v1/companion/byok/key",
        json={"vendor": "shady", "api_key": "test-fixture-aaaaaaaaaaaaaaaaaaa"},
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
        json={"vendor": "inworld", "api_key": "test-fixture-aaaaaaaaaaaaaaaaaaa"},
        cookies={"coastal_uid": "cuid_test_user_1.testsig"},
    )
    r = client.delete(
        "/api/v1/companion/byok/key?vendor=inworld",
        cookies={"coastal_uid": "cuid_test_user_1.testsig"},
    )
    assert r.status_code == 200


def test_session_start_returns_session_id_and_ws_url(client, monkeypatch):
    import uuid
    monkeypatch.setenv("COASTAL_PUBLIC_URL", "https://brewing.foai.cloud")
    import api_server, companion
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_session_test" if raw else None)
    _uid = uuid.uuid4().hex
    monkeypatch.setattr(companion._secrets, "token_urlsafe", lambda n: _uid)
    r = client.post(
        "/api/v1/companion/session/start",
        json={"source_lang": "es", "target_lang": "en"},
        cookies={"coastal_uid": "cuid_session_test.x"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["session_id"].startswith("ccs_")
    assert "/companion/session/" in data["ws_url"]
    assert "/stream" in data["ws_url"]
    assert data["tier"] in ("free", "paid")


def test_session_end_marks_session_ended(client, monkeypatch):
    import uuid
    import api_server, companion
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_end_test" if raw else None)
    _uid = uuid.uuid4().hex
    monkeypatch.setattr(companion._secrets, "token_urlsafe", lambda n: _uid)
    r = client.post(
        "/api/v1/companion/session/start",
        json={"source_lang": "es", "target_lang": "en"},
        cookies={"coastal_uid": "cuid_end_test.x"},
    )
    sid = r.json()["session_id"]
    r2 = client.post(
        f"/api/v1/companion/session/{sid}/end",
        json={"minutes_used": 4.2},
        cookies={"coastal_uid": "cuid_end_test.x"},
    )
    assert r2.status_code == 200
    assert r2.json()["session_id"] == sid


def test_coastal_uid_from_cookie_header_parses_valid_uid(monkeypatch):
    import companion, api_server
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_ws_test" if raw == "abc.def" else None)
    out = companion._coastal_uid_from_cookie_header("coastal_uid=abc.def; other=x")
    assert out == "cuid_ws_test"


def test_coastal_uid_from_cookie_header_returns_none_on_empty():
    import companion
    assert companion._coastal_uid_from_cookie_header("") is None
    assert companion._coastal_uid_from_cookie_header("other=x") is None


def test_workspace_me_returns_null_when_not_provisioned(client, monkeypatch):
    import api_server
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_no_workspace" if raw else None)
    r = client.get(
        "/api/v1/companion/workspace/me",
        cookies={"coastal_uid": "cuid_no_workspace.x"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["taskade_workspace_id"] is None
    assert data["is_paid_tier"] is False


def test_workspace_me_returns_provisioned_id_and_paid_flag(client, monkeypatch):
    import api_server, audit_ledger
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_has_workspace" if raw else None)
    audit_ledger.init_schema()
    audit_ledger.companion_workspace_set(
        coastal_uid="cuid_has_workspace",
        taskade_workspace_id="tw_TEST456",
    )
    audit_ledger.companion_paid_user_upsert(
        coastal_uid="cuid_has_workspace",
        stripe_customer_id="cus_x",
        stripe_subscription_id="sub_x",
        status="active",
        current_period_end=None,
    )
    r = client.get(
        "/api/v1/companion/workspace/me",
        cookies={"coastal_uid": "cuid_has_workspace.x"},
    )
    assert r.json()["taskade_workspace_id"] == "tw_TEST456"
    assert r.json()["is_paid_tier"] is True


def test_notes_post_requires_paid_tier(client, monkeypatch):
    import api_server, audit_ledger
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_notes_free" if raw else None)
    audit_ledger.init_schema()
    r = client.post(
        "/api/v1/companion/notes/ccs_x",
        json={"transcript_text": "...", "title": "Test meeting"},
        cookies={"coastal_uid": "cuid_notes_free.x"},
    )
    assert r.status_code == 402  # Payment Required


def test_notes_post_paid_user_without_workspace_409s(client, monkeypatch):
    import api_server, audit_ledger
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_notes_no_ws" if raw else None)
    audit_ledger.init_schema()
    audit_ledger.companion_paid_user_upsert(
        coastal_uid="cuid_notes_no_ws",
        stripe_customer_id="cus_x", stripe_subscription_id="sub_x",
        status="active", current_period_end=None,
    )
    r = client.post(
        "/api/v1/companion/notes/ccs_x",
        json={"transcript_text": "...", "title": "Paid meeting"},
        cookies={"coastal_uid": "cuid_notes_no_ws.x"},
    )
    assert r.status_code == 409


def test_notes_post_paid_user_pushes_to_taskade(client, monkeypatch):
    import api_server, audit_ledger
    from unittest import mock as _mock
    monkeypatch.setenv("COASTAL_TASKADE_API_TOKEN", "t_test")
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_notes_paid" if raw else None)
    audit_ledger.init_schema()
    audit_ledger.companion_paid_user_upsert(
        coastal_uid="cuid_notes_paid",
        stripe_customer_id="cus_x", stripe_subscription_id="sub_x",
        status="active", current_period_end=None,
    )
    audit_ledger.companion_workspace_set(
        coastal_uid="cuid_notes_paid", taskade_workspace_id="tw_paid_x",
    )
    import companion_taskade
    with _mock.patch.object(companion_taskade, "push_meeting_doc",
                           return_value="doc_abc"):
        with _mock.patch.object(companion_taskade, "push_mindmap_nodes",
                               return_value="mm_def"):
            r = client.post(
                "/api/v1/companion/notes/ccs_x",
                json={"transcript_text": "Some content. More content.",
                      "title": "Paid meeting"},
                cookies={"coastal_uid": "cuid_notes_paid.x"},
            )
    assert r.status_code == 200
    assert r.json()["taskade_doc_id"] == "doc_abc"


def test_sessions_list_returns_users_sessions(client, monkeypatch):
    import uuid
    import api_server, audit_ledger
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_list_test" if raw else None)
    audit_ledger.init_schema()
    _sid1 = "ccs_list_" + uuid.uuid4().hex[:8]
    _sid2 = "ccs_list_" + uuid.uuid4().hex[:8]
    _sid3 = "ccs_other_" + uuid.uuid4().hex[:8]
    audit_ledger.companion_session_start(
        session_id=_sid1, coastal_uid="cuid_list_test",
        source_lang="es", target_lang="en", tier_at_start="free",
    )
    audit_ledger.companion_session_end(session_id=_sid1, minutes_used=3.0)
    audit_ledger.companion_session_start(
        session_id=_sid2, coastal_uid="cuid_list_test",
        source_lang="fr", target_lang="en", tier_at_start="paid",
    )
    audit_ledger.companion_session_end(session_id=_sid2, minutes_used=12.0)
    audit_ledger.companion_session_start(
        session_id=_sid3, coastal_uid="cuid_OTHER",
        source_lang="de", target_lang="en", tier_at_start="free",
    )

    r = client.get(
        "/api/v1/companion/sessions",
        cookies={"coastal_uid": "cuid_list_test.x"},
    )
    assert r.status_code == 200
    data = r.json()
    ids = [s["session_id"] for s in data["sessions"]]
    assert _sid1 in ids
    assert _sid2 in ids
    assert _sid3 not in ids  # data isolation


def test_sessions_list_rejects_missing_cookie(client):
    r = client.get("/api/v1/companion/sessions")
    assert r.status_code == 401
