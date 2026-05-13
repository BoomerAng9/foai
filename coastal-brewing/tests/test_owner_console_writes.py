"""Owner write endpoint tests — pricing, customers, nemoclaw, cfg.

Pins:
- Writes require valid owner cookie (Task 10 covers the gate)
- Pricing writes require exact confirmation_phrase match
- Pydantic schema validates bounds
- Atomic-write to pricing-config.json
"""
from __future__ import annotations

import json
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
os.environ.setdefault("COASTAL_OWNER_EMAILS", "asg@achievemor.io")
os.environ.setdefault("COASTAL_OWNER_SESSION_SECRET", "ut-owner-secret")

import api_server  # noqa: E402
import owner_auth  # noqa: E402


@pytest.fixture
def client():
    return TestClient(api_server.app)


@pytest.fixture
def owner_cookie():
    return owner_auth.sign_owner_cookie("asg@achievemor.io", "ut-owner-secret", ttl_sec=3600)


@pytest.fixture
def pricing_cfg(tmp_path, monkeypatch):
    cfg = tmp_path / "pricing-config.json"
    cfg.write_text(json.dumps({
        "cadences": {
            "monthly": {"discount": 0.0, "months_paid": 1, "months_delivered": 1,
                        "stripe_interval": "month", "stripe_interval_count": 1,
                        "label": "Month-to-month", "framing": "Standard."},
            "3mo": {"discount": 0.15, "months_paid": 3, "months_delivered": 3,
                    "stripe_interval": "month", "stripe_interval_count": 3,
                    "label": "3mo", "framing": "x"},
            "6mo": {"discount": 0.20, "months_paid": 6, "months_delivered": 6,
                    "stripe_interval": "month", "stripe_interval_count": 6,
                    "label": "6mo", "framing": "x"},
            "9mo": {"discount": 0.25, "months_paid": 9, "months_delivered": 12,
                    "stripe_interval": "month", "stripe_interval_count": 12,
                    "label": "9mo", "framing": "x"},
        },
        "tier_monthly_retail": {"custee-card": 29.99},
        "tier_envelope_max_cents": {"custee-card": 6000},
    }))
    monkeypatch.setenv("COASTAL_OWNER_CONFIG_DIR", str(tmp_path))
    return cfg


def test_pricing_get_returns_current_config(client, owner_cookie, pricing_cfg):
    r = client.get("/api/v1/owner/pricing", cookies={"coastal_owner": owner_cookie})
    assert r.status_code == 200
    data = r.json()
    assert data["tier_monthly_retail"]["custee-card"] == 29.99


def test_pricing_put_rejects_missing_confirmation_phrase(client, owner_cookie, pricing_cfg):
    r = client.put(
        "/api/v1/owner/pricing",
        json={"tier_monthly_retail": {"custee-card": 31.99}},
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 400


def test_pricing_put_rejects_wrong_confirmation_phrase(client, owner_cookie, pricing_cfg):
    r = client.put(
        "/api/v1/owner/pricing",
        json={"tier_monthly_retail": {"custee-card": 31.99},
              "confirmation_phrase": "i agree"},
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 400


def test_pricing_put_with_correct_phrase_writes_atomically(client, owner_cookie, pricing_cfg):
    r = client.put(
        "/api/v1/owner/pricing",
        json={
            "tier_monthly_retail": {"custee-card": 31.99},
            "confirmation_phrase": "CONFIRM PRICING CHANGE",
        },
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 200
    on_disk = json.loads(pricing_cfg.read_text())
    assert on_disk["tier_monthly_retail"]["custee-card"] == 31.99


def test_pricing_put_rejects_out_of_bounds_retail(client, owner_cookie, pricing_cfg):
    r = client.put(
        "/api/v1/owner/pricing",
        json={
            "tier_monthly_retail": {"custee-card": 9999},  # > 999 max
            "confirmation_phrase": "CONFIRM PRICING CHANGE",
        },
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 422


def test_customers_list_returns_stripe_customers(client, owner_cookie):
    fake_customer = mock.MagicMock()
    fake_customer.id = "cus_test_1"
    fake_customer.email = "u@x.com"
    fake_customer.created = 1000
    fake_customer.metadata = {}
    fake_listing = mock.MagicMock(data=[fake_customer])
    with mock.patch("stripe.Customer.list", return_value=fake_listing):
        r = client.get("/api/v1/owner/customers", cookies={"coastal_owner": owner_cookie})
    assert r.status_code == 200
    data = r.json()
    assert any(c["id"] == "cus_test_1" for c in data["customers"])


def test_customer_delete_requires_confirm_phrase(client, owner_cookie):
    r = client.post(
        "/api/v1/owner/customers/cus_test_1/delete",
        json={},
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 400


def test_customer_delete_with_confirm_phrase_calls_stripe(client, owner_cookie):
    with mock.patch("stripe.Customer.delete") as del_mock:
        r = client.post(
            "/api/v1/owner/customers/cus_test_1/delete",
            json={"confirmation_phrase": "CONFIRM CUSTOMER DELETE"},
            cookies={"coastal_owner": owner_cookie},
        )
    assert r.status_code == 200
    del_mock.assert_called_once_with("cus_test_1")


def test_subscription_cancel_with_confirm_calls_stripe(client, owner_cookie):
    fake_sub = mock.MagicMock(status="active")
    with mock.patch("stripe.Subscription.modify", return_value=fake_sub) as mod_mock:
        r = client.post(
            "/api/v1/owner/customers/cus_test_1/cancel-subscription/sub_test_1",
            json={"confirmation_phrase": "CONFIRM CANCEL SUBSCRIPTION"},
            cookies={"coastal_owner": owner_cookie},
        )
    assert r.status_code == 200
    mod_mock.assert_called_once_with("sub_test_1", cancel_at_period_end=True)


# ---------------------------------------------------------------------------
# NemoClaw queue + approve/reject
# ---------------------------------------------------------------------------

def test_nemoclaw_queue_requires_auth(client):
    r = client.get("/api/v1/owner/nemoclaw/queue")
    assert r.status_code == 401


def test_nemoclaw_queue_returns_pending_tasks(client, owner_cookie):
    import audit_ledger

    audit_ledger.insert_task_packet(
        {
            "task_id": "task_test_nq_1",
            "risk_tags": ["payment"],
            "task_type": "test_order",
            "owner_goal": "unit test",
            "department": "test",
        },
        {"route": "owner", "approval_required": True},
        None,
    )
    try:
        r = client.get(
            "/api/v1/owner/nemoclaw/queue",
            cookies={"coastal_owner": owner_cookie},
        )
        assert r.status_code == 200
        data = r.json()
        assert any(t["task_id"] == "task_test_nq_1" for t in data["pending"])
    finally:
        audit_ledger.set_task_status("task_test_nq_1", "cleanup_test", actor="test")


def test_nemoclaw_approve_marks_approved(client, owner_cookie):
    import audit_ledger

    audit_ledger.insert_task_packet(
        {
            "task_id": "task_test_nq_2",
            "risk_tags": [],
            "task_type": "test_order",
            "owner_goal": "unit test 2",
            "department": "test",
        },
        {"route": "owner", "approval_required": True},
        None,
    )
    r = client.post(
        "/api/v1/owner/nemoclaw/task_test_nq_2/approve",
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "approved"
    assert body["task_id"] == "task_test_nq_2"
    assert body["ok"] is True


def test_nemoclaw_reject_marks_rejected(client, owner_cookie):
    import audit_ledger

    audit_ledger.insert_task_packet(
        {
            "task_id": "task_test_nq_3",
            "risk_tags": ["legal"],
            "task_type": "test_order",
            "owner_goal": "unit test 3",
            "department": "test",
        },
        {"route": "owner", "approval_required": True},
        None,
    )
    r = client.post(
        "/api/v1/owner/nemoclaw/task_test_nq_3/reject",
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "rejected"
    assert body["ok"] is True


def test_nemoclaw_approve_404_for_unknown_task(client, owner_cookie):
    # Mock set_task_status to return False (no row updated)
    with mock.patch("audit_ledger.set_task_status", return_value=False):
        r = client.post(
            "/api/v1/owner/nemoclaw/no_such_task/approve",
            cookies={"coastal_owner": owner_cookie},
        )
    assert r.status_code == 404


def test_nemoclaw_reject_404_for_unknown_task(client, owner_cookie):
    with mock.patch("audit_ledger.set_task_status", return_value=False):
        r = client.post(
            "/api/v1/owner/nemoclaw/no_such_task/reject",
            cookies={"coastal_owner": owner_cookie},
        )
    assert r.status_code == 404


@pytest.fixture
def cfg_paths(tmp_path, monkeypatch):
    (tmp_path / "voice-config.json").write_text(json.dumps({
        "persona_voice_ids": {"sal_ang": "voice-sal-v1"},
    }))
    (tmp_path / "email-templates.json").write_text(json.dumps({
        "magic_link": {"subject_signup": "x", "subject_login": "y", "body": "z"},
    }))
    monkeypatch.setenv("COASTAL_OWNER_CONFIG_DIR", str(tmp_path))
    return tmp_path


def test_cfg_get_returns_voice_and_email(client, owner_cookie, cfg_paths):
    r = client.get("/api/v1/owner/cfg", cookies={"coastal_owner": owner_cookie})
    assert r.status_code == 200
    data = r.json()
    assert "voice_config" in data
    assert "email_templates" in data
    assert data["voice_config"]["persona_voice_ids"]["sal_ang"] == "voice-sal-v1"


def test_cfg_put_rejects_missing_confirm(client, owner_cookie, cfg_paths):
    r = client.put(
        "/api/v1/owner/cfg",
        json={"voice_config": {"persona_voice_ids": {"sal_ang": "new"}}},
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 400


def test_cfg_put_voice_with_confirm_writes_file(client, owner_cookie, cfg_paths):
    r = client.put(
        "/api/v1/owner/cfg",
        json={
            "voice_config": {"persona_voice_ids": {"sal_ang": "voice-sal-v2"}},
            "confirmation_phrase": "CONFIRM CFG CHANGE",
        },
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 200
    on_disk = json.loads((cfg_paths / "voice-config.json").read_text())
    assert on_disk["persona_voice_ids"]["sal_ang"] == "voice-sal-v2"


def test_cfg_put_email_with_confirm_writes_file(client, owner_cookie, cfg_paths):
    r = client.put(
        "/api/v1/owner/cfg",
        json={
            "email_templates": {
                "magic_link": {
                    "subject_signup": "Welcome!",
                    "subject_login": "Sign in",
                    "body": "Click here: {magic_link}",
                }
            },
            "confirmation_phrase": "CONFIRM CFG CHANGE",
        },
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 200
    on_disk = json.loads((cfg_paths / "email-templates.json").read_text())
    assert on_disk["magic_link"]["subject_signup"] == "Welcome!"


def test_cfg_put_both_voice_and_email_atomically(client, owner_cookie, cfg_paths):
    r = client.put(
        "/api/v1/owner/cfg",
        json={
            "voice_config": {"persona_voice_ids": {"sal_ang": "voice-sal-v3"}},
            "email_templates": {"magic_link": {"subject_signup": "New"}},
            "confirmation_phrase": "CONFIRM CFG CHANGE",
        },
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 200
    voice = json.loads((cfg_paths / "voice-config.json").read_text())
    email = json.loads((cfg_paths / "email-templates.json").read_text())
    assert voice["persona_voice_ids"]["sal_ang"] == "voice-sal-v3"
    assert email["magic_link"]["subject_signup"] == "New"


def test_cfg_put_rejects_non_dict_voice(client, owner_cookie, cfg_paths):
    r = client.put(
        "/api/v1/owner/cfg",
        json={
            "voice_config": "not a dict",
            "confirmation_phrase": "CONFIRM CFG CHANGE",
        },
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 422


def test_cfg_put_rejects_non_dict_email(client, owner_cookie, cfg_paths):
    r = client.put(
        "/api/v1/owner/cfg",
        json={
            "email_templates": ["list", "not", "dict"],
            "confirmation_phrase": "CONFIRM CFG CHANGE",
        },
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# WebAuthn enroll + challenge endpoint tests
# ---------------------------------------------------------------------------

def test_enroll_start_rejects_email_not_in_allowlist(client):
    r = client.post("/api/v1/owner/enroll-start", json={"email": "not-owner@example.com"})
    assert r.status_code == 403


def test_enroll_start_returns_options_for_allowed_email(client):
    r = client.post("/api/v1/owner/enroll-start", json={"email": "asg@achievemor.io"})
    assert r.status_code == 200
    opts = r.json()
    assert opts["rp"]["id"] == "brewing.foai.cloud"  # default RP id
    assert opts["user"]["name"] == "asg@achievemor.io"


def test_challenge_start_404_when_no_passkey_enrolled(client):
    # Fresh email with no enrolled passkey
    r = client.post("/api/v1/owner/challenge-start", json={"email": "asg@achievemor.io"})
    assert r.status_code == 404


def test_challenge_start_423_when_locked(client, monkeypatch):
    import owner_auth
    owner_auth._LOCKOUT.clear()
    for _ in range(owner_auth.LOCKOUT_THRESHOLD):
        owner_auth.record_failure("asg@achievemor.io")
    try:
        r = client.post("/api/v1/owner/challenge-start", json={"email": "asg@achievemor.io"})
        assert r.status_code == 423
    finally:
        owner_auth._LOCKOUT.clear()


def test_enroll_finish_rejects_bad_email(client):
    r = client.post(
        "/api/v1/owner/enroll-finish",
        json={"email": "not-owner@example.com", "credential": {}},
    )
    assert r.status_code == 403
