#!/usr/bin/env python3
"""One-shot migration: reads TCR Q1 2026 Drop Ship Pricing spreadsheet and
generates the comprehensive `catalog.py` PRODUCTS dict for Coastal Brewing
Co.

Owner directive 2026-04-30: expand from 20 hand-curated SKUs to the full
TCR drop-ship lineup (~70 SKUs) so the Coastal storefront can offer every
product TCR carries, with Coastal branding applied.

Run once after a TCR pricing refresh. Output overwrites the PRODUCTS dict
in `coastal-brewing/scripts/catalog.py`. The rest of catalog.py
(margin calc, recommend_bundle, helpers) is preserved.

Usage:
    python coastal-brewing/scripts/migrate_tcr_catalog.py
        --xlsx ~/iCloudDrive/.../Claude\\ Code/TCR\\ Q1\\ 2026\\ Drop\\ Ship\\ Pricing.xlsx
        --out  coastal-brewing/scripts/catalog.py
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import openpyxl

# Coastal retail markup tiers — markup applied to TCR wholesale 12oz cost.
# Owner-curated retail price bands; aligns with current $19.49 reference
# while opening the catalog to all TCR drop-ship SKUs.
RETAIL_BANDS = {
    "blend":         {"12oz": 19.99, "1lb": 26.99, "2lb": 44.99, "5lb": 84.99},
    "premium":       {"12oz": 20.99, "1lb": 27.99, "2lb": 46.99, "5lb": 86.99},  # decaf, half-caf, exotic blends
    "single_origin": {"12oz": 19.99, "1lb": 26.99, "2lb": 44.99, "5lb": 84.99},
    "single_premium":{"12oz": 21.99, "1lb": 28.99, "2lb": 48.99, "5lb": 89.99},  # exotic single origin (Bali, Sumatra, Kenya)
    "flavored":      {"12oz": 19.99, "1lb": 26.99, "2lb": 44.99, "5lb": 84.99},
    "fairtrade":     {"12oz": 21.99, "1lb": 28.99, "2lb": 48.99, "5lb": 89.99},
    "special":       {"12oz": 22.99, "1lb": 29.99, "2lb": 49.99, "5lb": 89.99},  # whiskey-barrel, cold-brew, MotM
    "sample_pack":   {"ea": 24.99},
    "kcup":          {"12pk": 18.99, "48pk": 54.99},
    "tea":           {"3oz": 14.99},
    "tea_premium":   {"3oz": 19.99},  # Hojicha
    "matcha":        {"1oz": 19.99},
    "instant":       {"3oz": 19.99},
    "functional":    {"8oz": 24.99, "1oz": 24.99, "3oz": 24.99},
}

FULFILLMENT_PER_UNIT = 1.80
MIN_MARGIN_FLOOR = 3.00


def coastal_slug(tcr_name: str, size: str = "") -> str:
    """Coastal SKU slug — kebab-case, prefixed with 'coastal-'."""
    import re
    s = (tcr_name or "").strip().lower()
    s = s.replace("&", "and").replace("/", "-").replace("'", "").replace("+", "plus")
    s = "".join(c if c.isalnum() or c in "- " else "" for c in s)
    s = "-".join(s.split())
    s = re.sub(r"-+", "-", s).strip("-")  # collapse consecutive dashes
    if size:
        s = f"{s}-{size.lower()}"
    return f"coastal-{s}"


def clean_display_name(tcr_name: str) -> str:
    """Tidy a TCR name for customer-facing display."""
    n = (tcr_name or "").strip()
    # "Coffee With Mushrooms - Dark/ground" -> "Coffee With Mushrooms (Dark)"
    n = n.replace(" - ", " — ").replace("/ground", " · Ground").replace("/Ground", " · Ground")
    return n


def coastal_name(tcr_name: str, prefix: str = "Coastal") -> str:
    """Coastal display name — apply branding prefix."""
    n = (tcr_name or "").strip()
    if not n:
        return n
    # Skip if already coastal-branded
    if n.lower().startswith("coastal"):
        return n
    return f"{prefix} {n}"


def render_products_dict(products: list[dict]) -> str:
    """Render Python source for the PRODUCTS dict."""
    lines = ["PRODUCTS: dict[str, dict] = {"]
    current_category = None
    for p in products:
        cat = p["category"]
        if cat != current_category:
            current_category = cat
            cat_label = {
                "coffee": "Coffee blends, single-origin, Fairtrade, decaf",
                "flavored_coffee": "Flavored coffees",
                "specialty_coffee": "Special offerings — whiskey barrel, cold brew, MotM",
                "sample_pack": "Sample packs",
                "kcup": "K-Cup compatible single-use cups",
                "tea": "Loose-leaf teas + Hojicha + Matcha",
                "instant": "Instant coffee",
                "functional": "Functional coffee + tea (mushroom-blended)",
                "subscription": "Monthly subscriptions",
                "bundle": "Curated bundles",
            }.get(cat, cat)
            lines.append(f"    # --- {cat_label} ---")
        slug = p["sku"]
        name = p["name"].replace('"', '\\"')
        flavor = (p.get("flavor_notes") or "").replace('"', '\\"')
        blurb = (p.get("blurb") or "").replace('"', '\\"')
        certs = p.get("certifications") or []
        tags = p.get("tags") or []
        lines.append(f'    "{slug}": {{')
        lines.append(f'        "image": "/products/{slug}.png",')
        lines.append(f'        "name": "{name}",')
        lines.append(f'        "category": "{cat}",')
        lines.append(f'        "size": "{p["size"]}",')
        lines.append(f'        "msrp": {p["msrp"]},')
        lines.append(f'        "wholesale_cost": {p["wholesale_cost"]},')
        lines.append(f'        "fulfillment_cost": {p["fulfillment_cost"]},')
        lines.append(f'        "min_margin_floor": {p["min_margin_floor"]},')
        lines.append(f'        "tags": {tags!r},')
        lines.append(f'        "vendor_source_sku": "{p["vendor_source_sku"]}",')
        if certs:
            lines.append(f'        "certifications": {certs!r},')
        if "roast_level" in p:
            lines.append(f'        "roast_level": "{p["roast_level"]}",')
        if "ingredients" in p:
            lines.append(f'        "ingredients": "{p["ingredients"]}",')
        if "statement_of_identity" in p:
            lines.append(f'        "statement_of_identity": "{p["statement_of_identity"]}",')
        if "origin" in p:
            lines.append(f'        "origin": "{p["origin"]}",')
        if flavor:
            lines.append(f'        "flavor_notes": "{flavor}",')
        if blurb:
            lines.append(f'        "blurb": "{blurb}",')
        lines.append(f'    }},')
    lines.append("}")
    return "\n".join(lines)


def parse_tcr(xlsx_path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb["Sheet1"]
    rows = list(ws.iter_rows(values_only=True))

    products: list[dict] = []
    section = None  # tracks current category section (set by header rows)

    for i, row in enumerate(rows):
        if not row or all(v is None for v in row):
            continue
        col0 = (row[0] or "").strip() if isinstance(row[0], str) else (row[0] or "")

        # Section headers — only when the row has NO SKU in col 1 (real
        # section headers have just a label in col 0; sample-pack rows have
        # both a name in col 0 AND a SKU in col 1, which would falsely
        # trigger section changes for "Single Origin" / "Flavored").
        col1_val = row[1] if len(row) > 1 else None
        is_section_header = isinstance(col0, str) and (col1_val is None or col1_val == "")
        if is_section_header:
            stripped = col0.strip().upper()
            if "COFFEE BLENDS" in stripped:
                section = "blend"; continue
            if stripped == "SPECIAL OFFERINGS":
                section = "special"; continue
            if stripped == "FLAVORED COFFEE":
                section = "flavored"; continue
            if stripped == "SINGLE ORIGIN":
                section = "single_origin"; continue
            if stripped == "SINGLE ORIGIN-FT":
                section = "fairtrade"; continue
            if stripped == "SAMPLE PACKS":
                section = "sample_pack"; continue
            if stripped == "SINGLE USE CUPS":
                section = "kcup"; continue
            if stripped == "TEA":
                section = "tea"; continue
            if stripped == "INSTANT COFFEE":
                section = "instant"; continue
            if stripped == "FUNCTIONAL COFFEE AND TEA":
                section = "functional"; continue

        if section is None:
            continue
        # Skip rows that look like category headers (no SKU + no price)
        tcr_name = col0 if isinstance(col0, str) else ""
        tcr_sku = (row[1] or "").strip() if isinstance(row[1], str) else (row[1] or "")
        if not tcr_sku:
            continue

        roast = (row[2] or "").strip() if isinstance(row[2], str) else ""
        desc = (row[3] or "").strip() if isinstance(row[3], str) else ""
        ingredients = (row[4] or "").strip() if isinstance(row[4], str) else ""
        soi = (row[5] or "").strip() if isinstance(row[5], str) else ""
        # Pricing columns: Dropship column then 12oz / 1lb / 2lb / 5lb
        # Single-use cup section uses 12 Pack / 48 Pack
        # Tea uses 3oz / 1oz columns
        # Layout columns: 6=Dropship, 7=12oz/12pk/3oz/8oz, 8=1lb/48pk/1oz, 9=2lb, 10=5lb, 11=BULK

        # Generate Coastal-branded variants per available size
        if section in ("blend", "single_origin", "fairtrade", "flavored", "special"):
            # Coffee: 12oz, 1lb, 2lb, 5lb
            sizes = [
                ("12oz", 7),
                ("1lb", 8),
                ("2lb", 9),
                ("5lb", 10),
            ]
            # Tier classification for retail
            band_key = section
            if section == "blend":
                # Premium blends (decaf, half-caf) get "premium" band
                if any(k in tcr_name.lower() for k in ("decaf", "half caf")):
                    band_key = "premium"
            if section == "single_origin":
                # Exotic single origins get premium tier
                if any(k in tcr_name.lower() for k in ("bali", "sumatra", "kenya", "papua")):
                    band_key = "single_premium"
            for size, col_idx in sizes:
                if col_idx >= len(row):
                    continue
                wholesale = row[col_idx]
                if not isinstance(wholesale, (int, float)) or wholesale <= 0:
                    continue
                retail = RETAIL_BANDS[band_key].get(size)
                if not retail:
                    continue
                slug = coastal_slug(tcr_name, size)
                cat = "flavored_coffee" if section == "flavored" else (
                    "specialty_coffee" if section == "special" else "coffee"
                )
                tags = ["coffee", section.replace("_", "-")]
                if roast:
                    tags.append(roast.lower().replace(" ", "-").replace("--", "-").strip("-"))
                certs = ["Fairtrade"] if section == "fairtrade" else []
                products.append({
                    "sku": slug,
                    "name": coastal_name(tcr_name) + (f" {size}" if size != "12oz" else ""),
                    "category": cat,
                    "size": size,
                    "msrp": retail,
                    "wholesale_cost": float(wholesale),
                    "fulfillment_cost": FULFILLMENT_PER_UNIT,
                    "min_margin_floor": MIN_MARGIN_FLOOR,
                    "tags": tags,
                    "vendor_source_sku": f"TCR-{tcr_sku}-{size.upper()}",
                    "certifications": certs,
                    "roast_level": roast,
                    "ingredients": ingredients,
                    "statement_of_identity": soi,
                    "blurb": desc[:200] if desc else "",
                })
        elif section == "sample_pack":
            wholesale = row[7]
            if isinstance(wholesale, (int, float)) and wholesale > 0:
                slug = coastal_slug(tcr_name + " sampler")
                products.append({
                    "sku": slug,
                    "name": coastal_name(tcr_name + " Sampler"),
                    "category": "sample_pack",
                    "size": "ea",
                    "msrp": RETAIL_BANDS["sample_pack"]["ea"],
                    "wholesale_cost": float(wholesale),
                    "fulfillment_cost": FULFILLMENT_PER_UNIT,
                    "min_margin_floor": MIN_MARGIN_FLOOR,
                    "tags": ["coffee", "sample-pack"],
                    "vendor_source_sku": f"TCR-{tcr_sku}",
                    "ingredients": ingredients,
                    "statement_of_identity": soi,
                    "blurb": desc[:200] if desc else "",
                })
        elif section == "kcup":
            for size, col_idx, retail_key in [("12pk", 7, "12pk"), ("48pk", 8, "48pk")]:
                if col_idx >= len(row):
                    continue
                wholesale = row[col_idx]
                if not isinstance(wholesale, (int, float)) or wholesale <= 0:
                    continue
                slug = coastal_slug(f"{tcr_name} kcups", size)
                products.append({
                    "sku": slug,
                    "name": f"{coastal_name(tcr_name)} K-Cups ({size})",
                    "category": "kcup",
                    "size": size,
                    "msrp": RETAIL_BANDS["kcup"][retail_key],
                    "wholesale_cost": float(wholesale),
                    "fulfillment_cost": FULFILLMENT_PER_UNIT,
                    "min_margin_floor": MIN_MARGIN_FLOOR,
                    "tags": ["coffee", "k-cup", "single-use"],
                    "vendor_source_sku": f"TCR-{tcr_sku}-{size.upper()}",
                    "roast_level": roast,
                    "ingredients": ingredients,
                    "statement_of_identity": soi,
                    "blurb": desc[:200] if desc else "",
                })
        elif section == "tea":
            wholesale = row[7]
            if not isinstance(wholesale, (int, float)) or wholesale <= 0:
                # Some tea rows put price in 1oz column (col 8) for matcha
                wholesale = row[8] if len(row) > 8 else None
                size = "1oz"
                col_idx = 8
            else:
                size = "3oz"
                col_idx = 7
            if not isinstance(wholesale, (int, float)) or wholesale <= 0:
                continue
            # Matcha gets its own band
            if "matcha" in tcr_name.lower():
                retail = RETAIL_BANDS["matcha"]["1oz"]
                cat_tags = ["tea", "matcha"]
            elif "hojicha" in tcr_name.lower():
                retail = RETAIL_BANDS["tea_premium"]["3oz"]
                cat_tags = ["tea", "hojicha"]
            else:
                retail = RETAIL_BANDS["tea"]["3oz"]
                cat_tags = ["tea", "loose-leaf"]
            slug = coastal_slug(f"lowcountry-tea-{tcr_name}", size)
            products.append({
                "sku": slug,
                "name": f"Lowcountry Tea — {tcr_name}" if "matcha" not in tcr_name.lower() else f"Coastal {tcr_name}",
                "category": "tea",
                "size": size,
                "msrp": retail,
                "wholesale_cost": float(wholesale),
                "fulfillment_cost": FULFILLMENT_PER_UNIT,
                "min_margin_floor": MIN_MARGIN_FLOOR,
                "tags": cat_tags,
                "vendor_source_sku": f"TCR-{tcr_sku}-{size.upper()}",
                "ingredients": ingredients,
                "statement_of_identity": soi,
                "blurb": desc[:200] if desc else "",
            })
        elif section == "instant":
            wholesale = row[7]
            if isinstance(wholesale, (int, float)) and wholesale > 0:
                slug = coastal_slug(tcr_name + " 3oz")
                products.append({
                    "sku": slug,
                    "name": coastal_name(tcr_name),
                    "category": "instant",
                    "size": "3oz",
                    "msrp": RETAIL_BANDS["instant"]["3oz"],
                    "wholesale_cost": float(wholesale),
                    "fulfillment_cost": FULFILLMENT_PER_UNIT,
                    "min_margin_floor": MIN_MARGIN_FLOOR,
                    "tags": ["coffee", "instant"],
                    "vendor_source_sku": f"TCR-{tcr_sku}-3OZ",
                    "roast_level": roast,
                    "ingredients": ingredients,
                    "statement_of_identity": soi,
                    "blurb": desc[:200] if desc else "",
                })
        elif section == "functional":
            # Functional has 8oz / 1oz / 3oz columns at 7/8/9
            for size, col_idx, retail_key in [("8oz", 7, "8oz"), ("1oz", 8, "1oz"), ("3oz", 9, "3oz")]:
                if col_idx >= len(row):
                    continue
                wholesale = row[col_idx]
                if not isinstance(wholesale, (int, float)) or wholesale <= 0:
                    continue
                slug = coastal_slug(f"functional {tcr_name}", size)
                products.append({
                    "sku": slug,
                    "name": coastal_name(tcr_name, prefix="Coastal Functional"),
                    "category": "functional",
                    "size": size,
                    "msrp": RETAIL_BANDS["functional"][retail_key],
                    "wholesale_cost": float(wholesale),
                    "fulfillment_cost": FULFILLMENT_PER_UNIT,
                    "min_margin_floor": MIN_MARGIN_FLOOR,
                    "tags": ["coffee", "functional", "mushroom"],
                    "vendor_source_sku": f"TCR-{tcr_sku}-{size.upper()}",
                    "roast_level": roast,
                    "ingredients": "See product detail page",
                    "statement_of_identity": soi,
                    "blurb": desc[:200] if desc else "",
                })

    # Add subscription + bundle SKUs (Coastal-curated, not from TCR table)
    products.extend([
        {
            "sku": "coastal-coffee-monthly",
            "name": "Coffee Monthly Subscription",
            "category": "subscription",
            "size": "/mo",
            "msrp": 17.99,
            "wholesale_cost": 9.50,
            "fulfillment_cost": FULFILLMENT_PER_UNIT,
            "min_margin_floor": MIN_MARGIN_FLOOR,
            "tags": ["coffee", "subscription", "recurring"],
            "vendor_source_sku": "COASTAL-SUB-COFFEE",
            "blurb": "One bag a month. We rotate origin and roast based on what's running well that week. Pause or cancel anytime.",
        },
        {
            "sku": "coastal-tea-monthly",
            "name": "Tea Monthly Subscription",
            "category": "subscription",
            "size": "/mo",
            "msrp": 13.99,
            "wholesale_cost": 7.00,
            "fulfillment_cost": FULFILLMENT_PER_UNIT,
            "min_margin_floor": MIN_MARGIN_FLOOR,
            "tags": ["tea", "subscription", "recurring"],
            "vendor_source_sku": "COASTAL-SUB-TEA",
            "blurb": "One Lowcountry Tea tin a month. Variety swap on each cycle.",
        },
        {
            "sku": "coastal-combo-monthly",
            "name": "Combo Monthly Subscription",
            "category": "subscription",
            "size": "/mo",
            "msrp": 24.99,
            "wholesale_cost": 13.50,
            "fulfillment_cost": FULFILLMENT_PER_UNIT,
            "min_margin_floor": MIN_MARGIN_FLOOR,
            "tags": ["coffee", "tea", "subscription", "recurring"],
            "vendor_source_sku": "COASTAL-SUB-COMBO",
            "blurb": "One coffee + one tea every month. The household's full Coastal rotation.",
        },
        {
            "sku": "coastal-discovery-bundle",
            "name": "Discovery Bundle",
            "category": "bundle",
            "size": "bundle",
            "msrp": 54.00,
            "wholesale_cost": 28.00,
            "fulfillment_cost": FULFILLMENT_PER_UNIT,
            "min_margin_floor": MIN_MARGIN_FLOOR,
            "tags": ["bundle", "starter", "coffee", "tea", "matcha"],
            "vendor_source_sku": "COASTAL-BUNDLE-DISCOVERY",
            "blurb": "One coffee + one tea + one matcha. The fastest way to see what Coastal is about.",
        },
        {
            "sku": "coastal-pantry-refill",
            "name": "Pantry Refill",
            "category": "bundle",
            "size": "bundle",
            "msrp": 79.00,
            "wholesale_cost": 42.00,
            "fulfillment_cost": FULFILLMENT_PER_UNIT,
            "min_margin_floor": MIN_MARGIN_FLOOR,
            "tags": ["bundle", "household", "coffee", "tea"],
            "vendor_source_sku": "COASTAL-BUNDLE-PANTRY",
            "blurb": "Two coffee + two tea + chai. Stock the cabinet for a household month.",
        },
        {
            "sku": "coastal-gift-bundle",
            "name": "Gift Bundle",
            "category": "bundle",
            "size": "bundle",
            "msrp": 48.00,
            "wholesale_cost": 25.00,
            "fulfillment_cost": FULFILLMENT_PER_UNIT,
            "min_margin_floor": MIN_MARGIN_FLOOR,
            "tags": ["bundle", "gift"],
            "vendor_source_sku": "COASTAL-BUNDLE-GIFT",
            "blurb": "One coffee + one tea + one ceramic Ethiopian-pattern cup, ribbon-tied with twine.",
        },
    ])
    return products


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--xlsx", required=True)
    p.add_argument("--out", required=True)
    args = p.parse_args()

    xlsx = Path(os.path.expanduser(args.xlsx))
    out = Path(os.path.expanduser(args.out))

    products = parse_tcr(xlsx)
    print(f"Parsed {len(products)} products from {xlsx.name}")
    by_cat: dict[str, int] = {}
    for prod in products:
        by_cat[prod["category"]] = by_cat.get(prod["category"], 0) + 1
    for cat, n in sorted(by_cat.items()):
        print(f"  {cat:18} {n}")

    products_block = render_products_dict(products)

    # Read existing catalog.py and replace just the PRODUCTS dict
    src = out.read_text(encoding="utf-8")
    import re
    pattern = re.compile(r"^PRODUCTS:\s*dict\[str,\s*dict\]\s*=\s*\{.*?^\}", re.DOTALL | re.MULTILINE)
    if not pattern.search(src):
        sys.exit(f"Could not find PRODUCTS dict in {out}")
    new_src = pattern.sub(products_block.replace("\\", "\\\\"), src)
    out.write_text(new_src, encoding="utf-8")
    print(f"\nWrote {out}: {len(new_src)} bytes ({len(products)} SKUs in PRODUCTS dict)")


if __name__ == "__main__":
    main()
