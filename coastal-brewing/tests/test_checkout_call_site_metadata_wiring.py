"""Call-site wiring tests — proves the 3 tier-checkout handlers actually
pass the cancel_at_unix-enriched metadata into BOTH `metadata=` AND
`subscription_data=` on stripe.checkout.Session.create.

Why this exists separately from `test_cadence_subscription_data.py`:
that test verifies the helper FUNCTION returns the right dict. PR #439
returned the right dict but the call sites used the WRONG one
(`metadata=metadata` instead of `metadata=sub_data["metadata"]`), so
`cancel_at_unix` only landed on the Subscription's metadata, never on
the Session's. The webhook handler reads `session.metadata`, so the
cancel-horizon apply path was a dead code branch until PR #440.

This is the test that would have caught PR #440's class of bug at the
call-site level. Without it, the next refactor that touches one of
the 3 handlers can re-introduce the wiring bug silently.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest import mock

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

# api_server.py pulls heavy deps at import time (psycopg2, user_profile,
# nemoclaw HTTP client, etc.). We mock those so the test can import
# the handlers without spinning up the real dep chain.
_HEAVY = ["psycopg2", "psycopg2.extras", "psycopg2.pool"]
for _name in _HEAVY:
    sys.modules.setdefault(_name, mock.MagicMock())

# Provide env Stripe expects at import-time so STRIPE_AVAILABLE flips True.
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy_for_unit_test")
os.environ.setdefault("COASTAL_GATEWAY_TOKEN", "unit-test-gateway-token")


@pytest.fixture
def stripe_session_create_capture():
    """Patch stripe.checkout.Session.create and capture the kwargs passed
    to it. Returns the capture list (one entry per Session.create call)."""
    import api_server  # noqa: PLC0415  -- after sys.path + sys.modules mock
    captured: list[dict] = []

    fake_session = mock.MagicMock()
    fake_session.url = "https://checkout.stripe.com/test/cs_test_synthetic"
    fake_session.id = "cs_test_synthetic"

    def _fake_create(**kwargs):
        captured.append(kwargs)
        return fake_session

    with mock.patch("stripe.checkout.Session.create", side_effect=_fake_create), \
         mock.patch("adapters.stripe_adapter._init_stripe"), \
         mock.patch.object(api_server, "STRIPE_AVAILABLE", True), \
         mock.patch.object(api_server, "_stripe_is_configured", return_value=True):
        yield captured


def _custee_handler():
    import api_server  # noqa: PLC0415
    return api_server.custee_card_checkout


def _wood_stork_handler():
    import api_server  # noqa: PLC0415
    return api_server.wood_stork_checkout


def _pooler_handler():
    import api_server  # noqa: PLC0415
    return api_server.pooler_pass_checkout


@pytest.mark.parametrize("cadence_id", ["3mo", "6mo", "9mo"])
def test_custee_card_call_site_mirrors_cancel_at_unix_into_session_metadata(
    cadence_id, stripe_session_create_capture
):
    handler = _custee_handler()
    handler(
        body=_MakeReq(email="t@e.com", cadence=cadence_id, products=["coffee"]),
        x_coastal_token="unit-test-gateway-token",
    )
    assert len(stripe_session_create_capture) == 1
    call = stripe_session_create_capture[0]
    sess_md = call["metadata"]
    sub_md = call["subscription_data"]["metadata"]
    assert "cancel_at_unix" in sess_md, (
        f"custee-card {cadence_id}: cancel_at_unix missing from Session-"
        f"level metadata kwarg. Webhook handler reads session.metadata "
        f"to apply cancel_at — if cancel_at_unix isn't here, the "
        f"horizon never gets applied and the Subscription bills "
        f"perpetually past its intended term. Mirror via "
        f"`sub_data = _cadence_subscription_data(...); "
        f"metadata=sub_data['metadata']`."
    )
    assert sess_md["cancel_at_unix"] == sub_md["cancel_at_unix"], (
        "Session-level and Subscription-level cancel_at_unix must be "
        "identical — they're set from the same sub_data['metadata'] "
        "reference. Drift means the function was called twice with "
        "different now_unix values (race condition)."
    )


@pytest.mark.parametrize("cadence_id", ["3mo", "6mo", "9mo"])
def test_wood_stork_call_site_mirrors_cancel_at_unix(cadence_id, stripe_session_create_capture):
    handler = _wood_stork_handler()
    handler(
        body=_MakeReq(email="t@e.com", business_name="Test Cafe",
                     tier="standard", cadence=cadence_id, products=["bulk-coffee"]),
        x_coastal_token="unit-test-gateway-token",
    )
    assert len(stripe_session_create_capture) == 1
    call = stripe_session_create_capture[0]
    assert "cancel_at_unix" in call["metadata"]
    assert call["metadata"]["cancel_at_unix"] == call["subscription_data"]["metadata"]["cancel_at_unix"]


@pytest.mark.parametrize("cadence_id", ["3mo", "6mo", "9mo"])
def test_pooler_pass_call_site_mirrors_cancel_at_unix(cadence_id, stripe_session_create_capture):
    handler = _pooler_handler()
    handler(
        body=_MakeReq(email="t@e.com", zip="31322", tier="standard",
                     cadence=cadence_id, products=["coffee"]),
        x_coastal_token="unit-test-gateway-token",
    )
    assert len(stripe_session_create_capture) == 1
    call = stripe_session_create_capture[0]
    assert "cancel_at_unix" in call["metadata"]
    assert call["metadata"]["cancel_at_unix"] == call["subscription_data"]["metadata"]["cancel_at_unix"]


@pytest.mark.parametrize("handler_factory,body_kwargs", [
    (_custee_handler, dict(email="t@e.com", cadence="monthly", products=["coffee"])),
    (_wood_stork_handler, dict(email="t@e.com", business_name="X", tier="standard", cadence="monthly", products=["bulk-coffee"])),
    (_pooler_handler, dict(email="t@e.com", zip="31322", tier="standard", cadence="monthly", products=["coffee"])),
])
def test_monthly_cadence_does_not_carry_cancel_at_unix(
    handler_factory, body_kwargs, stripe_session_create_capture
):
    handler = handler_factory()
    handler(body=_MakeReq(**body_kwargs), x_coastal_token="unit-test-gateway-token")
    assert len(stripe_session_create_capture) == 1
    call = stripe_session_create_capture[0]
    assert "cancel_at_unix" not in call["metadata"], (
        "Monthly cadence must NOT have a cancel horizon — perpetual "
        "month-to-month is the intended behavior."
    )
    assert "cancel_at_unix" not in call["subscription_data"]["metadata"]


class _MakeReq:
    """Minimal stand-in for the Pydantic request bodies. The 3 handlers
    only read attributes off `body`, not the Pydantic schema, so a
    plain attribute namespace is sufficient for the call-site mirror
    assertions."""
    def __init__(self, **kw):
        self.__dict__.update(kw)
