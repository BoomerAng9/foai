"""Coastal Brewing product catalog + margin / bundle helpers.

Single source of truth for SKUs, pricing, costs, and margin rules. Used by:
  - /admin/margin                       (owner-only margin scenarios)
  - /chat product-bundle recommender    (Spinner-shaped, customer-facing)
  - future Stripe price-id resolver     (when Stripe products are provisioned)
  - product-page renderers              (when category pages ship)

Costs are approximate v0 estimates. Owner refines with supplier-quoted numbers
once the Temecula due-diligence outreach completes.
"""
from __future__ import annotations

from typing import Optional

# Each product: msrp = public retail; wholesale_cost = what we pay supplier;
# fulfillment_cost = shipping + handling per unit; min_margin_floor = absolute
# floor the runner won't authorize a deal below.
PRODUCTS: dict[str, dict] = {
    # --- Coffee ---
    "lowcountry-house-blend-12oz": {
        "name": "Lowcountry House Blend",
        "category": "coffee",
        "size": "12oz",
        "msrp": 18.00,
        "wholesale_cost": 7.20,
        "fulfillment_cost": 1.80,
        "min_margin_floor": 4.00,
        "tags": ["coffee", "blend", "medium"],
        "blurb": "Smooth medium-roast house blend, sourced through Temecula Coffee Roasters.",
    },
    "lowcountry-dark-roast-12oz": {
        "name": "Lowcountry Dark Roast",
        "category": "coffee",
        "size": "12oz",
        "msrp": 18.00,
        "wholesale_cost": 7.20,
        "fulfillment_cost": 1.80,
        "min_margin_floor": 4.00,
        "tags": ["coffee", "dark"],
        "blurb": "Bold dark roast with caramel finish.",
    },
    "lowcountry-decaf-12oz": {
        "name": "Lowcountry Decaf",
        "category": "coffee",
        "size": "12oz",
        "msrp": 19.00,
        "wholesale_cost": 8.00,
        "fulfillment_cost": 1.80,
        "min_margin_floor": 4.50,
        "tags": ["coffee", "decaf"],
        "blurb": "Swiss-water-process decaf, full body, no compromise.",
    },
    # --- Tea ---
    "lowcountry-breakfast-tea-50ct": {
        "name": "Lowcountry Breakfast Tea",
        "category": "tea",
        "size": "50ct",
        "msrp": 14.00,
        "wholesale_cost": 5.00,
        "fulfillment_cost": 1.20,
        "min_margin_floor": 3.50,
        "tags": ["tea", "black", "breakfast"],
        "blurb": "Strong black breakfast tea, whole-leaf, no dust.",
    },
    "coastal-herbal-tea-50ct": {
        "name": "Coastal Herbal Tea",
        "category": "tea",
        "size": "50ct",
        "msrp": 14.00,
        "wholesale_cost": 5.00,
        "fulfillment_cost": 1.20,
        "min_margin_floor": 3.50,
        "tags": ["tea", "herbal", "caffeine-free"],
        "blurb": "Caffeine-free herbal blend, smooth and mild.",
    },
    "coastal-green-tea-50ct": {
        "name": "Coastal Green Tea",
        "category": "tea",
        "size": "50ct",
        "msrp": 14.00,
        "wholesale_cost": 5.00,
        "fulfillment_cost": 1.20,
        "min_margin_floor": 3.50,
        "tags": ["tea", "green"],
        "blurb": "Light green tea, lightly steamed, classic profile.",
    },
    # --- Matcha ---
    "ceremonial-matcha-30ct": {
        "name": "Ceremonial Matcha",
        "category": "matcha",
        "size": "30g",
        "msrp": 29.00,
        "wholesale_cost": 14.00,
        "fulfillment_cost": 1.20,
        "min_margin_floor": 7.00,
        "tags": ["matcha", "ceremonial"],
        "blurb": "Ceremonial-grade matcha starter pack.",
    },
    # --- Bundles ---
    "coffee-tea-discovery-bundle": {
        "name": "Coffee + Tea Discovery Bundle",
        "category": "bundle",
        "size": "sampler",
        "msrp": 42.00,
        "wholesale_cost": 17.00,
        "fulfillment_cost": 2.00,
        "min_margin_floor": 8.00,
        "tags": ["bundle", "starter"],
        "blurb": "1 coffee, 1 tea, 1 matcha trial. For first-time customers.",
    },
    # --- Subscriptions (recurring) ---
    "coffee-monthly": {
        "name": "Coffee Monthly Subscription",
        "category": "subscription",
        "size": "monthly",
        "msrp": 17.00,
        "wholesale_cost": 7.20,
        "fulfillment_cost": 1.80,
        "min_margin_floor": 3.00,
        "recurring": True,
        "tags": ["subscription", "coffee"],
        "blurb": "One 12oz coffee bag every month. Cancel anytime.",
    },
    "tea-monthly": {
        "name": "Tea Monthly Subscription",
        "category": "subscription",
        "size": "monthly",
        "msrp": 13.00,
        "wholesale_cost": 5.00,
        "fulfillment_cost": 1.20,
        "min_margin_floor": 2.50,
        "recurring": True,
        "tags": ["subscription", "tea"],
        "blurb": "One tea selection every month. Cancel anytime.",
    },
    "combo-monthly": {
        "name": "Coffee + Tea Monthly Subscription",
        "category": "subscription",
        "size": "monthly",
        "msrp": 28.00,
        "wholesale_cost": 12.20,
        "fulfillment_cost": 2.00,
        "min_margin_floor": 5.00,
        "recurring": True,
        "tags": ["subscription", "combo"],
        "blurb": "Coffee + tea every month. Best value for daily drinkers.",
    },
}


def get_product(product_id: str) -> Optional[dict]:
    return PRODUCTS.get(product_id)


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
            picks.append("coffee-monthly")
            rationale.append("Monthly coffee subscription for the daily ritual.")
        if cat in ("tea", "mixed"):
            picks.append("tea-monthly")
            rationale.append("Monthly tea selection rotation.")
        if cat == "mixed":
            picks = ["combo-monthly"]
            rationale = ["Combo subscription: coffee + tea, one cancellation."]
    elif size == "pantry":
        if cat in ("coffee", "mixed"):
            if caffeine == "off":
                picks.append("lowcountry-decaf-12oz")
                rationale.append("Decaf for the all-day pour without the buzz.")
            elif roast == "dark":
                picks.append("lowcountry-dark-roast-12oz")
                rationale.append("Dark roast for bold mornings.")
            else:
                picks.append("lowcountry-house-blend-12oz")
                rationale.append("House blend as the everyday default.")
        if cat in ("tea", "mixed"):
            picks.append("lowcountry-breakfast-tea-50ct")
            rationale.append("Breakfast black tea — strong, whole-leaf.")
        if cat == "matcha":
            picks.append("ceremonial-matcha-30ct")
            rationale.append("Ceremonial matcha for the slow morning.")
    else:  # starter
        picks.append("coffee-tea-discovery-bundle")
        rationale.append("Discovery bundle: 1 coffee, 1 tea, 1 matcha trial. Best for first-timers.")

    products = [{**PRODUCTS[pid], "id": pid} for pid in picks if pid in PRODUCTS]
    customer_total = round(sum(p["msrp"] for p in products), 2)
    return {
        "preferences": preferences,
        "picks": [{"id": p["id"], "name": p["name"], "size": p["size"], "msrp": p["msrp"], "blurb": p["blurb"]} for p in products],
        "rationale": rationale,
        "customer_total": customer_total,
    }
