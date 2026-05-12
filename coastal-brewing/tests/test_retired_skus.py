"""Pytest for retired-SKU visibility filter.

Owner directive 2026-05-11: the legacy 4-product subscribe-flow
(coastal-coffee-monthly / coastal-tea-monthly / coastal-combo-monthly /
coastal-functional-coffee-monthly) was retired when the per-tier
ProductMatrixPicker shipped (PR #409 / #410 / #411). The frontend flow
no longer reaches their checkout endpoint, but the SKUs were left in
`scripts/catalog.py` PRODUCTS dict — so:

  - `list_products()` still returns them in the catalog response
  - `get_product()` still resolves them by id
  - `recommend_bundle()` (Sal's chat recommender) can still pick them
  - External catalog scrapers see them at the recomputed margin MSRP

This test pins the retirement filter behavior. SKUs marked with a
`retired_at` ISO date are excluded from customer-facing accessors.
Server-internal accessors can still see them for audit / grandfathered
billing.

Run: `python -m pytest tests/test_retired_skus.py -v`
"""
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))


RETIRED_LEGACY_SUB_SKUS = (
    "coastal-coffee-monthly",
    "coastal-tea-monthly",
    "coastal-combo-monthly",
)


# ────────────────────────── retirement field marked on each SKU ──────────────────────────


def test_retired_skus_carry_retired_at_marker():
    """Each retired legacy subscription SKU has a `retired_at` ISO date."""
    import catalog  # noqa: PLC0415

    for sku_id in RETIRED_LEGACY_SUB_SKUS:
        product = catalog.PRODUCTS[sku_id]
        assert product.get("retired_at"), (
            f"{sku_id} must carry a retired_at ISO date marker"
        )


# ────────────────────────── customer-facing accessors filter retired ──────────────────────────


def test_list_products_excludes_retired():
    """`list_products()` is customer-facing — must NOT include retired SKUs."""
    import catalog  # noqa: PLC0415

    listed_ids = {p["id"] for p in catalog.list_products()}
    for sku_id in RETIRED_LEGACY_SUB_SKUS:
        assert sku_id not in listed_ids, (
            f"{sku_id} is retired — must not appear in customer-facing list_products()"
        )


def test_list_products_with_subscription_category_excludes_retired():
    """The 'subscription' category filter must also exclude retired SKUs —
    otherwise a Custee browsing /products?cat=subscription sees the dead flow."""
    import catalog  # noqa: PLC0415

    sub_ids = {p["id"] for p in catalog.list_products(category="subscription")}
    for sku_id in RETIRED_LEGACY_SUB_SKUS:
        assert sku_id not in sub_ids, (
            f"{sku_id} is retired — must not appear in subscription-category listing"
        )


def test_get_product_returns_none_for_retired():
    """`get_product()` is customer-facing — retired SKUs resolve to None
    so chat surfaces, PDP routes, and order intake all 404."""
    import catalog  # noqa: PLC0415

    for sku_id in RETIRED_LEGACY_SUB_SKUS:
        assert catalog.get_product(sku_id) is None, (
            f"{sku_id} is retired — get_product() must return None"
        )


# ────────────────────────── internal accessors still see retired ──────────────────────────


def test_list_products_internal_still_includes_retired_for_audit():
    """Server-internal listing keeps retired SKUs visible so audit / margin
    calc / grandfathered-customer billing can still resolve them."""
    import catalog  # noqa: PLC0415

    internal_ids = {p["id"] for p in catalog.list_products_internal()}
    for sku_id in RETIRED_LEGACY_SUB_SKUS:
        assert sku_id in internal_ids, (
            f"{sku_id} is retired but server-internal listing must still see it for audit"
        )


def test_get_product_internal_still_resolves_retired():
    """Server-internal lookup must still return the retired SKU's data —
    used by audit ledger, margin tools, grandfathered Stripe lookups."""
    import catalog  # noqa: PLC0415

    for sku_id in RETIRED_LEGACY_SUB_SKUS:
        product = catalog.get_product_internal(sku_id)
        assert product is not None, (
            f"{sku_id} server-internal lookup must still resolve"
        )
        assert product.get("retired_at"), "retired_at must be present"


# ────────────────────────── chat recommender doesn't pick retired ──────────────────────────


def test_recommend_bundle_does_not_pick_retired_subs():
    """Sal's chat recommender (recommend_bundle) must NOT propose retired
    subscription SKUs as bundle picks — those checkouts no longer mint
    Stripe sessions, so a Custee accepting Sal's recommendation hits a
    dead endpoint.

    Probes use the canonical preference shape (category + size = monthly)
    that previously routed straight into the retired SKUs at L5014-5023.
    """
    import catalog  # noqa: PLC0415

    probes = [
        # Previously routed → coastal-coffee-monthly
        {"category": "coffee", "size": "monthly", "caffeine": "on"},
        # Previously routed → coastal-tea-monthly
        {"category": "tea", "size": "monthly"},
        # Previously routed → coastal-combo-monthly
        {"category": "mixed", "size": "monthly"},
    ]

    for prefs in probes:
        result = catalog.recommend_bundle(prefs)
        picked_ids = {p["id"] for p in result.get("picks", []) if isinstance(p, dict)}
        for sku_id in RETIRED_LEGACY_SUB_SKUS:
            assert sku_id not in picked_ids, (
                f"recommend_bundle({prefs}) picked retired SKU {sku_id} "
                f"(all picks: {sorted(picked_ids)})"
            )
        # Don't leave the Custee with an empty recommendation — falling
        # back to the discovery bundle is acceptable.
        assert picked_ids, f"recommend_bundle({prefs}) returned empty picks"
