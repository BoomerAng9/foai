"""Pytest matrix for `scripts/catalog.py` motto + compliance-lane derivation.

Owner directive 2026-04-30:
  - "Nothing Chemically, Ever." applies PER-PRODUCT, not catalog-wide
  - Functional / mushroom SKUs follow TCR's strict-lane labelling rules
    (forbidden therapeutic claims, required statement-of-identity, soft
    qualifiers only). TCR will suspend our fulfillment if violated.

This suite asserts the audit-pass landed correctly across all 236 SKUs.

Run from repo root: `python -m pytest tests/test_motto_eligibility.py -v`.
"""
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import catalog  # noqa: E402


# ---------------------------------------------------------------------------
# Per-SKU assertions across the full catalog
# ---------------------------------------------------------------------------

def test_every_sku_has_motto_eligibility_flag():
    """Module-load enrichment must annotate every SKU."""
    products = catalog.list_products_internal()
    for p in products:
        assert "motto_eligible" in p, f"SKU {p['id']} missing motto_eligible"
        assert isinstance(p["motto_eligible"], bool), f"SKU {p['id']} motto_eligible not bool"


def test_pure_coffee_is_motto_eligible():
    """Category=coffee with ingredients='COFFEE' (or similar) carries the motto."""
    products = catalog.list_products_internal()
    coffee = [p for p in products if p.get("category") == "coffee"]
    assert len(coffee) >= 100, "Coffee category should have many SKUs"
    for p in coffee:
        assert p["motto_eligible"] is True, (
            f"Pure coffee SKU {p['id']} should be motto_eligible=True "
            f"(ingredients={p.get('ingredients')!r})"
        )


def test_specialty_coffee_is_motto_eligible():
    products = catalog.list_products_internal()
    sp = [p for p in products if p.get("category") == "specialty_coffee"]
    assert sp, "specialty_coffee category should be populated"
    for p in sp:
        assert p["motto_eligible"] is True, f"specialty_coffee {p['id']} should be motto_eligible"


def test_pure_tea_is_motto_eligible():
    """All current tea SKUs are whole-leaf with no flavorings — motto applies."""
    products = catalog.list_products_internal()
    teas = [p for p in products if p.get("category") == "tea"]
    assert teas, "tea category should be populated"
    for p in teas:
        assert p["motto_eligible"] is True, f"tea {p['id']} should be motto_eligible"


def test_flavored_coffee_is_NOT_motto_eligible():
    """Flavored-coffee category contains 'COFFEE, NATURAL FLAVORINGS' —
    cannot literally carry 'Nothing Chemically, Ever.'"""
    products = catalog.list_products_internal()
    flavored = [p for p in products if p.get("category") == "flavored_coffee"]
    assert len(flavored) >= 50, "flavored_coffee should have many SKUs"
    for p in flavored:
        assert p["motto_eligible"] is False, f"flavored {p['id']} must NOT carry motto"


def test_kcup_is_NOT_motto_eligible():
    """K-cup filter material adds non-coffee components to the cup."""
    products = catalog.list_products_internal()
    kcups = [p for p in products if p.get("category") == "kcup"]
    assert kcups
    for p in kcups:
        assert p["motto_eligible"] is False, f"kcup {p['id']} must NOT carry motto"


def test_functional_is_NOT_motto_eligible():
    """Mushroom blends are not pure coffee."""
    products = catalog.list_products_internal()
    func = [p for p in products if p.get("category") == "functional"]
    assert len(func) == 5, "Expected 5 functional/mushroom SKUs"
    for p in func:
        assert p["motto_eligible"] is False, f"functional {p['id']} must NOT carry motto"


# ---------------------------------------------------------------------------
# Mushroom strict-lane compliance (TCR-canonical)
# ---------------------------------------------------------------------------

def test_every_functional_sku_is_mushroom_strict():
    """TCR's mushroom-coffee documentation locks the labelling lane.
    Violation = TCR suspends fulfillment until corrected."""
    products = catalog.list_products_internal()
    func = [p for p in products if p.get("category") == "functional"]
    assert len(func) == 5
    for p in func:
        assert p.get("compliance_lane") == "mushroom_strict", (
            f"functional SKU {p['id']} must be in mushroom_strict lane"
        )


def test_non_mushroom_skus_have_no_compliance_lane():
    """Only mushroom/functional SKUs need a strict compliance lane."""
    products = catalog.list_products_internal()
    non_func = [p for p in products if p.get("category") != "functional"]
    for p in non_func:
        # SKUs that don't have mushroom in their ingredient list shouldn't
        # have a compliance_lane set
        ingredients = (p.get("ingredients") or "").upper()
        if not any(t in ingredients for t in ("MUSHROOM", "LION", "CORDYCEPS", "REISHI")):
            assert "compliance_lane" not in p or p.get("compliance_lane") is None, (
                f"non-mushroom SKU {p['id']} should not have compliance_lane"
            )


# ---------------------------------------------------------------------------
# Sample pack + bundle edge cases
# ---------------------------------------------------------------------------

def test_sample_pack_split_by_flavored():
    """Best-sellers + single-origin sample packs carry the motto;
    flavored sample pack does not (contains NATURAL FLAVORINGS)."""
    products = catalog.list_products_internal()
    bs = next((p for p in products if p["id"] == "coastal-best-sellers-sampler"), None)
    so = next((p for p in products if p["id"] == "coastal-single-origin-sampler"), None)
    fl = next((p for p in products if p["id"] == "coastal-flavored-sampler"), None)
    assert bs and so and fl, "All three sample-pack variants must exist"
    assert bs["motto_eligible"] is True
    assert so["motto_eligible"] is True
    assert fl["motto_eligible"] is False


# ---------------------------------------------------------------------------
# Public-API plumbing — the flags survive list_products / get_product
# ---------------------------------------------------------------------------

def test_motto_eligible_flag_survives_public_accessor():
    """`motto_eligible` is customer-visible (front-end uses it to render
    the badge conditionally) — must NOT be stripped."""
    p = catalog.get_product("coastal-italian-roast-12oz")
    assert p is not None
    assert "motto_eligible" in p
    assert p["motto_eligible"] is True


def test_compliance_lane_flag_survives_public_accessor():
    """compliance_lane is a routing label — public is fine. Tells the
    front-end to render the TCR-canonical statement-of-identity."""
    p = catalog.get_product("coastal-functional-coffee-with-mushrooms-dark-ground-8oz")
    assert p is not None
    assert p.get("compliance_lane") == "mushroom_strict"


def test_owner_override_motto_eligible_takes_precedence():
    """If owner sets `motto_eligible: True` explicitly on a flavored SKU
    (e.g., a "Coastal Honey" line where honey is considered natural),
    the explicit value wins over the derivation rule."""
    fake = {
        "category": "flavored_coffee",
        "ingredients": "COFFEE, HONEY",
        "motto_eligible": True,  # explicit override
        "id": "test-fake",
    }
    assert catalog._derive_motto_eligibility(fake) is True


def test_owner_override_compliance_lane_takes_precedence():
    """Owner can set compliance_lane explicitly to override the rule."""
    fake = {
        "category": "coffee",
        "ingredients": "COFFEE",
        "compliance_lane": "custom_test_lane",
        "id": "test-fake",
    }
    assert catalog._derive_compliance_lane(fake) == "custom_test_lane"


# ---------------------------------------------------------------------------
# Aggregate counts (sanity)
# ---------------------------------------------------------------------------

def test_aggregate_counts_match_audit():
    """The audit-pass produced specific counts; lock them so future SKU
    additions trigger a test failure that forces explicit categorization."""
    products = catalog.list_products_internal()
    eligible = sum(1 for p in products if p["motto_eligible"])
    not_eligible = sum(1 for p in products if not p["motto_eligible"])
    mushroom = sum(1 for p in products if p.get("compliance_lane") == "mushroom_strict")

    # Locked counts as of audit-pass 2026-04-30:
    # 156 eligible (124 coffee + 12 specialty + 11 tea + 1 instant
    #   + 2 sample_pack + 3 subscription + 3 bundle)
    # 80 not eligible (64 flavored + 10 kcup + 5 functional + 1 sample_pack)
    # 5 mushroom_strict
    assert eligible == 156, f"Expected 156 motto-eligible, got {eligible}"
    assert not_eligible == 80, f"Expected 80 not-eligible, got {not_eligible}"
    assert mushroom == 5, f"Expected 5 mushroom_strict, got {mushroom}"
    assert eligible + not_eligible == 236
