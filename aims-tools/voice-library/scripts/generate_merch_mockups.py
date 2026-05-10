#!/usr/bin/env python3
"""Generate Coastal Brewing Co. merch + marketing mockup images via Kie.ai.

Sibling to `generate_product_hero_shots.py` — same Kie.ai
gpt-image-2-image-to-image endpoint, same Sal_Ang reference URL as the
brand-register anchor. Targets physical merch (mug, tote, T-shirt, cap)
and marketing collateral (window cling, A-frame, welcome card,
Instagram post templates).

Usage:
    KIE_AI_API_KEY=$(ssh myclaw-vps 'docker exec openclaw-sop5-openclaw-1 env' | grep -i KIE_AI_API_KEY | cut -d= -f2-) \\
    python aims-tools/voice-library/scripts/generate_merch_mockups.py
    # Single asset:
    python aims-tools/voice-library/scripts/generate_merch_mockups.py --only=mug-cream

Cost: ~$0.05/image at 2K resolution. ~15 assets ≈ $0.75 total.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests

KIE_AI_API_KEY = os.environ.get("KIE_AI_API_KEY") or os.environ.get("Kie_Ai_Api_Key")
KIE_CREATE_TASK_ENDPOINT = "https://api.kie.ai/api/v1/jobs/createTask"
KIE_RECORD_INFO_ENDPOINT = "https://api.kie.ai/api/v1/jobs/recordInfo"
KIE_GPT_IMAGE_2_MODEL = "gpt-image-2-image-to-image"

SAL_REFERENCE_URL = (
    "https://raw.githubusercontent.com/BoomerAng9/foai/main/"
    "chicken-hawk/hawk-ui/public/chicken-hawk/coffee-shop-sal-ang.png"
)

# Official Coastal Brewing Co. logo — flying stork (in flight, wings up,
# vintage engraving style) above stacked heavy-serif COASTAL / BREWING / CO.
# wordmark, dark sepia on cream parchment. Owner-canon 2026-04-30.
COASTAL_LOGO_REFERENCE_URL = (
    "https://raw.githubusercontent.com/BoomerAng9/foai/main/"
    "coastal-brewing/web/public/coastal-brewing-logo-official.png"
)

# Official motto — title case, terminal period. NOT "Every cup is what the
# label says it is" (that was a hallucinated tagline; owner corrected
# 2026-04-30).
COASTAL_MOTTO = "Nothing Chemically, Ever."

HOME = Path.home()
OUTPUT_DIR = (
    HOME
    / "iCloudDrive"
    / "ACHIEVEMOR_"
    / "Projects_"
    / "The Deploy Platform_"
    / "Claude Code"
    / "coastal-business-plan"
    / "merch-mockups"
)

# Brand register prelude shared across every shot. Owner-canon 2026-04-30
# corrections: official logo is a FLYING STORK in mid-flight (wings UP, NOT
# a wading-bird stance), with a STACKED VERTICAL heavy-serif wordmark
# beneath. Official motto is "Nothing Chemically, Ever." NOT "Every cup is
# what the label says it is" (that was a hallucinated tagline).
BRAND_REGISTER = (
    "Coastal Brewing Co. official brand canon: \n"
    "- Palette: cream / parchment (#FAF7F0, #F4EDE0), dark sepia / deep "
    "brown ink (#3D2817), deep coastal navy (#1A2C3D), coastal amber "
    "(#C8732B accent), honey yellow (#E8A020 secondary accent).\n"
    "- Logo (load-bearing — see attached reference): a FLYING STORK in "
    "MID-FLIGHT, wings UP and spread, beak pointed forward, legs trailing "
    "back. Vintage line-art / engraving-style ink illustration, dark sepia "
    "on cream parchment. NOT a wading-bird stance, NOT a silhouette — a "
    "detailed engraved illustration of a stork in motion.\n"
    "- Wordmark beneath the bird: STACKED VERTICALLY on three lines, all "
    "centered. Line 1: 'COASTAL' in heavy slab-style serif, large, distressed "
    "letterpress texture, dark sepia. Line 2: 'BREWING' centered below in "
    "smaller, lighter-weight serif. Line 3: 'CO.' centered below in even "
    "smaller serif. Vintage / engraved feel.\n"
    "- Motto (when shown): 'Nothing Chemically, Ever.' Title Case, three "
    "words, terminal period.\n"
    "- Lowcountry South Carolina hospitality aesthetic. Soft warm directional "
    "light, wooden surfaces, slight aged-paper texture in backgrounds."
)

# Asset spec — slug → composition. All compositions use the official-canon
# brand mark (flying stork + stacked serif wordmark) per the corrected
# BRAND_REGISTER above.
MERCH_ASSETS = [
    {
        "slug": "mug-cream",
        "composition": (
            "Product photography studio shot of a cream-colored ceramic coffee "
            "mug, 12oz size, classic round shape with a short handle. The front "
            "of the mug shows the official Coastal Brewing Co. brand mark: a "
            "flying stork (wings up, in mid-flight, vintage engraving style) in "
            "dark sepia ink, with the stacked wordmark 'COASTAL / BREWING / CO.' "
            "in heavy slab-serif beneath the bird, all centered. Soft directional "
            "daylight on a wooden surface, faint cream-cloth backdrop. The mug "
            "is the hero. No coffee inside — clean product shot."
        ),
    },
    {
        "slug": "mug-dark",
        "composition": (
            "Product photography studio shot of a deep coastal navy ceramic "
            "coffee mug, 12oz, classic round, short handle. Front of the mug "
            "carries the official Coastal Brewing Co. brand mark in CREAM ink: "
            "the flying stork (wings up, mid-flight, vintage engraving style) "
            "above the stacked 'COASTAL / BREWING / CO.' heavy slab-serif "
            "wordmark. Wooden surface, soft directional light. Clean product "
            "hero. The cream-stork-on-navy is the dark counterpart of the cream "
            "mug above."
        ),
    },
    {
        "slug": "tote-natural",
        "composition": (
            "Product photography studio shot of a natural unbleached cotton "
            "canvas tote bag, 14×16 inches with shoulder-length handles. "
            "Centered on the front face of the tote: the official Coastal "
            "Brewing Co. brand mark — flying stork (wings up, mid-flight, "
            "vintage engraving style) in dark sepia ink, with the stacked "
            "'COASTAL / BREWING / CO.' heavy slab-serif wordmark beneath. "
            "Below the wordmark: a small italic serif line reading 'Nothing "
            "Chemically, Ever.' Bag is hanging or laid flat, soft directional "
            "daylight, wooden-counter or marsh-grass-mat backdrop."
        ),
    },
    {
        "slug": "tote-black",
        "composition": (
            "Product photography studio shot of a black canvas tote bag, "
            "14×16 inches, shoulder handles. Centered on the front face: the "
            "official Coastal Brewing Co. brand mark in CREAM ink — flying "
            "stork (wings up, mid-flight, vintage engraving style) above the "
            "stacked 'COASTAL / BREWING / CO.' heavy slab-serif wordmark. "
            "Below: cream italic serif 'Nothing Chemically, Ever.' Bag laid "
            "flat or hung, soft directional daylight."
        ),
    },
    {
        "slug": "tshirt-heather-grey",
        "composition": (
            "Apparel mockup: heather-grey crew-neck T-shirt laid flat on a "
            "wooden surface. Centered chest design: the official Coastal "
            "Brewing Co. brand mark in dark sepia ink — flying stork (wings "
            "up, mid-flight, vintage engraving style) above the stacked "
            "'COASTAL / BREWING / CO.' heavy slab-serif wordmark. Soft "
            "daylight, neatly folded sleeves, flat lay (no model)."
        ),
    },
    {
        "slug": "tshirt-cream",
        "composition": (
            "Apparel mockup: cream / oatmeal crew-neck T-shirt laid flat on "
            "a wooden surface. Centered chest design: the official Coastal "
            "Brewing Co. brand mark in dark sepia ink — flying stork (wings "
            "up, mid-flight, vintage engraving style) above the stacked "
            "'COASTAL / BREWING / CO.' heavy slab-serif wordmark. Below the "
            "wordmark: a small italic serif line 'Nothing Chemically, Ever.' "
            "Soft daylight, neat flat lay."
        ),
    },
    {
        "slug": "cap-low-crown-navy",
        "composition": (
            "Apparel mockup: low-crown unstructured baseball cap, deep "
            "coastal navy. Front of cap carries a small embroidered cream "
            "version of the Coastal flying stork (wings up, mid-flight) — "
            "JUST the bird, no wordmark, sized to fit the cap front. Cap "
            "shown three-quarter angle on a wooden surface, soft directional "
            "daylight, slight curve to the brim. No tag visible."
        ),
    },
    {
        "slug": "storefront-window-cling-bluffton",
        "composition": (
            "Window cling design (interior vinyl decal) mockup, vertical "
            "composition for a storefront window. Top of cling: the official "
            "Coastal Brewing Co. brand mark — flying stork (wings up, "
            "mid-flight) above 'COASTAL / BREWING / CO.' stacked slab-serif "
            "wordmark, all in dark sepia ink. Beneath wordmark: a thin "
            "horizontal divider line, then 'BLUFFTON · LOWCOUNTRY · "
            "ESTABLISHED 2026' in small tracked-out mono. Bottom edge: italic "
            "serif 'Nothing Chemically, Ever.' Cream/parchment vinyl color on "
            "a glass window showing slight reflection of a marsh-edge "
            "background outside. Cling is the hero — composition centered."
        ),
    },
    {
        "slug": "popup-a-frame-chalkboard",
        "composition": (
            "Wooden A-frame chalkboard sandwich-board sign mockup, set on a "
            "farmers' market sidewalk. Front face shows a hand-drawn-chalk "
            "rendition of the official Coastal brand mark: flying stork "
            "(wings up, mid-flight) at top in chalk, then 'COASTAL BREWING "
            "CO.' chalk slab-serif wordmark stacked, then in chalk-mono caps "
            "'COFFEE · TEA · MATCHA · CHAI', then a small chalk price line "
            "'$5 cup · $19 bag', then italic chalk 'Nothing Chemically, "
            "Ever.' Wooden frame, slight wear. Background: Lowcountry market "
            "scene with palm shadows and warm sunlight."
        ),
    },
    {
        "slug": "subscription-welcome-insert-card",
        "composition": (
            "Print insert card mockup, 4×6 inches, cream cardstock with "
            "letterpress feel. Front face: at top, the official Coastal "
            "brand mark — flying stork (wings up, mid-flight) above the "
            "stacked 'COASTAL / BREWING / CO.' slab-serif wordmark, dark "
            "sepia. Below in Playfair-style serif: 'Mornin', friend.' as a "
            "greeting. Then in mono small caps: 'WELCOME TO THE MONTHLY.' "
            "Body in clean serif: 'Your first bag. Roasted small-batch this "
            "week. Check your inbox for tracking. Y'all come back, hear?' "
            "Bottom of card in italic serif: 'Nothing Chemically, Ever.' "
            "Card is the hero on a wooden surface with a subtle drop shadow."
        ),
    },
    {
        "slug": "wholesale-partner-badge",
        "composition": (
            "Circular badge / seal design mockup, 2-inch diameter. Cream "
            "parchment background with a thin deep coastal navy outer ring. "
            "Inside the ring: the official Coastal flying stork (wings up, "
            "mid-flight, vintage engraving style) centered, in dark sepia "
            "ink. Around the inner ring as arc-text: 'CARRIES COASTAL' "
            "across the top arc and 'BREWING CO.' across the bottom arc, "
            "both in slab-serif tracked-out caps. Badge displayed on a "
            "wooden coffee-shop counter edge or on a glass window. Soft "
            "directional daylight. The badge is the hero."
        ),
    },
    {
        "slug": "newsletter-banner-hero",
        "composition": (
            "Email newsletter banner image, 1200×400 horizontal layout. "
            "Left third: the official Coastal flying stork (wings up, "
            "mid-flight, vintage engraving style) in dark sepia on a cream "
            "parchment background. Center third: 'THE COASTAL DISPATCH' in "
            "large slab-serif (matching the brand-mark wordmark register), "
            "with 'monthly origin stories + brewing notes' in mono small "
            "caps below. Right third: a small line-art illustration of a "
            "Lowcountry marsh-edge dock with two ceramic coffee cups on it. "
            "Soft warm cream-and-parchment palette throughout."
        ),
    },
    {
        "slug": "instagram-sku-spotlight",
        "composition": (
            "Instagram-square (1080×1080) post template mockup. Cream "
            "parchment background with subtle aged-paper texture. Centered: "
            "a Coastal Brewing Co. cream coffee bag photographed at a slight "
            "three-quarter angle on a wooden counter, with the official "
            "Coastal flying-stork brand mark and 'COASTAL SUMATRA FAIRTRADE' "
            "visible on the bag's front. Surrounding scene: a few coffee "
            "beans scattered around, a small ceramic Ethiopian-pattern cup "
            "in the foreground, soft golden-hour light. Top of frame in "
            "tracked-out mono caps: 'NEW LOT · FAIRTRADE · ROASTED THIS "
            "WEEK'. Bottom of frame: small Coastal flying-stork mark + URL "
            "'brewing.foai.cloud' + italic 'Nothing Chemically, Ever.' "
            "Strong centered composition."
        ),
    },
    {
        "slug": "instagram-lowcountry-scene",
        "composition": (
            "Instagram-square (1080×1080) lifestyle post template mockup. A "
            "Lowcountry porch scene at golden hour: a wooden porch table "
            "with a white ceramic mug of dark coffee, a small Coastal "
            "Brewing Co. cream paper coffee bag (official flying-stork brand "
            "mark + 'COASTAL BLEND' visible on the bag), a moleskine "
            "notebook with a pen resting on top, and a hand-drawn map of "
            "the SC Lowcountry coast. Spanish moss draped in the upper "
            "background. Warm afternoon directional light. Top of frame in "
            "tracked-out mono caps: 'A SLOW SUNDAY · BLUFFTON'. Bottom of "
            "frame: small flying-stork mark + handle '@coastalbrewing' + "
            "italic 'Nothing Chemically, Ever.'"
        ),
    },
    {
        "slug": "instagram-team-character-portrait",
        "composition": (
            "Instagram-square (1080×1080) team-introduction post template "
            "mockup featuring Sal_Ang in his Coastal CORP TEAM uniform. Sal "
            "stands behind a wooden counter wearing: a deep coastal-amber "
            "(#C8732B) half-apron with a square 'CORP' team patch sewn on "
            "the upper left chest (white slab-serif 'CORP' on amber, with "
            "the Coastal flying-stork mark above the text), over a cream "
            "button-down with sleeves rolled to elbow. He wears the canon "
            "tactical visor across his eyes (visor stamped 'SAL' in copper-"
            "orange LED). A small leather pocket notebook visible in his "
            "apron front pocket. Background: the canonical Coastal counter "
            "with a copper Ethiopian coffee pot, the 'COFFEE TEA MATCHA "
            "PURPOSE' wooden sign, and the 'COASTAL BREWING CO. — Nothing "
            "Chemically, Ever.' banner above him. Top of frame in tracked-"
            "out mono caps: 'MEET SAL · CORP TEAM · LOWCOUNTRY SOUTHERN'. "
            "Below the image: italic serif 'I know the cup. Tell me what "
            "y'all like.' Bottom: small flying-stork mark + handle "
            "'@coastalbrewing'."
        ),
    },
]


def _validate_env() -> None:
    if not KIE_AI_API_KEY:
        sys.exit("ERROR: KIE_AI_API_KEY not set. See module docstring.")


def _build_prompt(asset: dict) -> str:
    return (
        f"PRODUCT MOCKUP: Coastal Brewing Co. — {asset['slug']}\n\n"
        f"BRAND REGISTER (LOAD-BEARING)\n{BRAND_REGISTER}\n\n"
        f"REFERENCE IMAGES\n"
        f"- input_urls[0]: Sal_Ang canonical scene — establishes Lowcountry "
        f"hospitality lighting, palette, wooden-counter context.\n"
        f"- input_urls[1]: OFFICIAL Coastal Brewing Co. logo — flying stork "
        f"in mid-flight (wings up, vintage engraving style) above the "
        f"stacked 'COASTAL / BREWING / CO.' heavy-serif wordmark on cream "
        f"parchment. THIS is the brand mark to reproduce. Do NOT invent a "
        f"different bird or layout.\n\n"
        f"COMPOSITION\n{asset['composition']}\n\n"
        f"OUTPUT REQUIREMENTS\n"
        f"- Photorealistic product mockup or design mockup as the composition "
        f"implies.\n"
        f"- The asset is the HERO — composed centrally and clearly.\n"
        f"- The Coastal brand mark on the asset MUST match the official logo "
        f"in input_urls[1]: a FLYING stork (wings UP, mid-flight, NOT a "
        f"wading-bird stance), with the STACKED VERTICAL 'COASTAL / BREWING "
        f"/ CO.' heavy-serif wordmark beneath. Three lines of text, centered, "
        f"in this order.\n"
        f"- Motto, where shown, is exactly 'Nothing Chemically, Ever.' Title "
        f"Case, three words, terminal period. NEVER use 'Every cup is what "
        f"the label says it is' — that is not the brand-mark tagline.\n"
        f"- No alternate brand names, no other coffee-company logos, no "
        f"stock-photo watermark.\n"
        f"- No text rendering errors. 'COASTAL', 'BREWING', 'CO.', and the "
        f"motto must render legibly with correct spelling and Title Case "
        f"where specified."
    )


def _generate_via_kie(prompt: str, output_path: Path) -> bool:
    headers = {
        "Authorization": f"Bearer {KIE_AI_API_KEY}",
        "Content-Type": "application/json",
    }
    create_payload = {
        "model": KIE_GPT_IMAGE_2_MODEL,
        "input": {
            "prompt": prompt,
            # Two anchors: Sal scene establishes register; official logo
            # establishes the canonical brand mark. Owner-canon 2026-04-30.
            "input_urls": [SAL_REFERENCE_URL, COASTAL_LOGO_REFERENCE_URL],
            "aspect_ratio": "1:1",
            "resolution": "2K",
        },
    }
    r = requests.post(
        KIE_CREATE_TASK_ENDPOINT,
        json=create_payload,
        headers=headers,
        timeout=30,
    )
    if r.status_code != 200:
        print(f"  ! createTask HTTP {r.status_code}: {r.text[:200]}")
        return False
    data = r.json().get("data") or {}
    task_id = data.get("taskId")
    if not task_id:
        print(f"  ! createTask returned no taskId: {data}")
        return False
    # Poll
    for _ in range(60):  # ~3 min max
        time.sleep(5)
        rr = requests.get(
            KIE_RECORD_INFO_ENDPOINT,
            params={"taskId": task_id},
            headers=headers,
            timeout=15,
        )
        rec = rr.json().get("data") or {}
        state = rec.get("state")
        if state == "success":
            # Kie.ai returns resultJson as a JSON-serialized STRING (not a dict).
            raw = rec.get("resultJson", "")
            try:
                result = json.loads(raw) if isinstance(raw, str) else (raw or {})
            except (json.JSONDecodeError, TypeError):
                print(f"  ! resultJson parse failed: {raw[:200]}")
                return False
            result_urls = result.get("resultUrls", []) or []
            if not result_urls:
                print(f"  ! state=success but no resultUrls in {result}")
                return False
            img_url = result_urls[0]
            ir = requests.get(img_url, timeout=60)
            ir.raise_for_status()
            output_path.write_bytes(ir.content)
            return True
        if state == "fail":
            print(f"  ! state=fail: {rec.get('errorMessage', '(no message)')}")
            return False
    print("  ! polled 60x, no completion")
    return False


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--only", help="Run only this slug")
    p.add_argument("--list", action="store_true", help="List asset slugs and exit")
    args = p.parse_args()

    if args.list:
        for a in MERCH_ASSETS:
            print(a["slug"])
        return

    _validate_env()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    targets = MERCH_ASSETS
    if args.only:
        targets = [a for a in MERCH_ASSETS if a["slug"] == args.only]
        if not targets:
            sys.exit(f"unknown slug: {args.only}")

    n = len(targets)
    print(f"Output dir:   {OUTPUT_DIR}")
    print(f"Sal ref URL:  {SAL_REFERENCE_URL}")
    print(f"\nGenerating {n} merch asset(s) — estimated cost: ${n * 0.05:.2f}\n")

    succeeded = 0
    failed = 0
    for asset in targets:
        slug = asset["slug"]
        out = OUTPUT_DIR / f"{slug}.png"
        prompt = _build_prompt(asset)
        t0 = time.monotonic()
        ok = _generate_via_kie(prompt, out)
        dt = time.monotonic() - t0
        if ok:
            succeeded += 1
            kb = out.stat().st_size // 1024
            print(f"  [{slug}] ... OK ({dt:.1f}s, {kb} KB) -> {out.name}")
        else:
            failed += 1
            print(f"  [{slug}] ... FAILED")

    print()
    print("=" * 60)
    print(f"Succeeded: {succeeded}/{n}")
    print(f"Failed:    {failed}")
    print(f"\nOutputs: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
