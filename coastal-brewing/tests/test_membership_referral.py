"""Pytest matrix for `scripts/membership.py` — Coastal Brewing Co. Standard Membership.

The Standard Membership offers a referral-refund mechanic: refer 2 new paid
members within 12 months and your $199 annual fee is refunded. This module
owns the pure logic — code minting, referral counting, refund eligibility,
existing-customer rejection. No Stripe, no DB, no HTTP — those wrap this
module from the api_server layer.

Run from repo root: `python -m pytest tests/test_membership_referral.py -v`.

Built TDD-first per project canon: tests first, then minimal code, then
refactor. See @superpowers/test-driven-development for the discipline.
"""
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))


def test_mint_referral_code_returns_string_with_cbc_prefix():
    """mint_referral_code() returns a non-empty string starting with 'CBC-'."""
    from scripts import membership  # noqa: PLC0415 — late import is intentional for the RED phase

    code = membership.mint_referral_code()

    assert isinstance(code, str), f"expected str, got {type(code)}"
    assert code.startswith("CBC-"), f"expected 'CBC-' prefix, got {code!r}"
    assert len(code) >= 8, f"expected ≥8 chars total (CBC- + ≥4 body), got len={len(code)}"


def test_count_referrals_empty_ledger_returns_zero():
    """A code with no recorded referrals counts as 0."""
    from scripts import membership  # noqa: PLC0415

    ledger = membership.ReferralLedger()
    code = membership.mint_referral_code()

    assert ledger.count_referrals(code) == 0


def test_record_referral_increments_count():
    """Recording two distinct emails under the same code lifts count from 0 → 2."""
    from scripts import membership  # noqa: PLC0415

    ledger = membership.ReferralLedger()
    code = membership.mint_referral_code()

    ledger.record_referral(code, "alice@example.com")
    ledger.record_referral(code, "bob@example.com")

    assert ledger.count_referrals(code) == 2


def test_refund_eligible_requires_two_referrals():
    """0 or 1 referrals → ineligible. 2 or more → eligible."""
    from scripts import membership  # noqa: PLC0415

    ledger = membership.ReferralLedger()
    code = membership.mint_referral_code()

    assert ledger.refund_eligible(code) is False, "0 referrals should not qualify"

    ledger.record_referral(code, "one@example.com")
    assert ledger.refund_eligible(code) is False, "1 referral should not qualify"

    ledger.record_referral(code, "two@example.com")
    assert ledger.refund_eligible(code) is True, "2 referrals should qualify"

    ledger.record_referral(code, "three@example.com")
    assert ledger.refund_eligible(code) is True, "3 referrals should still qualify"


def test_record_referral_rejects_existing_customer():
    """Refer-2-and-fee-returned only counts truly NEW members.

    Existing customers (already in the customer set) raise
    ReferralRejected so the refund-counter doesn't move.
    """
    import pytest  # noqa: PLC0415
    from scripts import membership  # noqa: PLC0415

    existing = {"already-bought@example.com", "subscriber@example.com"}
    ledger = membership.ReferralLedger(existing_customers=existing)
    code = membership.mint_referral_code()

    with pytest.raises(membership.ReferralRejected) as exc:
        ledger.record_referral(code, "already-bought@example.com")

    assert "existing customer" in str(exc.value).lower()
    assert ledger.count_referrals(code) == 0, "rejected referral must not increment count"

    ledger.record_referral(code, "brand-new@example.com")
    assert ledger.count_referrals(code) == 1, "non-existing email must still count"


# ─── Phase 2: Stripe webhook dispatch ─────────────────────────────────


def _stripe_subscription_event(product: str = "coastal_membership_standard_annual",
                                email: str = "new-member@example.com",
                                event_id: str = "evt_test_001",
                                customer_id: str = "cus_test_abc") -> dict:
    """Synthetic Stripe `customer.subscription.created` event payload."""
    return {
        "id": event_id,
        "type": "customer.subscription.created",
        "data": {
            "object": {
                "id": "sub_test_xyz",
                "customer": customer_id,
                "items": {"data": [{"price": {"product": product}}]},
                "metadata": {"customer_email": email},
            }
        },
    }


def test_handle_subscription_created_skips_non_membership_product():
    """Non-membership subscription products MUST NOT mint a referral code."""
    from scripts import membership  # noqa: PLC0415

    ledger = membership.ReferralLedger()
    queued: list = []
    event = _stripe_subscription_event(product="coastal_coffee_subscription_monthly")

    result = membership.handle_subscription_created(
        event, ledger=ledger, on_welcome_box_queued=lambda e: queued.append(e)
    )

    assert result["handled"] is False
    assert "reason" in result and "not a membership" in result["reason"].lower()
    assert queued == [], "non-membership event must not queue a welcome box"


def test_handle_subscription_created_mints_code_and_queues_welcome_box():
    """Membership product event mints a referral code, returns it, and queues
    a welcome-box ship task with the customer email."""
    from scripts import membership  # noqa: PLC0415

    ledger = membership.ReferralLedger()
    queued: list = []
    event = _stripe_subscription_event(email="founding-member@example.com")

    result = membership.handle_subscription_created(
        event, ledger=ledger, on_welcome_box_queued=lambda e: queued.append(e)
    )

    assert result["handled"] is True
    assert result["referral_code"].startswith("CBC-")
    assert result["customer_email"] == "founding-member@example.com"
    assert len(queued) == 1
    assert queued[0]["customer_email"] == "founding-member@example.com"
    assert queued[0]["referral_code"] == result["referral_code"]


def test_handle_subscription_created_is_idempotent_per_event_id():
    """Stripe retries fire the same webhook multiple times with the same event id.
    The handler must not mint a second referral code or double-queue the welcome box.
    """
    from scripts import membership  # noqa: PLC0415

    ledger = membership.ReferralLedger()
    queued: list = []
    seen: dict = {}  # production wraps this with a DB / cache; dict suffices for unit tests
    event = _stripe_subscription_event(event_id="evt_idempotent_001")

    first = membership.handle_subscription_created(
        event, ledger=ledger, on_welcome_box_queued=lambda e: queued.append(e),
        seen_event_ids=seen,
    )
    second = membership.handle_subscription_created(
        event, ledger=ledger, on_welcome_box_queued=lambda e: queued.append(e),
        seen_event_ids=seen,
    )

    assert first["handled"] is True
    assert second["handled"] is False, "second call must be a no-op"
    assert "duplicate" in second.get("reason", "").lower()
    assert second["referral_code"] == first["referral_code"], "duplicate response echoes original code"
    assert len(queued) == 1, f"welcome box must queue exactly once, got {len(queued)}"
