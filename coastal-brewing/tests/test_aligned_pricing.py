"""Pytest pinning aligned-pricing canon — 2026-05-11 PM owner directive.

Owner directive (`Align all pricing to be at or slightly above the
competition pricing, with a buffer for our Agentic add-on`) supersedes
the prior Anchor→Haggle→Landing model for catalog MSRPs.

Formula: market-top-from-research × 1.15 (Agentic buffer), rounded to
$X.99 anchor. Per-size variants follow the mass-market bulk progression.

This test pins every canonical (category, size) anchor so future drift
fails CI rather than slipping into production.

Run: `python -m pytest tests/test_aligned_pricing.py -v`
"""
from __future__ import annotations

import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))


# ────────────────────────── canonical anchors ──────────────────────────
# (category, size) → new aligned MSRP. Computed from
# `docs/Pricing in the marketdeep-research-report.md` market-top values
# × 1.15 Agentic buffer, rounded to $X.99.
EXPECTED_ALIGNED_MSRPS = {
    ("coffee", "12oz"): 28.99,
    ("coffee", "1lb"): 33.99,
    ("coffee", "2lb"): 49.99,
    ("coffee", "5lb"): 142.99,
    ("specialty_coffee", "12oz"): 34.99,
    ("specialty_coffee", "5lb"): 164.99,
    # Flavored 12oz/1lb anchored to cost-floor — see pricing-aligned-canon §Cost constraints
    ("flavored_coffee", "12oz"): 19.99,
    ("flavored_coffee", "1lb"): 24.99,
    ("flavored_coffee", "2lb"): 41.99,
    ("flavored_coffee", "5lb"): 99.99,
    ("tea", "3oz"): 18.99,
    ("tea", "1oz"): 50.99,  # matcha 1oz tin
    # K-Cup 12pk anchored to cost-floor — TCR wholesale exceeds research's $13 top
    ("kcup", "12pk"): 17.99,
    ("kcup", "48pk"): 45.99,
    ("instant", "3oz"): 38.99,
    ("functional", "8oz"): 56.99,
    ("functional", "3oz"): 56.99,
    ("functional", "1oz"): 56.99,
    ("sample_pack", "ea"): 30.99,
}


# ────────────────────────── aligned-table presence ──────────────────────────


def test_catalog_exposes_aligned_msrp_table():
    """The aligned MSRP table lives at module level as
    `_ALIGNED_MSRP_BY_CATEGORY_SIZE` so external tooling can audit
    canon without round-tripping through every SKU."""
    import catalog  # noqa: PLC0415

    assert hasattr(catalog, "_ALIGNED_MSRP_BY_CATEGORY_SIZE"), (
        "Canon-aligned MSRP table must be defined at module level"
    )
    table = catalog._ALIGNED_MSRP_BY_CATEGORY_SIZE
    assert isinstance(table, dict)
    assert len(table) >= 15, "Expected ≥15 (category, size) anchors"


@pytest.mark.parametrize(
    ("cat_size", "expected_msrp"),
    list(EXPECTED_ALIGNED_MSRPS.items()),
    ids=[f"{cat}_{size}" for (cat, size) in EXPECTED_ALIGNED_MSRPS],
)
def test_aligned_msrp_matches_canon(cat_size, expected_msrp):
    """Every (category, size) anchor in the canon table matches the
    research-derived value (market top × 1.15 → rounded)."""
    import catalog  # noqa: PLC0415

    table = catalog._ALIGNED_MSRP_BY_CATEGORY_SIZE
    assert table.get(cat_size) == expected_msrp, (
        f"{cat_size} canon mismatch: table says {table.get(cat_size)}, "
        f"expected {expected_msrp}"
    )


# ────────────────────────── per-SKU MSRP resolves to canon ──────────────────────────


def test_coffee_12oz_sample_msrp_is_canon_aligned():
    """Sampled Tier A house blend 12oz — must land at canon anchor $28.99
    after _enrich_products() runs. Probes the first available coffee SKU
    in 12oz size rather than pinning a specific SKU id (catalog rotation
    safe)."""
    import catalog  # noqa: PLC0415

    sample = next(
        (p for p in catalog.list_products(category="coffee")
         if p.get("size") == "12oz"),
        None,
    )
    assert sample is not None, "expected at least one 12oz coffee SKU"
    assert sample["msrp"] == 28.99


def test_dubai_chocolate_flavored_12oz_msrp_is_canon_aligned():
    """Coastal Dubai Chocolate 12oz — representative flavored — at
    canon anchor $19.99 (cost-floor-respecting; see canon §Cost constraints)."""
    import catalog  # noqa: PLC0415

    p = catalog.get_product("coastal-dubai-chocolate-12oz")
    assert p is not None, "coastal-dubai-chocolate-12oz must exist"
    assert p["msrp"] == 19.99


def test_kcup_12pk_msrp_is_canon_aligned():
    """Sampled K-Cup 12-count at canon anchor $17.99 (cost-floor-respecting)."""
    import catalog  # noqa: PLC0415

    sample = next(
        (p for p in catalog.list_products(category="kcup")
         if p.get("size") == "12pk"),
        None,
    )
    assert sample is not None, "expected at least one 12pk K-Cup SKU"
    assert sample["msrp"] == 17.99


def test_floor_enforcement_is_a_safety_net():
    """The cost-floor (cost + $1.50) is the immutable floor. If a future
    canon edit drops an aligned MSRP below floor, the enrichment must
    catch it and bump back up. Sanity-check across every SKU."""
    import catalog  # noqa: PLC0415

    for sku_id, p in catalog.PRODUCTS.items():
        if p.get("retired_at"):
            continue
        cost = p.get("wholesale_cost")
        if cost is None:
            continue  # bundles + virtual SKUs
        landed = float(cost) + float(p.get("fulfillment_cost", 0.0))
        floor = landed + 1.50
        assert p["msrp"] >= floor - 0.01, (  # 0.01 tolerance for $X.99 rounding
            f"{sku_id}: MSRP {p['msrp']} below cost-floor {floor:.2f}"
        )
