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
