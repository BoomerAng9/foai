"""Regression tests for the Stripe webhook verifier.

Stripe SDK v15 dropped `.get()` from `StripeObject`. `verify_webhook`
must return a plain dict so the api_server.py /stripe/webhook handler
can use `event.get("type")` and nested-dict access patterns. If a
future SDK upgrade or refactor swaps the return type back to a
`stripe.Event` (StripeObject), every webhook will silently 500 again
and only retries-via-idempotency-lock will hide it (PR #437 lock + the
KeyError bug masked this in prod from the SDK bump through 2026-05-13).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest import mock

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

from adapters import stripe_adapter  # noqa: E402  -- after sys.path mutation


def _sample_event_bytes() -> bytes:
    return json.dumps({
        "id": "evt_test_dict_return",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_123",
                "metadata": {"flow": "service_initiation"},
                "customer_details": {"email": "buyer@example.com"},
            },
        },
    }).encode("utf-8")


def test_verify_webhook_returns_plain_dict_not_stripe_object():
    payload = _sample_event_bytes()
    with mock.patch.object(stripe_adapter.stripe.Webhook, "construct_event") as _ce, \
         mock.patch.object(stripe_adapter, "STRIPE_WEBHOOK_SECRET", "whsec_test"):
        _ce.return_value = mock.MagicMock()  # signature OK
        out = stripe_adapter.verify_webhook(payload, "t=1,v1=fake")

    assert type(out) is dict, (
        f"verify_webhook must return a plain dict (got {type(out).__name__}). "
        "Stripe SDK StripeObject does not support .get() in v15+; api_server.py "
        "/stripe/webhook handler relies on event.get('type') and nested-dict "
        "access patterns. Returning a StripeObject silently breaks every paid "
        "checkout's downstream fulfillment."
    )
    # All access patterns the webhook handler uses must work on the result:
    assert out.get("type") == "checkout.session.completed"
    assert out["data"]["object"].get("metadata", {}).get("flow") == "service_initiation"
    assert out["data"]["object"].get("customer_details", {}).get("email") == "buyer@example.com"
    # Nested .get chain (membership branch line 1467 pattern)
    assert out.get("data", {}).get("object", {}).get("id") == "cs_test_123"


def test_verify_webhook_raises_when_secret_missing():
    with mock.patch.object(stripe_adapter, "STRIPE_WEBHOOK_SECRET", ""):
        with pytest.raises(RuntimeError, match="STRIPE_WEBHOOK_SECRET not configured"):
            stripe_adapter.verify_webhook(b"{}", "t=1,v1=x")


def test_verify_webhook_signature_check_runs_before_dict_parse():
    """If construct_event raises (bad signature), verify_webhook must
    propagate the exception — never silently return the unverified
    payload."""
    payload = _sample_event_bytes()
    with mock.patch.object(stripe_adapter.stripe.Webhook, "construct_event") as _ce, \
         mock.patch.object(stripe_adapter, "STRIPE_WEBHOOK_SECRET", "whsec_test"):
        _ce.side_effect = ValueError("bad signature")
        with pytest.raises(ValueError, match="bad signature"):
            stripe_adapter.verify_webhook(payload, "t=1,v1=fake")
