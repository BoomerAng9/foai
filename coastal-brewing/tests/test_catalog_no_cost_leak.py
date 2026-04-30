"""Pytest regression — customer-facing catalog APIs must NEVER expose cost data.

Owner directive 2026-04-30: "we never reveal to the user what our COST is.
this can never be known."

These tests assert that:
  - `catalog.list_products()` never includes wholesale_cost, fulfillment_cost,
    min_margin_floor, or vendor_source_sku in any returned entry.
  - `catalog.get_product(slug)` never includes those fields.
  - `catalog.recommend_bundle(...)` never leaks cost data via `picks`.
  - The internal accessors `list_products_internal()` /
    `get_product_internal()` DO return the full dict (cost data preserved
    for server-internal margin calc + equation floor).

Failure of any of these tests means a customer can `curl /api/catalog | jq`
and read exactly what we paid Temecula. Hard fail in CI before deploy.

Run from repo root: `python -m pytest tests/test_catalog_no_cost_leak.py -v`.
"""
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import catalog  # noqa: E402

FORBIDDEN = {"wholesale_cost", "fulfillment_cost", "min_margin_floor", "vendor_source_sku"}


def _assert_no_forbidden(d: dict, where: str) -> None:
    leaked = FORBIDDEN.intersection(d.keys())
    assert not leaked, f"{where} leaked internal fields: {sorted(leaked)}"


def test_list_products_strips_cost_fields():
    products = catalog.list_products()
    assert products, "catalog.list_products() returned empty list — fixture issue"
    for p in products:
        _assert_no_forbidden(p, f"list_products()[{p.get('id', '?')}]")


def test_list_products_with_category_strips_cost_fields():
    coffee = catalog.list_products(category="coffee")
    assert coffee, "catalog.list_products(category='coffee') returned empty"
    for p in coffee:
        _assert_no_forbidden(p, f"list_products(coffee)[{p.get('id', '?')}]")


def test_get_product_strips_cost_fields():
    # Pick a known SKU from the canonical catalog
    p = catalog.get_product("coastal-italian-roast-12oz")
    assert p is not None, "coastal-italian-roast-12oz missing from catalog"
    _assert_no_forbidden(p, "get_product('coastal-italian-roast-12oz')")
    # Public fields should still be present
    assert p["msrp"] == 19.99
    assert p["name"] == "Coastal Italian Roast"


def test_get_product_unknown_returns_none():
    assert catalog.get_product("definitely-not-a-real-sku") is None


def test_recommend_bundle_picks_have_no_cost_data():
    rec = catalog.recommend_bundle({"size": "starter", "category": "mixed"})
    assert "picks" in rec
    for pick in rec["picks"]:
        _assert_no_forbidden(pick, f"recommend_bundle.picks[{pick.get('id', '?')}]")


def test_internal_accessors_preserve_cost_data():
    # Server-internal callers (margin calc, equation floor, NemoClaw) MUST
    # still see cost fields — that's what they're for.
    p_internal = catalog.get_product_internal("coastal-italian-roast-12oz")
    assert p_internal is not None
    assert "wholesale_cost" in p_internal, "internal accessor must keep cost"
    assert "fulfillment_cost" in p_internal
    assert "min_margin_floor" in p_internal


def test_internal_list_preserves_cost_data():
    products = catalog.list_products_internal()
    assert products
    sample = products[0]
    assert "wholesale_cost" in sample
    assert "fulfillment_cost" in sample
    assert "min_margin_floor" in sample


def test_calc_line_still_works_after_refactor():
    # calc_line reads cost via the internal accessor — refactor must not
    # break the margin breakdown shape.
    line = catalog.calc_line("coastal-italian-roast-12oz", qty=2, discount_pct=10.0)
    assert "error" not in line
    assert line["qty"] == 2
    assert line["msrp_unit"] == 19.99
    assert line["unit_cost"] > 0
    assert line["margin_pct"] > 0


def test_strip_helper_idempotent():
    full = catalog.PRODUCTS["coastal-italian-roast-12oz"]
    stripped_once = catalog._strip_internal_fields(full)
    stripped_twice = catalog._strip_internal_fields(stripped_once)
    assert stripped_once == stripped_twice
    _assert_no_forbidden(stripped_once, "_strip_internal_fields(full)")


def test_every_sku_has_cost_data_in_internal_view():
    """Every SKU in the catalog must have all four internal fields populated.
    If a SKU is missing cost data, calc_line / equation floor will silently
    misbehave. Catch it in CI rather than at quote time.
    """
    products = catalog.list_products_internal()
    for p in products:
        for field in FORBIDDEN:
            assert field in p, f"SKU {p['id']} missing internal field: {field}"
            assert p[field] is not None, f"SKU {p['id']} has None for {field}"
