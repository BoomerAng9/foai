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
