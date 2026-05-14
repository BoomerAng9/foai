"""Stripe paid-tier checkout + customer-portal endpoints."""
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
for n in _HEAVY:
    sys.modules.setdefault(n, mock.MagicMock())
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy")
os.environ.setdefault("COASTAL_STRIPE_COMPANION_PRICE_ID", "price_test_companion")
os.environ.setdefault("COASTAL_PUBLIC_URL", "https://brewing.foai.cloud")

import api_server  # noqa: E402


@pytest.fixture
def client():
    return TestClient(api_server.app)


def test_billing_checkout_returns_stripe_url(client, monkeypatch):
    monkeypatch.setattr(
        api_server,
        "_resolve_uid_cookie",
        lambda raw: "cuid_bill_test" if raw else None,
    )
    fake_session = mock.MagicMock(
        url="https://checkout.stripe.com/c/test_companion",
        id="cs_test_x",
    )
    with mock.patch("stripe.checkout.Session.create", return_value=fake_session):
        with mock.patch("adapters.stripe_adapter._init_stripe"):
            r = client.post(
                "/api/v1/companion/billing/checkout",
                json={"email": "buyer@example.com"},
                cookies={"coastal_uid": "cuid_bill_test.x"},
            )
    assert r.status_code == 200
    assert "checkout.stripe.com" in r.json()["redirect_url"]


def test_billing_checkout_502s_on_stripe_failure(client, monkeypatch):
    monkeypatch.setattr(
        api_server,
        "_resolve_uid_cookie",
        lambda raw: "cuid_bill_fail" if raw else None,
    )
    with mock.patch(
        "stripe.checkout.Session.create",
        side_effect=Exception("stripe down"),
    ):
        with mock.patch("adapters.stripe_adapter._init_stripe"):
            r = client.post(
                "/api/v1/companion/billing/checkout",
                json={"email": "buyer@example.com"},
                cookies={"coastal_uid": "cuid_bill_fail.x"},
            )
    assert r.status_code == 502
    # Generic detail — Stripe internals not leaked
    assert "stripe down" not in r.json()["detail"]


def test_billing_portal_404_when_no_paid_user(client, monkeypatch):
    monkeypatch.setattr(
        api_server,
        "_resolve_uid_cookie",
        lambda raw: "cuid_no_sub" if raw else None,
    )
    r = client.post(
        "/api/v1/companion/billing/portal",
        cookies={"coastal_uid": "cuid_no_sub.x"},
    )
    assert r.status_code == 404


def test_webhook_companion_paid_tier_activates_paid_and_provisions_workspace(
    client, monkeypatch,
):
    import audit_ledger
    import companion_taskade
    monkeypatch.setenv("COASTAL_TASKADE_API_TOKEN", "t_test_taskade")
    audit_ledger.init_schema()
    event = {
        "id": "evt_test_companion_paid_x",
        "type": "checkout.session.completed",
        "data": {"object": {
            "id": "cs_test_companion_paid",
            "metadata": {
                "product": "cbrew-communication-companion",
                "flow": "companion_paid_tier",
                "coastal_uid": "cuid_paid_x",
            },
            "customer": "cus_test_X",
            "subscription": "sub_test_X",
            "customer_email": "x@example.com",
            "mode": "subscription",
            "payment_status": "paid",
        }},
    }
    with mock.patch(
        "api_server._stripe_verify_webhook",
        return_value=event,
    ):
        with mock.patch.object(
            companion_taskade,
            "provision_workspace",
            return_value="tw_NEW_USER_X",
        ):
            r = client.post(
                "/stripe/webhook",
                content=b"{}",
                headers={"Stripe-Signature": "t=1,v1=x"},
            )
    assert r.status_code == 200
    assert audit_ledger.companion_is_paid("cuid_paid_x") is True
    assert audit_ledger.companion_workspace_get("cuid_paid_x") == "tw_NEW_USER_X"
