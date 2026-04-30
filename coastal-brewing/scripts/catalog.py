"""Coastal Brewing product catalog + margin / bundle helpers.

Single source of truth for SKUs, pricing, costs, and margin rules. Used by:
  - /admin/margin                       (owner-only margin scenarios)
  - /chat product-bundle recommender    (Spinner-shaped, customer-facing)
  - future Stripe price-id resolver     (when Stripe products are provisioned)
  - product-page renderers              (when category pages ship)

PRICING POSTURE (owner directive 2026-04-29):
  Coastal MSRPs are DEFERRED — the msrp values below are placeholders set to
  vendor retail (Temecula collection-page price for FT coffees = $19.49) so
  calc_line / calc_bundle / recommend_bundle continue to function in dev.
  Final Coastal MSRP commits when owner reviews competitor reference price
  bands documented in `coastal-brewing/docs/catalog/coastal-product-list-proposal.md`.

NAMING CANON (owner directive 2026-04-29):
  Locked from `~/iCloudPhotos/Photos/Coffee Shop Sal_Ang.png` packaging.
  - Flagship coffee = "Coastal Blend" (whole bean, jasmine / key lime / cocoa
    flavor-notes copy is brand voice — does NOT have to literally match the
    actual Temecula Colombia tasting notes per the image-accuracy directive)
  - Tea umbrella = "Lowcountry Tea — [Variant]" on cream cylindrical tins
  - Matcha = "Coastal Brewing Co Matcha — Ceremonial Grade" on cream tin
  - Chai = "Coastal Chai — Spiced Black Tea" on a DARKER cylindrical tin

VENDOR SOURCING:
  - Coastal Blend = `TCR-FT-COLOMBIA-12OZ` Temecula private-label rebrand
    (per `temecula-custom-blend.md`: zero MOQ, same-day shipping, custom
    recipes are not self-serve so we rebrand existing FT Colombia)
  - 5 single-origin Fairtrade coffees (Colombia, Guatemala, Peru, Peru Decaf,
    Honduras, Sumatra) — direct-rebrand of Temecula FT collection
  - 4 Lowcountry Tea variants — Temecula tea-dropship with ingredient-level
    organic; Jasmine Green sources from Rishi Tea (Temecula's Jasmine doesn't
    qualify) — wholesale loose-leaf $60/lb
  - Coastal Chai — Temecula's masala chai with stronger-spice positioning
  - Coastal Matcha — Mizuba Yorokobi Uji ceremonial (JAS Organic single-estate)
"""
from __future__ import annotations

from typing import Optional

# Each product: msrp = public retail; wholesale_cost = what we pay supplier;
# fulfillment_cost = shipping + handling per unit; min_margin_floor = absolute
# floor the runner won't authorize a deal below.
PRODUCTS: dict[str, dict] = {
    # --- Coffee — Fairtrade single-origin (6) + Coastal Blend flagship (1) ---
    "coastal-blend-12oz": {
        "image": "/products/coastal-blend-12oz.png",
        "name": "Coastal Blend",
        "category": "coffee",
        "size": "12oz",
        "msrp": 19.49,  # placeholder = Temecula FT collection retail
        "wholesale_cost": 9.75,
        "fulfillment_cost": 1.80,
        "min_margin_floor": 4.00,
        "tags": ["coffee", "blend", "medium", "flagship", "fairtrade"],
        "vendor_source_sku": "TCR-FT-COLOMBIA-12OZ",
        "certifications": ["Fairtrade"],
        "flavor_notes": "Jasmine, key lime, cocoa.",
        "blurb": "Coastal Blend — whole-bean Lowcountry coffee with notes of jasmine, key lime, and cocoa. Every cup is what the label says it is.",
    },
    "coastal-colombia-fairtrade-12oz": {
        "image": "/products/coastal-colombia-fairtrade-12oz.png",
        "name": "Coastal Colombia Fairtrade",
        "category": "coffee",
        "size": "12oz",
        "msrp": 19.49,
        "wholesale_cost": 9.75,
        "fulfillment_cost": 1.80,
        "min_margin_floor": 4.00,
        "tags": ["coffee", "single-origin", "medium", "fairtrade"],
        "vendor_source_sku": "TCR-FT-COLOMBIA-12OZ",
        "certifications": ["Fairtrade"],
        "origin": "Tolima, Colombia",
        "flavor_notes": "Caramel sweetness, citrus brightness, milk chocolate finish.",
        "blurb": "Bright Colombian Fairtrade — caramel and citrus, sourced through verified Tolima cooperatives.",
    },
    "coastal-guatemala-fairtrade-12oz": {
        "image": "/products/coastal-guatemala-fairtrade-12oz.png",
        "name": "Coastal Guatemala Fairtrade",
        "category": "coffee",
        "size": "12oz",
        "msrp": 19.49,
        "wholesale_cost": 9.75,
        "fulfillment_cost": 1.80,
        "min_margin_floor": 4.00,
        "tags": ["coffee", "single-origin", "medium", "fairtrade"],
        "vendor_source_sku": "TCR-FT-GUATEMALA-12OZ",
        "certifications": ["Fairtrade"],
        "origin": "San Marcos, Guatemala",
        "flavor_notes": "Clean cup, milk chocolate, soft fruit, balanced acidity.",
        "blurb": "A clean, honest Guatemalan medium — milk chocolate and soft fruit, the kind of cup that doesn't ask for attention but rewards it.",
    },
    "coastal-peru-fairtrade-12oz": {
        "image": "/products/coastal-peru-fairtrade-12oz.png",
        "name": "Coastal Peru Fairtrade — Clean Coffee Project",
        "category": "coffee",
        "size": "12oz",
        "msrp": 19.49,
        "wholesale_cost": 9.75,
        "fulfillment_cost": 1.80,
        "min_margin_floor": 4.00,
        "tags": ["coffee", "single-origin", "medium", "fairtrade", "clean-coffee-project", "flagship"],
        "vendor_source_sku": "TCR-FT-PERU-12OZ",
        "certifications": ["Fairtrade", "Eurofins lab-tested (glyphosate-free, heavy-metals clean, mycotoxin clean)"],
        "origin": "Amazonas, Peru (1600-1800m)",
        "flavor_notes": "Lemon, herbal, milk chocolate, medium acidity, smooth body.",
        "blurb": "Lab-clean Peru. Glyphosate-free, heavy-metal-tested, mycotoxin-tested — the literal proof of every-cup-is-what-the-label-says-it-is. Lemon and herbal lift over a smooth chocolate body.",
    },
    "coastal-peru-decaf-fairtrade-12oz": {
        "image": "/products/coastal-peru-decaf-fairtrade-12oz.png",
        "name": "Coastal Peru Decaf — Swiss Water Process",
        "category": "coffee",
        "size": "12oz",
        "msrp": 19.49,
        "wholesale_cost": 9.75,
        "fulfillment_cost": 1.80,
        "min_margin_floor": 4.00,
        "tags": ["coffee", "single-origin", "decaf", "fairtrade", "swiss-water"],
        "vendor_source_sku": "TCR-FT-PERU-DECAF-12OZ",
        "certifications": ["Fairtrade", "Swiss Water Process"],
        "origin": "Amazonas, Peru",
        "flavor_notes": "Smooth body, mild chocolate, low acidity.",
        "blurb": "Decaf without the chemicals. Swiss Water Process, Fairtrade Peru — the cup you can drink at 4pm without thinking twice.",
    },
    "coastal-honduras-fairtrade-12oz": {
        "image": "/products/coastal-honduras-fairtrade-12oz.png",
        "name": "Coastal Honduras Fairtrade",
        "category": "coffee",
        "size": "12oz",
        "msrp": 19.49,
        "wholesale_cost": 9.75,
        "fulfillment_cost": 1.80,
        "min_margin_floor": 4.00,
        "tags": ["coffee", "single-origin", "medium-dark", "fairtrade"],
        "vendor_source_sku": "TCR-FT-HONDURAS-12OZ",
        "certifications": ["Fairtrade"],
        "origin": "Copán, Honduras",
        "flavor_notes": "Cocoa, brown sugar, walnut, smooth body.",
        "blurb": "Cocoa and brown sugar from the Copán hills. The dark-roast complement to the Sumatra — a porch cup with patience.",
    },
    "coastal-sumatra-fairtrade-12oz": {
        "image": "/products/coastal-sumatra-fairtrade-12oz.png",
        "name": "Coastal Sumatra Fairtrade",
        "category": "coffee",
        "size": "12oz",
        "msrp": 19.49,  # collection page; detail page shows $24.49 — flagged for owner verification
        "wholesale_cost": 9.75,
        "fulfillment_cost": 1.80,
        "min_margin_floor": 4.00,
        "tags": ["coffee", "single-origin", "medium-dark", "fairtrade", "anchor"],
        "vendor_source_sku": "TCR-FT-SUMATRA-12OZ",
        "certifications": ["Fairtrade"],  # organic in-progress per Temecula CS
        "origin": "Aceh / Takengon, Indonesia",
        "flavor_notes": "Dark chocolate, dried fruit, earthy, syrupy body, lingering finish.",
        "blurb": "The slow-roast porch cup. Dark chocolate, dried fruit, syrupy body — the Sumatra that earns its place on the shelf.",
    },
    # --- Lowcountry Tea umbrella — cream cylindrical tin (5 variants) ---
    "lowcountry-tea-jasmine-green-2oz": {
        "image": "/products/lowcountry-tea-jasmine-green-2oz.png",
        "name": "Lowcountry Tea — Jasmine Green",
        "category": "tea",
        "size": "2oz",
        "msrp": 19.99,  # placeholder = vendor retail equivalent
        "wholesale_cost": 7.50,  # Rishi loose-leaf wholesale ~$60/lb scaled to 2oz
        "fulfillment_cost": 1.20,
        "min_margin_floor": 3.50,
        "tags": ["tea", "green", "jasmine", "loose-leaf", "lowcountry-tea-umbrella"],
        "vendor_source_sku": "SECONDARY-RISHI-LOOSE-LEAF-LB",
        "certifications": ["Organic", "Direct Trade"],
        "blurb": "Jasmine green, hand-paired with cut jasmine flowers. Tea that smells like the porch in May.",
    },
    "lowcountry-tea-english-breakfast-2oz": {
        "image": "/products/lowcountry-tea-english-breakfast-2oz.png",
        "name": "Lowcountry Tea — English Breakfast",
        "category": "tea",
        "size": "2oz",
        "msrp": 19.99,
        "wholesale_cost": 7.50,
        "fulfillment_cost": 1.20,
        "min_margin_floor": 3.50,
        "tags": ["tea", "black", "breakfast", "lowcountry-tea-umbrella"],
        "vendor_source_sku": "TCR-TEA-ENGLISHBREAKFAST-3OZ",
        "certifications": ["Organic (ingredient-level)"],
        "flavor_notes": "Assam TGFOP + Ceylon OP + 2nd Flush Darjeeling.",
        "blurb": "Whole-leaf English Breakfast — Assam, Ceylon, Darjeeling. Strong, complete, no shortcut.",
    },
    "lowcountry-tea-moroccan-mint-2oz": {
        "image": "/products/lowcountry-tea-moroccan-mint-2oz.png",
        "name": "Lowcountry Tea — Moroccan Mint",
        "category": "tea",
        "size": "2oz",
        "msrp": 19.99,
        "wholesale_cost": 7.50,
        "fulfillment_cost": 1.20,
        "min_margin_floor": 3.50,
        "tags": ["tea", "green", "mint", "lowcountry-tea-umbrella"],
        "vendor_source_sku": "TCR-TEA-MOROCCANMINT-3OZ",
        "certifications": ["Organic (ingredient-level)"],
        "flavor_notes": "Gunpowder green + spearmint + peppermint.",
        "blurb": "Green tea + mint, the way it's done from Marrakech to Charleston. Whole-leaf, organic, ready for sweet tea or hot pour.",
    },
    "lowcountry-tea-hibiscus-berry-2oz": {
        "image": "/products/lowcountry-tea-hibiscus-berry-2oz.png",
        "name": "Lowcountry Tea — Hibiscus Berry",
        "category": "tea",
        "size": "2oz",
        "msrp": 19.99,
        "wholesale_cost": 7.50,
        "fulfillment_cost": 1.20,
        "min_margin_floor": 3.50,
        "tags": ["tea", "herbal", "caffeine-free", "lowcountry-tea-umbrella"],
        "vendor_source_sku": "TCR-TEA-HIBISCUSBERRYROOIBOS-3OZ",
        "certifications": ["Organic (7-ingredient organic-level)"],
        "flavor_notes": "Hibiscus, rosehips, orange peel, rooibos, blueberry, passionfruit, mango.",
        "blurb": "Caffeine-free hibiscus and rooibos with seven organic ingredients on the label. The afternoon cup that doesn't keep you up.",
    },
    "lowcountry-tea-masala-2oz": {
        "image": "/products/lowcountry-tea-masala-2oz.png",
        "name": "Lowcountry Tea — Masala",
        "category": "tea",
        "size": "2oz",
        "msrp": 19.99,
        "wholesale_cost": 7.50,
        "fulfillment_cost": 1.20,
        "min_margin_floor": 3.50,
        "tags": ["tea", "masala", "lowcountry-tea-umbrella"],
        "vendor_source_sku": "TCR-TEA-MASALACHAI-3OZ",
        "certifications": ["Organic (ingredient-level)"],
        "flavor_notes": "Assam black + cardamom + clove + ginger + cinnamon + star anise + black pepper.",
        "blurb": "Whole-spice masala — gentler register than Coastal Chai. Daily cup, organic ingredients.",
    },
    # --- Coastal Chai — separate dark cylindrical tin (1) ---
    "coastal-chai-2_1oz": {
        "image": "/products/coastal-chai-2_1oz.png",
        "name": "Coastal Chai",
        "category": "tea",
        "size": "2.1oz",
        "msrp": 19.99,
        "wholesale_cost": 7.50,
        "fulfillment_cost": 1.20,
        "min_margin_floor": 3.50,
        "tags": ["tea", "chai", "spiced-black", "darker-tin"],
        "vendor_source_sku": "TCR-TEA-MASALACHAI-3OZ",
        "certifications": ["Organic (ingredient-level)"],
        "flavor_notes": "Assam black, cardamom, clove, ginger, cinnamon, black pepper, star anise.",
        "blurb": "Coastal Chai — Spiced Black Tea. The cup that warms the porch in February.",
    },
    # --- Matcha — Mizuba Yorokobi (1) ---
    # Note: vendor pack is 30g; canonical tin label reads 2oz/56g.
    # Per owner directive 2026-04-29 image-accuracy rule, the brand visual
    # does NOT have to match the literal SKU spec. Ships 30g.
    "coastal-matcha-ceremonial-30g": {
        "image": "/products/coastal-matcha-ceremonial-30g.png",
        "name": "Coastal Brewing Co Matcha — Ceremonial Grade",
        "category": "matcha",
        "size": "30g",
        "msrp": 40.00,  # Mizuba retail
        "wholesale_cost": 20.00,  # ~50% wholesale estimate
        "fulfillment_cost": 1.20,
        "min_margin_floor": 8.00,
        "tags": ["matcha", "ceremonial", "single-estate"],
        "vendor_source_sku": "SECONDARY-MIZUBA-YOROKOBI-30G",
        "certifications": ["JAS Organic", "Single-Estate"],
        "origin": "Uji, Kyoto",
        "flavor_notes": "Vibrant emerald, deep umami, no bitterness.",
        "blurb": "Ceremonial matcha from a single Uji estate. Stone-milled, vibrant, no bitter. Whisked the way it should be.",
    },
    # --- Subscriptions (3 — recurring) ---
    "coastal-coffee-monthly": {
        "image": "/products/coastal-coffee-monthly.png",
        "name": "Coffee Monthly Subscription",
        "category": "subscription",
        "size": "monthly",
        "msrp": 18.00,
        "wholesale_cost": 9.75,
        "fulfillment_cost": 1.80,
        "min_margin_floor": 3.00,
        "recurring": True,
        "tags": ["subscription", "coffee"],
        "blurb": "One whole-bean coffee a month. Pick yours, or let us rotate.",
    },
    "coastal-tea-monthly": {
        "image": "/products/coastal-tea-monthly.png",
        "name": "Tea Monthly Subscription",
        "category": "subscription",
        "size": "monthly",
        "msrp": 18.00,
        "wholesale_cost": 7.50,
        "fulfillment_cost": 1.20,
        "min_margin_floor": 2.50,
        "recurring": True,
        "tags": ["subscription", "tea"],
        "blurb": "One Lowcountry Tea a month. From English Breakfast to Jasmine Green.",
    },
    "coastal-combo-monthly": {
        "image": "/products/coastal-combo-monthly.png",
        "name": "Coffee + Tea Monthly Subscription",
        "category": "subscription",
        "size": "monthly",
        "msrp": 32.00,
        "wholesale_cost": 17.25,
        "fulfillment_cost": 2.00,
        "min_margin_floor": 5.00,
        "recurring": True,
        "tags": ["subscription", "combo"],
        "blurb": "Coffee and tea, monthly. One subscription, one cancellation.",
    },
    # --- Bundles (3) ---
    "coastal-discovery-bundle": {
        "image": "/products/coastal-discovery-bundle.png",
        "name": "Coastal Discovery Bundle",
        "category": "bundle",
        "size": "sampler",
        "msrp": 50.00,
        "wholesale_cost": 22.00,
        "fulfillment_cost": 2.00,
        "min_margin_floor": 8.00,
        "tags": ["bundle", "starter"],
        "blurb": "The starter trio. Coffee, tea, matcha — three sips of the line in one box.",
    },
    "coastal-pantry-refill": {
        "image": "/products/coastal-pantry-refill.png",
        "name": "Coastal Pantry Refill",
        "category": "bundle",
        "size": "pantry",
        "msrp": 78.00,
        "wholesale_cost": 38.00,
        "fulfillment_cost": 3.00,
        "min_margin_floor": 12.00,
        "tags": ["bundle", "pantry"],
        "blurb": "The pantry box. Two coffees, two teas, one chai — the month's run in one ship.",
    },
    "coastal-gift-bundle": {
        "image": "/products/coastal-gift-bundle.png",
        "name": "Coastal Gift Bundle",
        "category": "bundle",
        "size": "gift",
        "msrp": 55.00,
        "wholesale_cost": 24.00,
        "fulfillment_cost": 2.50,
        "min_margin_floor": 9.00,
        "tags": ["bundle", "gift"],
        "blurb": "A gift the recipient will actually use. Coffee, tea, and a cup made for them.",
    },
}

# --- Backwards-compat aliases (retired SKU IDs → new IDs) ---
# These let any caller still using the old IDs (legacy stepper workflows,
# audit-ledger entries, examples) resolve to the renamed product.
SKU_ALIASES: dict[str, str] = {
    "lowcountry-house-blend-12oz": "coastal-blend-12oz",
    "lowcountry-dark-roast-12oz": "coastal-honduras-fairtrade-12oz",
    "lowcountry-decaf-12oz": "coastal-peru-decaf-fairtrade-12oz",
    "lowcountry-breakfast-tea-50ct": "lowcountry-tea-english-breakfast-2oz",
    "coastal-herbal-tea-50ct": "lowcountry-tea-hibiscus-berry-2oz",
    "coastal-green-tea-50ct": "lowcountry-tea-moroccan-mint-2oz",
    "ceremonial-matcha-30ct": "coastal-matcha-ceremonial-30g",
    "coffee-tea-discovery-bundle": "coastal-discovery-bundle",
    "coffee-monthly": "coastal-coffee-monthly",
    "tea-monthly": "coastal-tea-monthly",
    "combo-monthly": "coastal-combo-monthly",
}


def resolve_sku(product_id: str) -> str:
    """Resolve legacy SKU IDs to current IDs. Returns input unchanged if not aliased."""
    return SKU_ALIASES.get(product_id, product_id)


def get_product(product_id: str) -> Optional[dict]:
    return PRODUCTS.get(resolve_sku(product_id))


def list_products(category: Optional[str] = None) -> list[dict]:
    items = []
    for pid, p in PRODUCTS.items():
        if category and p.get("category") != category:
            continue
        items.append({**p, "id": pid})
    return items


def calc_line(product_id: str, qty: int, discount_pct: float = 0.0) -> dict:
    """Compute one-line margin for a product+quantity at a given discount.

    Returns a dict with the breakdown. Owner-internal — never exposed to customer.
    """
    p = get_product(product_id)
    if not p:
        return {"error": "product_not_found", "product_id": product_id}
    qty = max(1, int(qty))
    discount_pct = max(0.0, min(50.0, float(discount_pct)))  # cap at 50% off
    unit_price = round(p["msrp"] * (1.0 - discount_pct / 100.0), 2)
    unit_cost = round(p["wholesale_cost"] + p["fulfillment_cost"], 2)
    unit_margin = round(unit_price - unit_cost, 2)
    line_revenue = round(unit_price * qty, 2)
    line_cost = round(unit_cost * qty, 2)
    line_margin = round(unit_margin * qty, 2)
    margin_pct = round((unit_margin / unit_price) * 100, 1) if unit_price > 0 else 0.0
    below_floor = unit_margin < p["min_margin_floor"]
    return {
        "product_id": product_id,
        "name": p["name"],
        "qty": qty,
        "discount_pct": discount_pct,
        "msrp_unit": p["msrp"],
        "unit_price": unit_price,
        "unit_cost": unit_cost,
        "unit_margin": unit_margin,
        "min_margin_floor": p["min_margin_floor"],
        "below_floor": below_floor,
        "line_revenue": line_revenue,
        "line_cost": line_cost,
        "line_margin": line_margin,
        "margin_pct": margin_pct,
    }


def calc_bundle(items: list[dict], deal_discount_pct: float = 0.0) -> dict:
    """items = [{product_id, qty, discount_pct?}, ...]
    deal_discount_pct = additional bulk-deal discount applied on top of per-line discount.
    """
    lines = []
    total_revenue = 0.0
    total_cost = 0.0
    total_margin = 0.0
    total_msrp = 0.0
    any_below_floor = False
    for entry in items:
        line = calc_line(
            entry.get("product_id", ""),
            entry.get("qty", 1),
            entry.get("discount_pct", 0.0),
        )
        if "error" in line:
            return line
        # Apply deal discount on top
        if deal_discount_pct > 0:
            extra = line["line_revenue"] * (deal_discount_pct / 100.0)
            line["line_revenue"] = round(line["line_revenue"] - extra, 2)
            line["line_margin"] = round(line["line_revenue"] - line["line_cost"], 2)
            line["unit_price"] = round(line["line_revenue"] / line["qty"], 2) if line["qty"] else 0.0
            line["unit_margin"] = round(line["unit_price"] - line["unit_cost"], 2)
            line["margin_pct"] = round((line["unit_margin"] / line["unit_price"]) * 100, 1) if line["unit_price"] > 0 else 0.0
            line["below_floor"] = line["unit_margin"] < PRODUCTS[line["product_id"]]["min_margin_floor"]
        lines.append(line)
        total_revenue += line["line_revenue"]
        total_cost += line["line_cost"]
        total_margin += line["line_margin"]
        total_msrp += line["msrp_unit"] * line["qty"]
        any_below_floor = any_below_floor or line["below_floor"]
    return {
        "lines": lines,
        "deal_discount_pct": deal_discount_pct,
        "total_msrp": round(total_msrp, 2),
        "total_revenue": round(total_revenue, 2),
        "total_cost": round(total_cost, 2),
        "total_margin": round(total_margin, 2),
        "total_margin_pct": round((total_margin / total_revenue) * 100, 1) if total_revenue > 0 else 0.0,
        "any_below_floor": any_below_floor,
        "verdict": "below_floor_warning" if any_below_floor else "within_margin_floor",
    }


def suggest_max_deal_discount(items: list[dict]) -> dict:
    """Find the highest deal_discount_pct that still keeps every line above floor."""
    for d in (40, 35, 30, 25, 20, 15, 10, 5, 0):
        result = calc_bundle(items, deal_discount_pct=float(d))
        if not result.get("any_below_floor"):
            return {"max_discount_pct": d, "calc": result}
    return {"max_discount_pct": 0, "calc": calc_bundle(items, deal_discount_pct=0.0)}


def recommend_bundle(preferences: dict) -> dict:
    """Customer-facing bundle suggestion. Returns ids only — no margin info exposed.

    preferences = {category: 'coffee'|'tea'|'matcha'|'mixed', caffeine: 'on'|'off'|'either',
                   roast: 'medium'|'dark'|'either', size: 'starter'|'monthly'|'pantry'}
    """
    cat = preferences.get("category", "mixed")
    caffeine = preferences.get("caffeine", "either")
    roast = preferences.get("roast", "either")
    size = preferences.get("size", "starter")

    picks: list[str] = []
    rationale: list[str] = []

    if size == "monthly":
        if cat in ("coffee", "mixed") and caffeine != "off":
            picks.append("coastal-coffee-monthly")
            rationale.append("Monthly coffee subscription for the daily ritual.")
        if cat in ("tea", "mixed"):
            picks.append("coastal-tea-monthly")
            rationale.append("Monthly Lowcountry Tea rotation.")
        if cat == "mixed":
            picks = ["coastal-combo-monthly"]
            rationale = ["Combo subscription: coffee + tea, one cancellation."]
    elif size == "pantry":
        if cat in ("coffee", "mixed"):
            if caffeine == "off":
                picks.append("coastal-peru-decaf-fairtrade-12oz")
                rationale.append("Swiss Water Process decaf for the all-day pour without the buzz.")
            elif roast == "dark":
                picks.append("coastal-honduras-fairtrade-12oz")
                rationale.append("Honduras dark — cocoa and brown sugar from the Copán hills.")
            else:
                picks.append("coastal-blend-12oz")
                rationale.append("Coastal Blend as the everyday default — jasmine, key lime, cocoa.")
        if cat in ("tea", "mixed"):
            picks.append("lowcountry-tea-english-breakfast-2oz")
            rationale.append("Lowcountry English Breakfast — Assam, Ceylon, Darjeeling, whole-leaf.")
        if cat == "matcha":
            picks.append("coastal-matcha-ceremonial-30g")
            rationale.append("Single-estate Uji ceremonial matcha for the slow morning.")
    else:  # starter
        picks.append("coastal-discovery-bundle")
        rationale.append("Coastal Discovery Bundle — coffee, tea, matcha trio. Best for first-timers.")

    products = [{**PRODUCTS[pid], "id": pid} for pid in picks if pid in PRODUCTS]
    customer_total = round(sum(p["msrp"] for p in products), 2)
    return {
        "preferences": preferences,
        "picks": [{"id": p["id"], "name": p["name"], "size": p["size"], "msrp": p["msrp"], "blurb": p["blurb"]} for p in products],
        "rationale": rationale,
        "customer_total": customer_total,
    }
