"""Pytest matrix for `scripts/equation.py`.

Tests the canonical 3-6-9 Tesla Vortex × V.I.B.E. × Three Pillars
mathematics + the integration with `authority_tiers.is_within_authority`
+ the server-side floor calculation + the escalation-token path.

Owner-locked answers (per `coastal-matrix-billing-spec.md` § Locked
decisions): pillars are additive, capped at +130%; Cafe = Team 2.5×;
9-month is distributed-discount (effective ≈ 0.75× the per-bag rate
when paid as 9 × monthly + 3 free months tail).

Worked examples below match the worked examples in the layered-authority
plan (`~/.claude/plans/kind-noodling-aurora.md` rev 2).
"""
from __future__ import annotations

import os
import pathlib
import sys

os.environ.setdefault("COASTAL_APPROVE_SECRET", "test-secret-do-not-use-in-prod")

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

import equation  # noqa: E402


# ---------------------------------------------------------------------------
# compute_effective_price — Equation core
# ---------------------------------------------------------------------------

def test_individual_no_pillars_ppu_returns_msrp():
    out = equation.compute_effective_price(
        msrp=19.49, qty=1, vibe="individual", pillars=[], frequency="ppu",
    )
    assert out["effective_unit"] == 19.49
    assert out["effective_total"] == 19.49
    assert out["pillar_uplift_total"] == 0.0


def test_family_multiplier_applies():
    out = equation.compute_effective_price(
        msrp=19.49, qty=1, vibe="family", pillars=[], frequency="ppu",
    )
    # 19.49 × 1.5 = 29.235 → 29.24 (rounded)
    assert out["effective_unit"] == 29.24


def test_team_multiplier_applies():
    out = equation.compute_effective_price(
        msrp=19.49, qty=1, vibe="team", pillars=[], frequency="ppu",
    )
    # 19.49 × 2.5 = 48.725 → 48.73
    assert out["effective_unit"] == 48.73


def test_cafe_alias_matches_team():
    cafe = equation.compute_effective_price(
        msrp=19.49, qty=1, vibe="cafe", pillars=[], frequency="ppu",
    )
    team = equation.compute_effective_price(
        msrp=19.49, qty=1, vibe="team", pillars=[], frequency="ppu",
    )
    assert cafe["effective_unit"] == team["effective_unit"]


def test_pillars_additive():
    # Confidence Verified +15% + Convenience Priority +20% + Security Professional +25% = +60%
    out = equation.compute_effective_price(
        msrp=19.49, qty=1, vibe="family",
        pillars=["sourcing-verified", "delivery-priority", "quality-professional"],
        frequency="3-month",
    )
    # 19.49 × 1.5 × (1 + 0.60) = 46.776 → 46.78
    assert out["effective_unit"] == 46.78
    assert out["pillar_uplift_total"] == 0.60
    assert len(out["pillar_breakdown"]) == 3


def test_pillar_uplift_caps_at_130pct():
    # Three top-tier pillars: 35 + 45 + 50 = 130% (exactly the cap)
    out = equation.compute_effective_price(
        msrp=19.49, qty=1, vibe="individual",
        pillars=["sourcing-guaranteed", "delivery-instant", "quality-fortress"],
        frequency="ppu",
    )
    assert out["pillar_uplift_total"] == 1.30
    # 19.49 × 1.0 × (1 + 1.30) = 44.827 → 44.83
    assert out["effective_unit"] == 44.83


def test_canonical_aims_pillar_names_work():
    # Same uplifts via the AIMS-canonical names
    coastal = equation.compute_effective_price(
        msrp=19.49, qty=1, vibe="individual",
        pillars=["sourcing-verified"],
        frequency="ppu",
    )
    aims = equation.compute_effective_price(
        msrp=19.49, qty=1, vibe="individual",
        pillars=["confidence-verified"],
        frequency="ppu",
    )
    assert coastal["effective_unit"] == aims["effective_unit"]


def test_frequency_factors():
    # PPU and 3-mo same base
    ppu = equation.compute_effective_price(
        msrp=19.49, qty=12, vibe="individual", pillars=[], frequency="ppu",
    )
    three = equation.compute_effective_price(
        msrp=19.49, qty=12, vibe="individual", pillars=[], frequency="3-month",
    )
    six = equation.compute_effective_price(
        msrp=19.49, qty=12, vibe="individual", pillars=[], frequency="6-month",
    )
    nine = equation.compute_effective_price(
        msrp=19.49, qty=12, vibe="individual", pillars=[], frequency="9-month-pay9-get12",
    )
    assert ppu["effective_total"] == three["effective_total"]
    assert six["effective_total"] < three["effective_total"]   # ~10% less
    assert nine["effective_total"] < six["effective_total"]    # ~25% less
    # 19.49 × 12 × 0.75 = 175.41
    assert nine["effective_total"] == 175.41


def test_unknown_pillars_silently_ignored():
    out = equation.compute_effective_price(
        msrp=19.49, qty=1, vibe="individual",
        pillars=["fake-pillar", "sourcing-verified", "malformed"],
        frequency="ppu",
    )
    # Only sourcing-verified counts → +15%
    assert out["pillar_uplift_total"] == 0.15


# ---------------------------------------------------------------------------
# compute_floor_internal — server-internal floor math
# ---------------------------------------------------------------------------

def test_floor_uses_real_sku_cost_data():
    floor = equation.compute_floor_internal("coastal-italian-roast-12oz", qty=1)
    assert floor is not None
    # From catalog.py:46-60 — wholesale 15.78, fulfillment 1.80, min margin 3.00
    assert floor["wholesale_cost"] == 15.78
    assert floor["fulfillment_cost"] == 1.80
    assert floor["min_margin_floor"] == 3.0
    # unit_cost = 15.78 + 1.80 = 17.58
    assert floor["unit_cost"] == 17.58
    # unit_floor = 17.58 + 3.00 = 20.58
    assert floor["unit_floor"] == 20.58
    # order_floor = 20.58 × 1 + 5.00 = 25.58
    assert floor["order_floor"] == 25.58


def test_floor_unknown_sku_returns_none():
    assert equation.compute_floor_internal("not-a-real-sku", qty=1) is None


def test_floor_scales_with_qty():
    floor1 = equation.compute_floor_internal("coastal-italian-roast-12oz", qty=1)
    floor10 = equation.compute_floor_internal("coastal-italian-roast-12oz", qty=10)
    assert floor1 is not None and floor10 is not None
    # order_floor = 20.58 × 10 + 5.00 = 210.80
    assert floor10["order_floor"] == 210.80


# ---------------------------------------------------------------------------
# quote() — master integration
# ---------------------------------------------------------------------------

def test_quote_sal_above_tier_cap_escalates():
    # Sal's bare-tier cap is 10% (no bundle). A 15% request from Sal must
    # escalate even when max_giveable is comfortably above 15% — the binding
    # ceiling is whichever is smaller of (tier cap, floor max_giveable).
    q = equation.quote(
        sku_id="coastal-italian-roast-12oz",
        qty=1,
        vibe="individual",
        pillars=[],
        frequency="ppu",
        actor="sal_ang",
        requested_discount_pct=15.0,
    )
    # Sal's cap is 10% → 15% request must escalate.
    assert q["escalation_required"]
    assert q["stepper_token"]
    # Sanity: the floor isn't the binding ceiling at current pricing
    # (post-pricing-policy MSRP keeps room above Sal's tier cap).
    assert q["_internal_max_giveable_pct"] > 10.0


def test_quote_sal_within_ceiling_applied():
    # Family 1.5× × 12 bags × Confidence Verified +15% × 3-mo:
    #   eff_unit = 19.99 × 1.5 × 1.15 = 34.4828 → 34.48
    #   eff_total = 34.48 × 12 × 1.0 = 413.79
    #   floor = (20.58 × 12) + 5 = 251.96
    #   max_giveable = (413.79 - 251.96) / 413.79 ≈ 39.1%
    # Sal cap = 15% on bundle → binding = 15%. Requested 10% → applied.
    q = equation.quote(
        sku_id="coastal-italian-roast-12oz",
        qty=12,
        vibe="family",
        pillars=["sourcing-verified"],
        frequency="3-month",
        actor="sal_ang",
        requested_discount_pct=10.0,
        is_bundle=True,
    )
    assert not q["escalation_required"]
    assert q["discount_applied_pct"] == 10.0
    assert q["actor_tier"] == "T3"


def test_quote_sal_above_ceiling_escalates():
    # Same setup but requesting 25% — Sal's bundle cap is 15%, so escalate.
    q = equation.quote(
        sku_id="coastal-italian-roast-12oz",
        qty=12,
        vibe="family",
        pillars=["sourcing-verified"],
        frequency="3-month",
        actor="sal_ang",
        requested_discount_pct=25.0,
        is_bundle=True,
    )
    assert q["escalation_required"]
    assert q["discount_applied_pct"] == 0.0
    assert q["stepper_token"]


def test_quote_acheevy_uncapped_at_tier_but_floor_binds():
    # ACHEEVY uncapped at the tier layer, but floor still binds.
    # 12 bags Family 1.5× 3-mo, max_giveable ≈ 39.1%.
    # ACHEEVY tries 30% → within floor, applied.
    q = equation.quote(
        sku_id="coastal-italian-roast-12oz",
        qty=12,
        vibe="family",
        pillars=["sourcing-verified"],
        frequency="3-month",
        actor="acheevy",
        requested_discount_pct=30.0,
        is_bundle=True,
    )
    assert not q["escalation_required"]
    assert q["discount_applied_pct"] == 30.0


def test_quote_acheevy_above_floor_still_escalates():
    # ACHEEVY is uncapped at the tier layer, but the floor still binds.
    # Pick a discount safely above the SKU's current max_giveable so the
    # escalation triggers via floor-binding, not tier cap. Read max_giveable
    # via a probe quote and request +5% above it.
    probe = equation.quote(
        sku_id="coastal-italian-roast-12oz",
        qty=12,
        vibe="family",
        pillars=["sourcing-verified"],
        frequency="3-month",
        actor="acheevy",
        requested_discount_pct=0.0,
        is_bundle=True,
    )
    above_floor = round(probe["_internal_max_giveable_pct"] + 5.0, 2)

    q = equation.quote(
        sku_id="coastal-italian-roast-12oz",
        qty=12,
        vibe="family",
        pillars=["sourcing-verified"],
        frequency="3-month",
        actor="acheevy",
        requested_discount_pct=above_floor,
        is_bundle=True,
    )
    assert q["escalation_required"], (
        f"ACHEEVY requesting {above_floor}% above max_giveable "
        f"{probe['_internal_max_giveable_pct']:.2f}% must escalate"
    )
    # Even the digital twin can't go below the floor.


def test_quote_luc_zero_discount_authority_escalates():
    q = equation.quote(
        sku_id="coastal-italian-roast-12oz",
        qty=12,
        vibe="family",
        pillars=[],
        frequency="3-month",
        actor="luc",
        requested_discount_pct=5.0,
    )
    # LUC has zero margin discount — even small ask escalates.
    assert q["escalation_required"]


def test_quote_melli_bulk_ladder_50_units():
    q50 = equation.quote(
        sku_id="coastal-italian-roast-12oz",
        qty=50,
        vibe="team",
        pillars=[],
        frequency="3-month",
        actor="melli",
        requested_discount_pct=20.0,
    )
    # Melli T2_BULK at 50u → 25% cap. 20% within → applied.
    assert not q50["escalation_required"]
    assert q50["tier_ceiling_pct"] == 25.0


def test_quote_melli_bulk_ladder_100_units():
    q100 = equation.quote(
        sku_id="coastal-italian-roast-12oz",
        qty=100,
        vibe="team",
        pillars=[],
        frequency="3-month",
        actor="melli",
        requested_discount_pct=30.0,
    )
    # Melli T2_BULK at 100u → 35% cap. 30% within → applied.
    assert not q100["escalation_required"]
    assert q100["tier_ceiling_pct"] == 35.0


def test_quote_unknown_sku_returns_error_quote():
    q = equation.quote(
        sku_id="not-a-real-sku",
        qty=1,
        actor="acheevy",
    )
    assert q["msrp_unit"] == 0.0
    assert q["effective_total"] == 0.0
    assert q["escalation_required"] is True


# ---------------------------------------------------------------------------
# strip_internal_fields — cost protection at HTTP boundary
# ---------------------------------------------------------------------------

def test_strip_removes_internal_fields():
    q = equation.quote(
        sku_id="coastal-italian-roast-12oz",
        qty=12,
        vibe="family",
        pillars=["sourcing-verified"],
        frequency="3-month",
        actor="sal_ang",
        requested_discount_pct=5.0,
        is_bundle=True,
    )
    public = equation.strip_internal_fields(q)
    # Public keys preserved
    assert "msrp_unit" in public
    assert "effective_total" in public
    assert "discount_applied_pct" in public
    assert "tier_ceiling_pct" in public
    # Internal keys stripped
    assert "_internal_unit_cost" not in public
    assert "_internal_unit_floor" not in public
    assert "_internal_order_floor" not in public
    assert "_internal_margin" not in public
    # No stray "wholesale_cost" or "fulfillment_cost" leaked anywhere
    forbidden = {"wholesale_cost", "fulfillment_cost", "min_margin_floor"}
    for k in public.keys():
        assert k not in forbidden, f"forbidden key {k} leaked through"


def test_internal_fields_preserved_in_unstripped_quote():
    q = equation.quote(
        sku_id="coastal-italian-roast-12oz",
        qty=1, actor="acheevy",
    )
    # Server-internal fields exist before strip
    assert "_internal_unit_cost" in q
    assert "_internal_unit_floor" in q
    assert "_internal_order_floor" in q
    assert "_internal_max_giveable_pct" in q
    assert "_internal_margin" in q
