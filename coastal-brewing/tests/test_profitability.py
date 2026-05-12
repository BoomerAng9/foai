"""Pytest matrix for `scripts/profitability.py`.

Pure-logic envelope + floor checker for the 3 Coastal tier endpoints
(Pooler Pass / Custee Card / Wood Stork). Gates Stripe Checkout mint:
basket within tier envelope AND above cost-floor → OK; otherwise 400
with an upgrade-tier upsell.

Tier envelopes (monthly product retail, cents):
  pooler-pass-standard  →  1500   (1 item, ~$15/mo)
  pooler-pass-plus       →  3000   (2 items + à la carte discount)
  custee-card            →  6000   (2 items / quarter swap)
  wood-stork-standard    → 15000   (bulk B2B, 1-3 addresses)
  wood-stork-reserve     → 30000   (bulk + whitelabel, 1-10 addresses)

Floor canon: per-item monthly retail must be ≥ monthly_cost_cents + 150.

Run: `python -m pytest tests/test_profitability.py -v`
"""
from __future__ import annotations

import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))


# ────────────────────────── envelope: basket within tier cap ──────────────────────────


def test_basket_within_envelope_passes_for_custee_card():
    """Custee Card envelope = $60/mo product retail. Basket of $26.99 +
    $34.99 = $61.98 — narrowly over, exceeds_envelope=True. Basket of
    $26.99 alone = $26.99 — well under, ok=True."""
    import profitability  # noqa: PLC0415

    result = profitability.check_envelope(
        tier="custee-card",
        basket=[
            {"product_id": "tea", "monthly_retail_cents": 2699, "monthly_cost_cents": 800},
        ],
    )

    assert result.ok is True
    assert result.exceeds_envelope is False
    assert result.below_floor is False
    assert result.basket_retail_cents == 2699
    assert result.envelope_max_cents == 6000
    assert result.upgrade_to is None


def test_basket_exceeds_envelope_returns_upgrade_suggestion():
    """Basket > envelope → ok=False, exceeds_envelope=True, upgrade_to set
    to next tier up. Custee Card → Wood Stork Standard."""
    import profitability  # noqa: PLC0415

    result = profitability.check_envelope(
        tier="custee-card",
        basket=[
            {"product_id": "tea", "monthly_retail_cents": 2699, "monthly_cost_cents": 800},
            {"product_id": "coffee", "monthly_retail_cents": 3499, "monthly_cost_cents": 1100},
        ],
    )

    assert result.ok is False
    assert result.exceeds_envelope is True
    assert result.basket_retail_cents == 6198
    assert result.envelope_max_cents == 6000
    assert result.upgrade_to == "wood-stork-standard"
    assert result.reason is not None
    assert "exceeds" in result.reason.lower()


# ────────────────────────── envelope: tier-by-tier caps ──────────────────────────


def test_all_tier_envelope_caps_match_canon():
    """Owner-ratified canon 2026-05-11: tier envelopes in cents."""
    import profitability  # noqa: PLC0415

    assert profitability.tier_envelope_cents("pooler-pass-standard") == 1500
    assert profitability.tier_envelope_cents("pooler-pass-plus") == 3000
    assert profitability.tier_envelope_cents("custee-card") == 6000
    assert profitability.tier_envelope_cents("wood-stork-standard") == 15000
    assert profitability.tier_envelope_cents("wood-stork-reserve") == 30000


def test_pooler_pass_standard_one_item_envelope():
    """Pooler Pass Standard = 1 item, ~$15/mo envelope. $14.99 tea = OK."""
    import profitability  # noqa: PLC0415

    result = profitability.check_envelope(
        tier="pooler-pass-standard",
        basket=[
            {"product_id": "tea", "monthly_retail_cents": 1499, "monthly_cost_cents": 400},
        ],
    )

    assert result.ok is True
    assert result.envelope_max_cents == 1500


def test_pooler_pass_standard_two_items_exceeds():
    """Two items at Pooler Pass Standard → suggest Pooler Pass Plus."""
    import profitability  # noqa: PLC0415

    result = profitability.check_envelope(
        tier="pooler-pass-standard",
        basket=[
            {"product_id": "tea", "monthly_retail_cents": 1499, "monthly_cost_cents": 400},
            {"product_id": "coffee", "monthly_retail_cents": 1499, "monthly_cost_cents": 400},
        ],
    )

    assert result.ok is False
    assert result.exceeds_envelope is True
    assert result.upgrade_to == "pooler-pass-plus"


def test_wood_stork_reserve_is_top_tier_no_upgrade():
    """Wood Stork Reserve is the top tier — exceeding it returns
    upgrade_to=None (suggest contact for custom). 31000 > 30000 envelope."""
    import profitability  # noqa: PLC0415

    result = profitability.check_envelope(
        tier="wood-stork-reserve",
        basket=[
            {"product_id": "bulk-coffee", "monthly_retail_cents": 31000, "monthly_cost_cents": 8000},
        ],
    )

    assert result.ok is False
    assert result.exceeds_envelope is True
    assert result.upgrade_to is None  # top tier — fall back to custom contact
    assert "contact" in (result.reason or "").lower() or "custom" in (result.reason or "").lower()


# ────────────────────────── floor: cost + $1.50 per item ──────────────────────────


def test_floor_violation_when_retail_below_cost_plus_dollar_fifty():
    """Per-item: monthly_retail_cents must be ≥ monthly_cost_cents + 150.
    Tea costing $20 sold at $21 monthly retail = below floor ($21 < $21.50).
    """
    import profitability  # noqa: PLC0415

    result = profitability.check_envelope(
        tier="custee-card",
        basket=[
            {"product_id": "tea", "monthly_retail_cents": 2100, "monthly_cost_cents": 2000},
        ],
    )

    assert result.ok is False
    assert result.below_floor is True
    assert result.reason is not None
    assert "floor" in result.reason.lower()


def test_floor_exact_equal_passes():
    """Edge case: retail exactly equal to cost + 150 passes the floor."""
    import profitability  # noqa: PLC0415

    result = profitability.check_envelope(
        tier="custee-card",
        basket=[
            {"product_id": "tea", "monthly_retail_cents": 2150, "monthly_cost_cents": 2000},
        ],
    )

    assert result.ok is True
    assert result.below_floor is False


# ────────────────────────── error cases ──────────────────────────


def test_unknown_tier_raises():
    """Unknown tier id → ValueError. Endpoint translates to 400."""
    import profitability  # noqa: PLC0415

    with pytest.raises(ValueError, match="tier"):
        profitability.check_envelope(
            tier="not-a-tier",
            basket=[{"product_id": "tea", "monthly_retail_cents": 2699, "monthly_cost_cents": 800}],
        )


def test_empty_basket_returns_ok_zero_total():
    """Empty basket = 0 retail, passes both envelope (0 ≤ anything) and
    floor (no items to floor-check). Endpoint may still 400 on empty
    basket for UX reasons; that's an endpoint concern, not a profitability
    concern."""
    import profitability  # noqa: PLC0415

    result = profitability.check_envelope(tier="custee-card", basket=[])

    assert result.ok is True
    assert result.basket_retail_cents == 0
    assert result.below_floor is False
    assert result.exceeds_envelope is False


# ────────────────────────── tier upgrade chain ──────────────────────────


def test_tier_upgrade_chain_canon():
    """next_tier() walks the upgrade ladder. Top tier → None."""
    import profitability  # noqa: PLC0415

    assert profitability.next_tier("pooler-pass-standard") == "pooler-pass-plus"
    assert profitability.next_tier("pooler-pass-plus") == "custee-card"
    assert profitability.next_tier("custee-card") == "wood-stork-standard"
    assert profitability.next_tier("wood-stork-standard") == "wood-stork-reserve"
    assert profitability.next_tier("wood-stork-reserve") is None
