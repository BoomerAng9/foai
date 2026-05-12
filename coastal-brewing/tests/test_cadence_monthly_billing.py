"""Pytest for `cadence.cadence_monthly_billing_cents`.

Customer-facing monthly billing amount for the 3-6-9 plan: the Stripe
subscription bills this amount monthly for `months_paid` months.
Distinct from `monthly_equivalent` in `cadence_pricing_table` which
spreads total over `months_delivered` for marketing comparison only.

monthly:  monthly_retail × 1.00
3mo:      monthly_retail × 0.85
6mo:      monthly_retail × 0.80
9mo:      monthly_retail × 0.75

Run: `python -m pytest tests/test_cadence_monthly_billing.py -v`
"""
from __future__ import annotations

import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))


def test_monthly_cadence_billing_is_full_retail():
    """Month-to-month: no discount. Customer pays full monthly retail."""
    import cadence  # noqa: PLC0415

    assert cadence.cadence_monthly_billing_cents(29.99, "monthly") == 2999


def test_9mo_cadence_billing_is_75pct_of_retail():
    """9-mo plan: customer pays $29.99 × 0.75 = $22.49 per month for 9 months."""
    import cadence  # noqa: PLC0415

    assert cadence.cadence_monthly_billing_cents(29.99, "9mo") == 2249


def test_6mo_cadence_billing_is_80pct_of_retail():
    """6-mo plan: customer pays $29.99 × 0.80 = $23.99 per month for 6 months."""
    import cadence  # noqa: PLC0415

    assert cadence.cadence_monthly_billing_cents(29.99, "6mo") == 2399


def test_3mo_cadence_billing_is_85pct_of_retail():
    """3-mo plan: customer pays $29.99 × 0.85 = $25.49 per month for 3 months."""
    import cadence  # noqa: PLC0415

    assert cadence.cadence_monthly_billing_cents(29.99, "3mo") == 2549


def test_unknown_cadence_raises():
    """Bad cadence id → ValueError."""
    import cadence  # noqa: PLC0415

    with pytest.raises(ValueError, match="cadence"):
        cadence.cadence_monthly_billing_cents(29.99, "annual")  # type: ignore[arg-type]


# ────────────────────────── cadence_pricing_table extension ──────────────────────────


def test_cadence_pricing_table_exposes_monthly_billing():
    """The frontend cadence picker reads `monthly_billing` (customer's
    actual per-month Stripe charge) as the headline. Distinct from
    `monthly_equivalent` which spreads total over months_delivered."""
    import cadence  # noqa: PLC0415

    table = cadence.cadence_pricing_table(29.99)
    by_id = {row["cadence_id"]: row for row in table}

    # monthly plan: bill = retail
    assert by_id["monthly"]["monthly_billing"] == 29.99

    # 3mo: bill = retail × 0.85
    assert by_id["3mo"]["monthly_billing"] == 25.49

    # 6mo: bill = retail × 0.80
    assert by_id["6mo"]["monthly_billing"] == 23.99

    # 9mo: bill = retail × 0.75 = 22.49 (NOT total/12 = 16.87)
    assert by_id["9mo"]["monthly_billing"] == 22.49

    # monthly_equivalent on 9mo plan = total / months_delivered = 16.87
    assert by_id["9mo"]["monthly_equivalent"] == 16.87
