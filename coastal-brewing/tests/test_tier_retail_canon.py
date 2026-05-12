"""Pytest pinning every C|Brew tier's monthly retail to canon.

Source of truth: `docs/cbrew-369-pricing-canon-2026-05-11.md` §2.

Canon anchors monthly retail on clean numbers — the 9-mo cadence
INTENTIONALLY drifts above the legacy $49/$99/$199/$499/$999 annuals
so Sal/LUC/ACHEEVY can haggle DOWN to them as negotiation theater.

If a future contributor flips one of these constants back to a
derivation off the legacy annual, this test catches it before it
ships.

Run: `python -m pytest tests/test_tier_retail_canon.py -v`
"""
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))


# ────────────────────────── canon monthly retail anchors ──────────────────────────


def test_pooler_pass_standard_monthly_retail_is_canon_seven_forty_nine():
    """Canon §2: Pooler Pass Standard monthly retail = $7.49."""
    import membership_pooler_pass  # noqa: PLC0415

    assert membership_pooler_pass.monthly_retail_for_tier("standard") == 7.49


def test_pooler_pass_plus_monthly_retail_is_canon_fourteen_ninety_nine():
    """Canon §2: Pooler Pass Plus monthly retail = $14.99."""
    import membership_pooler_pass  # noqa: PLC0415

    assert membership_pooler_pass.monthly_retail_for_tier("plus") == 14.99


# Custee Card monthly retail = $29.99 + 9-mo monthly billing = $22.49 are
# pinned via `test_cadence_monthly_billing.py` already (api_server itself
# imports DB drivers that aren't installed in pure-logic test envs).


def test_wood_stork_standard_monthly_retail_is_canon_seventy_four_ninety_nine():
    """Canon §2: Wood Stork Standard monthly retail = $74.99."""
    import membership_wood_stork  # noqa: PLC0415

    assert membership_wood_stork.monthly_retail_for_tier("standard") == 74.99


def test_wood_stork_reserve_monthly_retail_is_canon_one_forty_nine_ninety_nine():
    """Canon §2: Wood Stork Reserve monthly retail = $149.99."""
    import membership_wood_stork  # noqa: PLC0415

    assert membership_wood_stork.monthly_retail_for_tier("reserve") == 149.99


# ────────────────────────── canon 9-mo monthly billing ──────────────────────────


def test_pooler_pass_standard_9mo_monthly_billing_is_canon_five_sixty_two():
    """Canon §2: Pooler Pass Standard 9-mo monthly bill = $5.62
    (= $7.49 × 0.75 rounded)."""
    import cadence  # noqa: PLC0415
    import membership_pooler_pass  # noqa: PLC0415

    bill_cents = cadence.cadence_monthly_billing_cents(
        membership_pooler_pass.monthly_retail_for_tier("standard"), "9mo",
    )
    assert bill_cents == 562


def test_pooler_pass_plus_9mo_monthly_billing_is_canon_eleven_twenty_four():
    """Canon §2: Pooler Pass Plus 9-mo monthly bill = $11.24
    (= $14.99 × 0.75 rounded)."""
    import cadence  # noqa: PLC0415
    import membership_pooler_pass  # noqa: PLC0415

    bill_cents = cadence.cadence_monthly_billing_cents(
        membership_pooler_pass.monthly_retail_for_tier("plus"), "9mo",
    )
    assert bill_cents == 1124


def test_wood_stork_standard_9mo_monthly_billing_is_canon_fifty_six_twenty_four():
    """Canon §2: Wood Stork Standard 9-mo monthly bill = $56.24."""
    import cadence  # noqa: PLC0415
    import membership_wood_stork  # noqa: PLC0415

    bill_cents = cadence.cadence_monthly_billing_cents(
        membership_wood_stork.monthly_retail_for_tier("standard"), "9mo",
    )
    assert bill_cents == 5624


def test_wood_stork_reserve_9mo_monthly_billing_is_canon_one_twelve_forty_nine():
    """Canon §2: Wood Stork Reserve 9-mo monthly bill = $112.49."""
    import cadence  # noqa: PLC0415
    import membership_wood_stork  # noqa: PLC0415

    bill_cents = cadence.cadence_monthly_billing_cents(
        membership_wood_stork.monthly_retail_for_tier("reserve"), "9mo",
    )
    assert bill_cents == 11249
