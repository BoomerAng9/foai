#!/usr/bin/env python3
"""Generate Coastal Brewing Co. product hero shots via Kie.ai gpt-image-2.

Sibling to `generate_character_portraits.py` — same Kie.ai
gpt-image-2-image-to-image endpoint, same Sal_Ang reference URL as the
brand-register anchor, same async poll loop. Targets product packaging
instead of characters: cream paper coffee bags with stork glyph,
cream cylindrical tea/matcha tins with brown band, darker tin for
Coastal Chai, multi-product layouts for bundles + subscriptions.

Per `feedback_coastal_locked_skus_and_image_accuracy_2026_04_29.md`:
brand visuals do NOT have to literally match shipped SKU spec — the
literal SKU lives in `coastal-brewing/scripts/catalog.py`; the brand
visual lives here. Cert claims printed on REAL packaging must be
literally true; that rule applies to physical product packaging, not
to these design-level brand visuals.

Usage:
    KIE_AI_API_KEY=$(ssh myclaw-vps 'docker exec openclaw-sop5-openclaw-1 env' | grep -i KIE_AI_API_KEY | cut -d= -f2-) \\
    python aims-tools/voice-library/scripts/generate_product_hero_shots.py
    # Single SKU:
    python aims-tools/voice-library/scripts/generate_product_hero_shots.py --only=coastal-blend-12oz
    # One category:
    python aims-tools/voice-library/scripts/generate_product_hero_shots.py --category=coffee
    # Roster:
    python aims-tools/voice-library/scripts/generate_product_hero_shots.py --list

Cost: ~$0.05/image at 2K resolution.
Time: ~3 min/render. 20 SKUs ≈ 60 min wall-clock.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests

# ─── Config ────────────────────────────────────────────────────────────────

KIE_AI_API_KEY = os.environ.get("KIE_AI_API_KEY") or os.environ.get("Kie_Ai_Api_Key")
KIE_CREATE_TASK_ENDPOINT = "https://api.kie.ai/api/v1/jobs/createTask"
KIE_RECORD_INFO_ENDPOINT = "https://api.kie.ai/api/v1/jobs/recordInfo"
KIE_GPT_IMAGE_2_MODEL = "gpt-image-2-image-to-image"

# Public Sal_Ang reference. Same anchor as the cast generator — Sal's
# canonical scene establishes the brand register (cream/parchment palette,
# warm wood + copper, marsh-and-palm backdrop, golden-hour light) that
# every product hero shot inherits.
SAL_REFERENCE_URL = (
    "https://raw.githubusercontent.com/BoomerAng9/foai/main/"
    "chicken-hawk/hawk-ui/public/chicken-hawk/coffee-shop-sal-ang.png"
)

HOME = Path.home()
OUTPUT_DIR = (
    HOME
    / "iCloudDrive"
    / "ACHIEVEMOR_"
    / "Projects_"
    / "The Deploy Platform_"
    / "Claude Code"
    / "product-shots"
)


# ─── Brand-register base (shared across every shot) ────────────────────────

BRAND_REGISTER = (
    "Setting: Coastal Brewing Co. wooden counter at a coastal South "
    "Carolina Lowcountry pop-up coffee bar. Cream / parchment palette + "
    "sepia ink + warm wood + copper accents. Soft warm golden-hour light. "
    "Background partially shows the canonical counter dressing: a wooden "
    "vertical sign reading 'COFFEE. TEA. MATCHA. PURPOSE.', a banner "
    "above reading 'COASTAL BREWING CO — Nothing chemically, ever.' "
    "with a hand-drawn line-art stork glyph, a long-spouted copper "
    "Ethiopian coffee pot, small ceramic Ethiopian-pattern coffee cups "
    "on a wooden tray, palm fronds and marsh visible in the distance. "
    "Cinematic product photography, NOT a stock photo, NOT a flat-lay. "
    "Same brand register as the canonical Sal_Ang reference image."
)

# Coffee bag canon (per design.md §11.1):
COFFEE_BAG_CANON = (
    "Cream / parchment kraft paper coffee bag, square gusseted form, tin-tie "
    "top, hand-drawn line-art stork glyph centered above stacked sepia-stamp "
    "wordmark 'COASTAL BREWING CO'. Below the wordmark, the product name in "
    "a smaller stamped serif. Below that, a single line of flavor notes in "
    "tracked-out small caps. Below that, '12oz (340g)' in mono. Photographed "
    "on a wooden counter with a few coffee beans scattered in foreground. "
    "Soft directional warm light from upper-left. NO modern logos, NO "
    "barcodes, NO plastic windows."
)

# Cream cylindrical tea/matcha tin canon:
CREAM_TIN_CANON = (
    "Cream-colored cylindrical metal tin with a brown band running "
    "horizontally across the middle. Stork glyph + stacked sepia-stamp "
    "'COASTAL BREWING CO' on the upper portion above the brown band. "
    "Below the brown band: the variant name in tracked-out small caps "
    "(e.g., 'JASMINE GREEN', 'ENGLISH BREAKFAST'), then a flavor descriptor "
    "line, then 'NET WT. 2OZ (56G)' in mono. Photographed on a wooden "
    "counter, soft directional warm light, slight depth of field."
)

# Darker tin canon (for Coastal Chai — distinct from the cream tea tins):
DARK_TIN_CANON = (
    "DARKER cylindrical metal tin — charcoal / dark-brown matte body — "
    "with a small cream label centered on the front showing the stork glyph + "
    "'COASTAL' wordmark, then 'CHAI / SPICED BLACK TEA' in tracked-out small "
    "caps, then 'NET WT. 2.1OZ (56G)' in mono. Photographed on a wooden "
    "counter, warm directional light. The tin is visually distinct from the "
    "cream Lowcountry Tea tins — it stands apart on the shelf."
)


# ─── Per-SKU spec ──────────────────────────────────────────────────────────

PRODUCTS_FOR_IMAGE_GEN: list[dict] = [
    # ─── Coffee (7) — cream paper bag with stork ───────────────────────────
    {
        "sku": "coastal-blend-12oz",
        "category": "coffee",
        "product_label": (
            "COFFEE BAG: Centered prominently. Bag reads 'COASTAL BREWING CO' "
            "stacked at top with stork glyph above; product name 'COASTAL "
            "BLEND' below; 'WHOLE BEAN COFFEE' subtitle; flavor notes line "
            "'JASMINE · KEY LIME · COCOA'; '12OZ (340G)' at bottom."
        ),
        "extra_scene": "Whole coffee beans scattered across the wooden counter in front of the bag.",
    },
    {
        "sku": "coastal-colombia-fairtrade-12oz",
        "category": "coffee",
        "product_label": (
            "COFFEE BAG: 'COASTAL BREWING CO' + stork. Product name 'COASTAL "
            "COLOMBIA' with 'FAIRTRADE' badge below the wordmark. Flavor "
            "notes 'CARAMEL · CITRUS · MILK CHOCOLATE'. '12OZ (340G)'."
        ),
        "extra_scene": "Whole coffee beans on the wooden counter.",
    },
    {
        "sku": "coastal-guatemala-fairtrade-12oz",
        "category": "coffee",
        "product_label": (
            "COFFEE BAG: 'COASTAL BREWING CO' + stork. Product name 'COASTAL "
            "GUATEMALA' with 'FAIRTRADE' badge. Flavor notes 'MILK CHOCOLATE "
            "· SOFT FRUIT · BALANCED'. '12OZ (340G)'."
        ),
        "extra_scene": "Whole coffee beans on the counter.",
    },
    {
        "sku": "coastal-peru-fairtrade-12oz",
        "category": "coffee",
        "product_label": (
            "COFFEE BAG: 'COASTAL BREWING CO' + stork. Product name 'COASTAL "
            "PERU' with two badges: 'FAIRTRADE' and 'CLEAN COFFEE PROJECT'. "
            "Flavor notes 'LEMON · HERBAL · SMOOTH'. '12OZ (340G)'. Lab-clean "
            "register — slightly more clinical / honest than the others."
        ),
        "extra_scene": "Whole coffee beans plus a small lab-test paper card resting beside the bag.",
    },
    {
        "sku": "coastal-peru-decaf-fairtrade-12oz",
        "category": "coffee",
        "product_label": (
            "COFFEE BAG: 'COASTAL BREWING CO' + stork. Product name 'COASTAL "
            "PERU DECAF' with 'FAIRTRADE' badge and 'SWISS WATER PROCESS' "
            "badge. Flavor notes 'SMOOTH · MILD CHOCOLATE · LOW ACID'. "
            "'12OZ (340G)'."
        ),
        "extra_scene": "Whole coffee beans on the counter.",
    },
    {
        "sku": "coastal-honduras-fairtrade-12oz",
        "category": "coffee",
        "product_label": (
            "COFFEE BAG: 'COASTAL BREWING CO' + stork. Product name 'COASTAL "
            "HONDURAS' with 'FAIRTRADE' badge. Flavor notes 'COCOA · BROWN "
            "SUGAR · WALNUT'. '12OZ (340G)'."
        ),
        "extra_scene": "Whole coffee beans on the counter, slightly darker roast color visible.",
    },
    {
        "sku": "coastal-sumatra-fairtrade-12oz",
        "category": "coffee",
        "product_label": (
            "COFFEE BAG: 'COASTAL BREWING CO' + stork. Product name 'COASTAL "
            "SUMATRA' with 'FAIRTRADE' badge. Flavor notes 'DARK CHOCOLATE · "
            "DRIED FRUIT · EARTHY'. '12OZ (340G)'. Anchor SKU register — "
            "slightly more substantial bag presence."
        ),
        "extra_scene": "Dark roasted coffee beans on the counter.",
    },
    # ─── Lowcountry Tea (5) — cream cylindrical tin with brown band ────────
    {
        "sku": "lowcountry-tea-jasmine-green-2oz",
        "category": "tea",
        "product_label": (
            "CREAM CYLINDRICAL TIN: 'COASTAL BREWING CO' + stork above the "
            "brown band. Below band: 'LOWCOUNTRY TEA / JASMINE GREEN', flavor "
            "descriptor 'WHOLE-LEAF · HAND-PAIRED JASMINE BLOSSOMS', 'NET "
            "WT. 2OZ (56G)'."
        ),
        "extra_scene": (
            "CUT JASMINE BRANCHES laid beside the tin per design.md §11 "
            "jasmine motif rule — small white jasmine flowers visible on "
            "the green stems, fragrant register implied."
        ),
    },
    {
        "sku": "lowcountry-tea-english-breakfast-2oz",
        "category": "tea",
        "product_label": (
            "CREAM CYLINDRICAL TIN: 'COASTAL BREWING CO' + stork above brown "
            "band. Below band: 'LOWCOUNTRY TEA / ENGLISH BREAKFAST', "
            "descriptor 'WHOLE-LEAF · ASSAM · CEYLON · DARJEELING', "
            "'NET WT. 2OZ (56G)'."
        ),
        "extra_scene": "A few loose whole-leaf tea pieces scattered beside the tin.",
    },
    {
        "sku": "lowcountry-tea-moroccan-mint-2oz",
        "category": "tea",
        "product_label": (
            "CREAM CYLINDRICAL TIN: 'COASTAL BREWING CO' + stork above brown "
            "band. Below band: 'LOWCOUNTRY TEA / MOROCCAN MINT', descriptor "
            "'GUNPOWDER GREEN + SPEARMINT + PEPPERMINT', 'NET WT. 2OZ (56G)'."
        ),
        "extra_scene": "A small spring of fresh mint resting beside the tin.",
    },
    {
        "sku": "lowcountry-tea-hibiscus-berry-2oz",
        "category": "tea",
        "product_label": (
            "CREAM CYLINDRICAL TIN: 'COASTAL BREWING CO' + stork above brown "
            "band. Below band: 'LOWCOUNTRY TEA / HIBISCUS BERRY', descriptor "
            "'CAFFEINE-FREE · HIBISCUS · ROOIBOS · BERRIES', 'NET WT. 2OZ "
            "(56G)'."
        ),
        "extra_scene": "Dried hibiscus flowers and a few dried berries scattered beside the tin.",
    },
    {
        "sku": "lowcountry-tea-masala-2oz",
        "category": "tea",
        "product_label": (
            "CREAM CYLINDRICAL TIN: 'COASTAL BREWING CO' + stork above brown "
            "band. Below band: 'LOWCOUNTRY TEA / MASALA', descriptor "
            "'ASSAM + WHOLE SPICES · CARDAMOM · CLOVE · GINGER', 'NET WT. "
            "2OZ (56G)'."
        ),
        "extra_scene": "Whole cardamom pods, a cinnamon stick, and a few cloves beside the tin.",
    },
    # ─── Coastal Chai (1) — DARKER tin, distinct from cream tea tins ───────
    {
        "sku": "coastal-chai-2_1oz",
        "category": "chai",
        "product_label": (
            "DARK CHARCOAL CYLINDRICAL TIN: small cream label on front with "
            "stork glyph + 'COASTAL' wordmark, then 'CHAI / SPICED BLACK "
            "TEA' in tracked-out small caps, then 'NET WT. 2.1OZ (56G)'."
        ),
        "extra_scene": (
            "Whole spices around the dark tin: star anise, cinnamon stick, "
            "black cardamom pods, peppercorns. Slightly warmer light register "
            "than the cream tins — emphasizes the spiced chai story."
        ),
    },
    # ─── Matcha (1) — cream cylindrical tin ────────────────────────────────
    {
        "sku": "coastal-matcha-ceremonial-30g",
        "category": "matcha",
        "product_label": (
            "CREAM CYLINDRICAL TIN: 'COASTAL BREWING CO' + stork above brown "
            "band. Below band: 'MATCHA / CEREMONIAL GRADE', descriptor "
            "'JAS ORGANIC · UJI SINGLE-ESTATE', 'NET WT. 2OZ (56G)' (image "
            "label per design canon, despite shipped vendor pack being 30g)."
        ),
        "extra_scene": (
            "A small ceramic chawan (matcha bowl) with vibrant emerald matcha "
            "powder and a bamboo whisk (chasen) beside the tin. Soft directional "
            "light catches the bright green of the matcha."
        ),
    },
    # ─── Subscriptions (3) — multi-month presentation ──────────────────────
    {
        "sku": "coastal-coffee-monthly",
        "category": "subscription",
        "product_label": (
            "THREE cream Coastal Brewing coffee bags arranged in a row on a "
            "wooden tray, each showing the stork glyph + 'COASTAL BREWING CO' "
            "wordmark, with different product names visible across the row "
            "('COASTAL BLEND', 'COASTAL COLOMBIA', 'COASTAL SUMATRA'). A "
            "small wooden stamped sign placed in front reading 'COFFEE · "
            "MONTHLY' in tracked-out small caps."
        ),
        "extra_scene": "Coffee beans scattered between the bags. A small slip of paper labeled 'CYCLE 03' tucked under the tray.",
    },
    {
        "sku": "coastal-tea-monthly",
        "category": "subscription",
        "product_label": (
            "THREE cream Lowcountry Tea cylindrical tins arranged in a row, "
            "each showing the stork glyph + 'COASTAL BREWING CO' above the "
            "brown band, with three different variants visible across the row "
            "('JASMINE GREEN', 'ENGLISH BREAKFAST', 'HIBISCUS BERRY'). A "
            "small wooden stamped sign in front reading 'TEA · MONTHLY'."
        ),
        "extra_scene": "Cut jasmine branches behind the tins. Loose whole-leaf tea scattered between the tins.",
    },
    {
        "sku": "coastal-combo-monthly",
        "category": "subscription",
        "product_label": (
            "ONE cream coffee bag, ONE cream Lowcountry Tea tin, and ONE "
            "cream matcha tin grouped together on a wooden tray, all branded "
            "with the stork glyph + 'COASTAL BREWING CO'. A small wooden "
            "stamped sign reading 'COFFEE + TEA · MONTHLY'."
        ),
        "extra_scene": "Coffee beans + cut jasmine + small chawan visible in the arrangement.",
    },
    # ─── Bundles (3) — curated multi-product layout ────────────────────────
    {
        "sku": "coastal-discovery-bundle",
        "category": "bundle",
        "product_label": (
            "ONE small cream coffee bag (COASTAL BLEND), ONE cream tea tin "
            "(LOWCOUNTRY TEA · JASMINE GREEN), and ONE cream matcha tin "
            "(MATCHA · CEREMONIAL GRADE) arranged on a wooden serving tray. "
            "Three small ceramic Ethiopian-pattern coffee cups beside the "
            "tray. A small wooden stamped sign reading 'DISCOVERY TRIO'."
        ),
        "extra_scene": "Coffee beans + a few jasmine flowers + bamboo whisk in the composition.",
    },
    {
        "sku": "coastal-pantry-refill",
        "category": "bundle",
        "product_label": (
            "TWO cream coffee bags stacked on a wooden counter, TWO cream "
            "Lowcountry Tea tins beside, ONE dark Coastal Chai tin to the "
            "right. All branded. A small wooden stamped sign reading "
            "'PANTRY REFILL'."
        ),
        "extra_scene": "Coffee beans + whole spices scattered between items.",
    },
    {
        "sku": "coastal-gift-bundle",
        "category": "bundle",
        "product_label": (
            "ONE cream coffee bag, ONE cream Lowcountry Tea tin, and ONE "
            "ceramic Ethiopian-pattern coffee cup grouped together on a small "
            "wooden gift platform. The arrangement is RIBBON-TIED with cream "
            "twine across the platform. A small kraft-paper gift tag reading "
            "'COASTAL · GIFT' tucked into the twine."
        ),
        "extra_scene": "Soft textured cream linen partially visible underneath the gift platform.",
    },
]


# ─── Prompt builder ────────────────────────────────────────────────────────


def _category_canon(category: str) -> str:
    """Return the canonical packaging description for a category."""
    if category == "coffee":
        return COFFEE_BAG_CANON
    if category in ("tea", "matcha"):
        return CREAM_TIN_CANON
    if category == "chai":
        return DARK_TIN_CANON
    # subscription / bundle — multi-product, no single canon
    return ""


def build_prompt(spec: dict) -> str:
    parts = [
        f"Product hero photograph for Coastal Brewing Co. SKU '{spec['sku']}' (category: {spec['category']}).",
        _category_canon(spec["category"]),
        spec["product_label"],
    ]
    if spec.get("extra_scene"):
        parts.append(f"Composition: {spec['extra_scene']}")
    parts.extend([
        BRAND_REGISTER,
        (
            "Aspect: 3:4 vertical product hero. Cinematic. Authentic. The "
            "product is the centerpiece — clearly readable wordmark, clearly "
            "readable product name, clearly readable flavor notes. Branded "
            "counter dressing visible behind the product but the PRODUCT is "
            "the subject. NEGATIVE: NO modern UPC/barcode strips, NO plastic "
            "windows, NO holographic foil, NO modern brand logos other than "
            "Coastal Brewing's stork-and-wordmark, NO machine-printed gloss "
            "labels — everything reads hand-stamped and warm."
        ),
    ])
    return " ".join(p for p in parts if p)


# ─── Kie.ai API call ───────────────────────────────────────────────────────


def generate_via_kie(spec: dict) -> Path:
    if not KIE_AI_API_KEY:
        raise SystemExit(
            "KIE_AI_API_KEY not set. Source from openclaw vault: "
            "ssh myclaw-vps 'docker exec openclaw-sop5-openclaw-1 env | grep -i KIE_AI_API_KEY'"
        )

    prompt = build_prompt(spec)
    headers = {"Authorization": f"Bearer {KIE_AI_API_KEY}", "Content-Type": "application/json"}

    create_payload = {
        "model": KIE_GPT_IMAGE_2_MODEL,
        "input": {
            "prompt": prompt,
            "input_urls": [SAL_REFERENCE_URL],
            "aspect_ratio": "3:4",
            "resolution": "2K",
        },
    }
    resp = requests.post(KIE_CREATE_TASK_ENDPOINT, headers=headers, json=create_payload, timeout=60)
    if resp.status_code != 200:
        raise RuntimeError(
            f"[{spec['sku']}] Kie.ai createTask {resp.status_code}: {resp.text[:500]}"
        )
    body = resp.json()
    if body.get("code") != 200:
        raise RuntimeError(f"[{spec['sku']}] Kie.ai create error: {body}")
    task_id = body["data"]["taskId"]

    # Poll up to ~5 minutes (50 polls × 6s).
    for _ in range(50):
        time.sleep(6)
        poll = requests.get(
            KIE_RECORD_INFO_ENDPOINT,
            headers={"Authorization": f"Bearer {KIE_AI_API_KEY}"},
            params={"taskId": task_id},
            timeout=30,
        )
        if poll.status_code != 200:
            continue
        pdata = poll.json().get("data", {})
        state = pdata.get("state", "")
        if state == "success":
            result_json = pdata.get("resultJson", "")
            try:
                result = json.loads(result_json) if isinstance(result_json, str) else result_json
                urls = result.get("resultUrls", []) or []
                if not urls:
                    raise RuntimeError(
                        f"[{spec['sku']}] Kie.ai success but no resultUrls: {pdata}"
                    )
                image_url = urls[0]
            except (json.JSONDecodeError, KeyError, AttributeError) as e:
                raise RuntimeError(f"[{spec['sku']}] Kie.ai resultJson parse: {e} / {result_json[:300]}")
            img_resp = requests.get(image_url, timeout=120)
            img_resp.raise_for_status()
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            out_path = OUTPUT_DIR / f"{spec['sku']}.png"
            out_path.write_bytes(img_resp.content)
            return out_path
        if state in ("fail", "failed", "error"):
            raise RuntimeError(
                f"[{spec['sku']}] Kie.ai task {state}: {pdata.get('failMsg') or pdata}"
            )

    raise RuntimeError(f"[{spec['sku']}] Kie.ai task {task_id} timed out after 5 minutes")


# ─── Driver ────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="Generate only this SKU")
    parser.add_argument(
        "--category",
        choices=["coffee", "tea", "matcha", "chai", "subscription", "bundle"],
        help="Generate only SKUs in this category",
    )
    parser.add_argument("--list", action="store_true", help="List the roster and exit")
    args = parser.parse_args()

    print(f"Output dir:   {OUTPUT_DIR}")
    print(f"Sal ref URL:  {SAL_REFERENCE_URL}")
    print()

    if args.list:
        for s in PRODUCTS_FOR_IMAGE_GEN:
            print(f"  - {s['sku']:42s} ({s['category']})")
        return

    if args.only:
        targets = [s for s in PRODUCTS_FOR_IMAGE_GEN if s["sku"] == args.only]
        if not targets:
            print(f"Unknown SKU: {args.only}", file=sys.stderr)
            print("Available:", file=sys.stderr)
            for s in PRODUCTS_FOR_IMAGE_GEN:
                print(f"  - {s['sku']}", file=sys.stderr)
            sys.exit(1)
    elif args.category:
        targets = [s for s in PRODUCTS_FOR_IMAGE_GEN if s["category"] == args.category]
        if not targets:
            print(f"No SKUs in category: {args.category}", file=sys.stderr)
            sys.exit(1)
    else:
        targets = PRODUCTS_FOR_IMAGE_GEN

    cost_per_image = 0.05
    print(
        f"Generating {len(targets)} product hero shot(s) — estimated cost: ${cost_per_image * len(targets):.2f}"
    )
    print()

    succeeded: list[str] = []
    failed: list[tuple[str, str]] = []

    for spec in targets:
        print(f"  [{spec['sku']}] ({spec['category']}) ...", end="", flush=True)
        try:
            t0 = time.time()
            path = generate_via_kie(spec)
            elapsed = time.time() - t0
            size_kb = path.stat().st_size // 1024
            print(f" OK ({elapsed:.1f}s, {size_kb} KB) -> {path.name}")
            succeeded.append(spec["sku"])
        except Exception as e:
            print(f" FAILED: {e}")
            failed.append((spec["sku"], str(e)))

    print()
    print("=" * 60)
    print(f"Succeeded: {len(succeeded)}/{len(targets)}")
    print(f"Failed:    {len(failed)}")
    if failed:
        for sku, err in failed:
            print(f"  - {sku}: {err}")
    print()
    print(f"Outputs: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
