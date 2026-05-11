"""Pytest matrix for `scripts/membership_subscribe.py`.

Pure-logic tests — no Mercury, no DB, no HTTP. Validates SKU catalog,
line-item construction, and the $6.54-only-on-first-invoice rule.

Run from coastal-brewing root: `python -m pytest tests/test_membership_subscribe.py -v`.
"""
from __future__ import annotations

import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))


def test_is_valid_sku_accepts_canon_skus():
    """The 4 /pricing-page subscription SKUs are valid."""
    import membership_subscribe  # noqa: PLC0415

    assert membership_subscribe.is_valid_sku("coastal-tea-monthly")
    assert membership_subscribe.is_valid_sku("coastal-coffee-monthly")
    assert membership_subscribe.is_valid_sku("coastal-functional-coffee-monthly")
    assert membership_subscribe.is_valid_sku("coastal-combo-monthly")


def test_is_valid_sku_rejects_unknown_or_non_subscription():
    """Bundles, retail SKUs, and typos are rejected — endpoint will 400."""
    import membership_subscribe  # noqa: PLC0415

    assert not membership_subscribe.is_valid_sku("coastal-discovery-bundle")
    assert not membership_subscribe.is_valid_sku("coastal-tea")  # missing -monthly
    assert not membership_subscribe.is_valid_sku("")
    assert not membership_subscribe.is_valid_sku("random-sku")


def test_sku_monthly_retail_cents_matches_pricing_canon():
    """Catalog prices must match the canon on /pricing (verified 2026-05-11)."""
    import membership_subscribe  # noqa: PLC0415

    assert membership_subscribe.sku_monthly_retail_cents("coastal-tea-monthly") == 2699
    assert membership_subscribe.sku_monthly_retail_cents("coastal-coffee-monthly") == 3499
    assert membership_subscribe.sku_monthly_retail_cents("coastal-functional-coffee-monthly") == 4499
    assert membership_subscribe.sku_monthly_retail_cents("coastal-combo-monthly") == 5999


def test_sku_display_name_human_readable():
    """Display names for owner Telegram + Mercury invoice line items."""
    import membership_subscribe  # noqa: PLC0415

    assert membership_subscribe.sku_display_name("coastal-tea-monthly") == "Tea Monthly"
    assert membership_subscribe.sku_display_name("coastal-coffee-monthly") == "Coffee Monthly"
    assert (
        membership_subscribe.sku_display_name("coastal-functional-coffee-monthly")
        == "Functional Coffee Monthly"
    )
    assert membership_subscribe.sku_display_name("coastal-combo-monthly") == "Combo Monthly"


def test_build_invoice_line_items_first_invoice_monthly_includes_service_initiation():
    """First invoice on monthly cadence: one subscription line + the $6.54
    service initiation line (one-time, transparent on first receipt)."""
    import membership_subscribe  # noqa: PLC0415

    items = membership_subscribe.build_invoice_line_items(
        sku="coastal-tea-monthly", cadence="monthly", is_first_invoice=True,
    )

    assert len(items) == 2
    sub_line = items[0]
    init_line = items[1]
    assert sub_line["unit_price_cents"] == 2699
    assert sub_line["quantity"] == 1
    assert "Tea Monthly" in sub_line["description"]
    assert init_line["unit_price_cents"] == 654
    assert init_line["quantity"] == 1
    assert "initiation" in init_line["description"].lower()
    # Total = 2699 + 654 = 3353
    assert sum(li["unit_price_cents"] * li["quantity"] for li in items) == 3353


def test_build_invoice_line_items_renewal_omits_service_initiation():
    """Subsequent renewals must NOT include the $6.54 line — service
    initiation is one-time, paid only on first invoice."""
    import membership_subscribe  # noqa: PLC0415

    items = membership_subscribe.build_invoice_line_items(
        sku="coastal-tea-monthly", cadence="monthly", is_first_invoice=False,
    )

    assert len(items) == 1
    assert items[0]["unit_price_cents"] == 2699
    # No $6.54 line item
    assert all("initiation" not in li["description"].lower() for li in items)


def test_build_invoice_line_items_9mo_cadence_applies_25pct_discount():
    """9mo cadence = pay 9, deliver 12, 25% off. Subscription line is the
    full 9-mo cadence total at the discounted rate.
    9 × 5999 × 0.75 = 40493 cents (rounded). + 654 init = 41147 cents.
    """
    import membership_subscribe  # noqa: PLC0415

    items = membership_subscribe.build_invoice_line_items(
        sku="coastal-combo-monthly", cadence="9mo", is_first_invoice=True,
    )

    assert len(items) == 2
    sub_line = items[0]
    assert sub_line["unit_price_cents"] == 40493  # 9 × 5999 × 0.75
    assert "9-month plan" in sub_line["description"].lower() or "9mo" in sub_line["description"]
    assert sum(li["unit_price_cents"] * li["quantity"] for li in items) == 41147  # 40493 + 654


def test_build_invoice_line_items_3mo_cadence_15pct_discount():
    """3mo: 3 × 3499 × 0.85 = 8922 cents. + 654 init = 9576."""
    import membership_subscribe  # noqa: PLC0415

    items = membership_subscribe.build_invoice_line_items(
        sku="coastal-coffee-monthly", cadence="3mo", is_first_invoice=True,
    )

    assert items[0]["unit_price_cents"] == 8922
    assert sum(li["unit_price_cents"] * li["quantity"] for li in items) == 9576


def test_build_invoice_line_items_rejects_invalid_sku():
    """Bad SKU → ValueError. Endpoint translates to 400."""
    import membership_subscribe  # noqa: PLC0415

    with pytest.raises(ValueError, match="sku"):
        membership_subscribe.build_invoice_line_items(
            sku="not-a-real-sku", cadence="monthly", is_first_invoice=True,
        )


def test_build_invoice_line_items_rejects_invalid_cadence():
    """Bad cadence → ValueError. Endpoint translates to 400."""
    import membership_subscribe  # noqa: PLC0415

    with pytest.raises(ValueError, match="cadence"):
        membership_subscribe.build_invoice_line_items(
            sku="coastal-tea-monthly", cadence="annual", is_first_invoice=True,
        )


def test_subscription_intent_id_is_deterministic_per_email_sku_cadence():
    """Same (email, sku, cadence, day) → same intent id. Used for idempotency
    so a Custee double-clicking the subscribe button doesn't mint two
    invoices."""
    import membership_subscribe  # noqa: PLC0415

    a = membership_subscribe.make_subscription_intent_id(
        email="custee@example.com", sku="coastal-tea-monthly", cadence="monthly",
        day_iso="2026-05-11",
    )
    b = membership_subscribe.make_subscription_intent_id(
        email="custee@example.com", sku="coastal-tea-monthly", cadence="monthly",
        day_iso="2026-05-11",
    )
    assert a == b
    assert a.startswith("sub_")

    # Different email → different id
    c = membership_subscribe.make_subscription_intent_id(
        email="other@example.com", sku="coastal-tea-monthly", cadence="monthly",
        day_iso="2026-05-11",
    )
    assert c != a

    # Same params next day → different id (re-subscribing is fine)
    d = membership_subscribe.make_subscription_intent_id(
        email="custee@example.com", sku="coastal-tea-monthly", cadence="monthly",
        day_iso="2026-05-12",
    )
    assert d != a
