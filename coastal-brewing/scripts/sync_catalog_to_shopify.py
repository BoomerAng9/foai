#!/usr/bin/env python3
"""One-shot uploader: catalog.py → Shopify products.

Owner directive 2026-05-06 — Shopify Admin becomes the GUI for product
management. This script bootstraps Shopify with every Coastal SKU in
catalog.py:
- Each SKU becomes its OWN Shopify product (one-variant pattern).
  Variant grouping (12oz/1lb/2lb/5lb under one parent) is a v2
  enhancement; for v1 we keep parity with the existing catalog row
  layout so the sync-back is straightforward.
- price = catalog.msrp (computed from the 60% margin policy)
- cost  = catalog.wholesale_cost
- body_html = catalog.blurb + ingredients + statement_of_identity
- tags = category + roast_level + custom tags
- metafields under namespace `coastal` carry: fulfillment_cost,
  margin_floor_pct, motto_eligible, compliance_lane

USAGE:
    # Dry-run (no API calls, just prints what would happen)
    python sync_catalog_to_shopify.py --dry-run

    # Dry-run, single SKU
    python sync_catalog_to_shopify.py --dry-run --sku coastal-italian-roast-12oz

    # Real sync
    SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com \\
    SHOPIFY_ADMIN_TOKEN=shpat_... \\
    python sync_catalog_to_shopify.py

    # Real sync, single SKU
    python sync_catalog_to_shopify.py --sku coastal-italian-roast-12oz

The script is IDEMPOTENT — re-running it updates existing products
rather than duplicating. Look up by SKU each time.
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

# Make sibling script imports work whether run from repo root or scripts/.
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "adapters"))

import catalog  # noqa: E402
from adapters import shopify_adapter as shop  # type: ignore  # noqa: E402


def _build_body_html(p: dict) -> str:
    """Compose the rich-text product description from catalog fields.
    Stays brand-voiced; ingredients + statement of identity included
    so FDA labels stay traceable from the storefront."""
    parts: list[str] = []
    blurb = (p.get("blurb") or "").strip()
    if blurb:
        parts.append(f"<p>{blurb}</p>")
    ingredients = p.get("ingredients")
    if ingredients:
        parts.append(f"<p><strong>Ingredients:</strong> {ingredients}</p>")
    statement = p.get("statement_of_identity")
    if statement:
        parts.append(f"<p><strong>Statement of identity:</strong> {statement}</p>")
    roast = p.get("roast_level")
    if roast:
        parts.append(f"<p><strong>Roast level:</strong> {roast}</p>")
    return "\n".join(parts)


def _build_tags(p: dict) -> list[str]:
    tags: list[str] = []
    cat = p.get("category")
    if cat:
        tags.append(cat)
    if p.get("size"):
        tags.append(p["size"])
    if isinstance(p.get("tags"), list):
        tags.extend(p["tags"])
    if p.get("motto_eligible"):
        tags.append("nothing-chemically-ever")
    return list(dict.fromkeys(tags))  # dedupe preserve order


def _build_metafields(p: dict) -> dict:
    """Internal fields that ride along with the product but are NOT
    customer-facing. Sacred Separation: cost / margin / fulfillment
    live in metafields under the coastal namespace; never surfaced via
    Storefront API to anonymous shoppers."""
    md: dict = {}
    if p.get("fulfillment_cost") is not None:
        md["fulfillment_cost"] = f"{float(p['fulfillment_cost']):.2f}"
    if p.get("compliance_lane"):
        md["compliance_lane"] = p["compliance_lane"]
    if p.get("min_margin_floor") is not None:
        md["min_margin_floor"] = f"{float(p['min_margin_floor']):.2f}"
    if p.get("effective_margin_pct") is not None:
        md["effective_margin_pct"] = f"{float(p['effective_margin_pct']):.1f}"
    if p.get("msrp_placeholder") is not None:
        md["msrp_placeholder"] = f"{float(p['msrp_placeholder']):.2f}"
    return md


def _public_image_url(image_path: str | None) -> str | None:
    """Shopify needs a publicly fetchable image URL. The catalog stores
    paths like `/products/coastal-italian-roast-12oz.png`; the live site
    serves them at brewing.foai.cloud. Strip leading slash for safety."""
    if not image_path:
        return None
    base = "https://brewing.foai.cloud"
    if image_path.startswith("http"):
        return image_path
    return f"{base}{image_path if image_path.startswith('/') else '/' + image_path}"


def _title_for(p: dict) -> str:
    """Customer-facing product title — leave the catalog name as-is.
    Shopify shows this in storefront + admin."""
    return p.get("name") or p.get("title") or p.get("id") or ""


def _weight_grams(p: dict) -> float | None:
    """Approximate weight from size string for shipping math.
    Shopify uses this for carrier rate calculation; not load-bearing for
    pricing."""
    size = (p.get("size") or "").lower()
    if "12oz" in size:
        return 340.0
    if "1lb" in size:
        return 454.0
    if "2lb" in size:
        return 907.0
    if "5lb" in size:
        return 2268.0
    if "8oz" in size:
        return 227.0
    if "3oz" in size:
        return 85.0
    if "1oz" in size:
        return 28.0
    if "2oz" in size:
        return 57.0
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync catalog.py → Shopify Admin")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--sku", type=str, default=None, help="Single SKU (default: all)")
    parser.add_argument("--limit", type=int, default=None, help="Stop after N successful upserts")
    parser.add_argument("--sleep-ms", type=int, default=350, help="Throttle between API calls (Shopify limit: 2/sec REST)")
    args = parser.parse_args()

    if not args.dry_run and not shop.is_configured():
        print(f"ERROR: Shopify adapter not configured. Missing: {shop.missing_keys()}", file=sys.stderr)
        print("Set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_TOKEN env vars.", file=sys.stderr)
        return 2

    products = catalog.list_products_internal()
    if args.sku:
        products = [p for p in products if p.get("id") == args.sku]
        if not products:
            print(f"ERROR: SKU {args.sku!r} not found in catalog.py", file=sys.stderr)
            return 2

    print(f"[sync] {'DRY RUN — ' if args.dry_run else ''}{len(products)} SKU(s) queued.")
    if not args.dry_run:
        probe = shop.probe()
        if not probe.get("ok"):
            print(f"ERROR: Shopify probe failed: {probe}", file=sys.stderr)
            return 3
        print(f"[sync] connected to {probe['shop_name']} ({probe['shop_domain']}, {probe.get('currency')})")

    n_created = n_updated = n_skipped = n_error = 0
    for i, p in enumerate(products, start=1):
        sku = p.get("id") or ""
        title = _title_for(p)
        try:
            res = shop.upsert_simple_product(
                sku=sku,
                title=title,
                body_html=_build_body_html(p),
                price=float(p.get("msrp") or 0.0),
                cost=float(p.get("wholesale_cost") or 0.0),
                image_url=_public_image_url(p.get("image")),
                tags=_build_tags(p),
                weight_grams=_weight_grams(p),
                metafields=_build_metafields(p),
                dry_run=args.dry_run,
            )
            tag = res.action.upper().split()[0]
            print(f"[{i:>3}/{len(products)}] {tag:<8} {sku}  →  ${p.get('msrp')}  (cost ${p.get('wholesale_cost')})")
            if res.action.startswith("created"):
                n_created += 1
            elif res.action.startswith("updated"):
                n_updated += 1
            else:
                n_skipped += 1
        except Exception as exc:
            n_error += 1
            print(f"[{i:>3}/{len(products)}] ERROR    {sku}: {exc}", file=sys.stderr)
        if args.limit and (n_created + n_updated) >= args.limit:
            print(f"[sync] hit --limit {args.limit}; stopping.")
            break
        if not args.dry_run and args.sleep_ms > 0:
            time.sleep(args.sleep_ms / 1000.0)

    print(f"[sync] done — created={n_created} updated={n_updated} skipped={n_skipped} errors={n_error}")
    return 0 if n_error == 0 else 4


if __name__ == "__main__":
    sys.exit(main())
