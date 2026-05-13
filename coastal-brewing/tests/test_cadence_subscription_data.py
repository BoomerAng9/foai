"""Regression tests for `_cadence_subscription_data` — the dict
passed to `stripe.checkout.Session.create(subscription_data=...)` for
3/6/9-month installment plans.

Stripe's Checkout Session API REJECTS `cancel_at` inside
`subscription_data` with `Received unknown parameter:
subscription_data[cancel_at]`. The owner-canon prior to PR #439
embedded it there anyway, which caused 100% of non-monthly cadence
checkouts (including the flagship 9-month plan) to 502. The fix
embeds the cancel horizon as `cancel_at_unix` in subscription
metadata at mint time; /stripe/webhook applies it via
`stripe.Subscription.modify(sub_id, cancel_at=...)` after the
Subscription exists.

These tests pin:
  - `subscription_data` never contains the rejected `cancel_at` field
  - non-monthly cadences embed `cancel_at_unix` in metadata
  - the embedded value is a string (Stripe metadata-string constraint)
  - monthly cadence does NOT embed a horizon (perpetual is intended)
  - timestamp math matches the months_paid × 30.5d × 86400s formula
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

# Function under test lives in the pure `cadence` module — no Stripe
# SDK, no FastAPI, no psycopg2 in the import chain.
from cadence import subscription_data_for_cadence as _cadence_subscription_data  # noqa: E402


def test_no_cancel_at_in_subscription_data_root():
    """Stripe rejects `subscription_data[cancel_at]`. The returned dict
    must NOT include `cancel_at` at the root for any cadence."""
    for cadence_id in ("monthly", "3mo", "6mo", "9mo"):
        sub = _cadence_subscription_data(cadence_id, {"product": "coastal-brewing"})
        assert "cancel_at" not in sub, (
            f"cadence={cadence_id!r}: subscription_data must not contain "
            f"`cancel_at` — Stripe rejects it at the Checkout Session "
            f"subscription_data level. Use metadata.cancel_at_unix + "
            f"post-mint Subscription.modify in /stripe/webhook instead."
        )


def test_monthly_cadence_has_no_horizon():
    """Monthly is open-ended — no cancel_at_unix metadata."""
    sub = _cadence_subscription_data("monthly", {"tier": "pooler-pass-standard"})
    md = sub["metadata"]
    assert "cancel_at_unix" not in md
    assert md["tier"] == "pooler-pass-standard"


@pytest.mark.parametrize("cadence_id,expected_months", [
    ("3mo", 3),
    ("6mo", 6),
    ("9mo", 9),
])
def test_non_monthly_cadence_embeds_cancel_at_unix(cadence_id, expected_months):
    """3/6/9mo cadences embed a UTC unix timestamp horizon in metadata.

    Horizon formula: now + months_paid * 30.5 * 86400. We allow a few
    seconds of skew to keep the test stable on slow CI.
    """
    before = int(time.time())
    sub = _cadence_subscription_data(cadence_id, {})
    after = int(time.time())

    md = sub["metadata"]
    assert "cancel_at_unix" in md, f"cadence={cadence_id} missing cancel_at_unix"
    raw = md["cancel_at_unix"]
    assert isinstance(raw, str), (
        f"cancel_at_unix must be a string (Stripe metadata values are "
        f"strings) — got {type(raw).__name__}"
    )
    horizon = int(raw)
    expected_delta = expected_months * int(30.5 * 86400)
    assert before + expected_delta - 5 <= horizon <= after + expected_delta + 5, (
        f"cadence={cadence_id} horizon {horizon} not within "
        f"now+{expected_delta}s (now ∈ [{before},{after}])"
    )


def test_metadata_is_a_copy_not_a_mutation():
    """The caller's metadata dict must not be mutated — we return a
    fresh dict so callers can safely reuse their metadata for other
    Stripe API calls (subscription_data, payment_intent_data, etc.)."""
    caller_md = {"product": "coastal-brewing", "tier": "wood-stork-reserve"}
    sub = _cadence_subscription_data("9mo", caller_md)
    assert "cancel_at_unix" not in caller_md, (
        "_cadence_subscription_data must not mutate the caller's metadata."
    )
    assert "cancel_at_unix" in sub["metadata"]


def test_returned_dict_shape_matches_stripe_subscription_data_contract():
    """Stripe accepts a small fixed set of top-level keys in
    subscription_data. We currently only need `metadata`. Pin that
    shape so a future PR doesn't reintroduce a rejected param."""
    sub = _cadence_subscription_data("9mo", {"x": "y"})
    assert set(sub.keys()) == {"metadata"}, (
        f"subscription_data should be {{metadata: ...}} only — "
        f"got keys {sorted(sub.keys())}"
    )
