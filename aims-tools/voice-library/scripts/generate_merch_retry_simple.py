#!/usr/bin/env python3
"""One-off retry for merch mockups that failed in the main batch.

The main `generate_merch_mockups.py` batch produced opaque "state=fail
(no message)" errors on 9 of 15 assets. Those tend to be the apparel +
text-on-substrate compositions (T-shirts, totes, dark mug, cap, window
cling, A-frame, team portrait). Hypothesis: dual `input_urls` plus a
~2000-char prompt is more than gpt-image-2-image-to-image handles
reliably for these compositions.

This script retries with:
- Single `input_urls` (just the official Coastal logo)
- Shorter prompts (no BRAND_REGISTER prelude, no OUTPUT_REQUIREMENTS)
- Same brand-canon enforcement, just leaner

Output goes to the same merch-mockups folder. Idempotent — overwrites
prior renders if any (will not overwrite existing successes since the
output path is per-slug).
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

COASTAL_LOGO_REFERENCE_URL = (
    "https://raw.githubusercontent.com/BoomerAng9/foai/main/"
    "coastal-brewing/web/public/coastal-brewing-logo-official.png"
)

OUTPUT_DIR = (
    Path.home()
    / "iCloudDrive"
    / "ACHIEVEMOR_"
    / "Projects_"
    / "The Deploy Platform_"
    / "Claude Code"
    / "coastal-business-plan"
    / "merch-mockups"
)

# Lean compositions — let the input_url Coastal logo do the brand-mark
# work; describe only the substrate + scene + motto placement.
RETRY_ASSETS = [
    # mug-dark already rendered successfully in canon test 2026-04-30; skip
    # to avoid burning $0.05 on a re-render. Uncomment if needed.
    {
        "slug": "tote-natural",
        "composition": (
            "Natural unbleached cotton canvas tote bag, 14×16 inches, "
            "shoulder handles. The official Coastal Brewing Co. brand mark "
            "(flying stork above stacked COASTAL/BREWING/CO.) is printed "
            "centered in dark sepia ink on the front. Below the wordmark, "
            "in small italic serif: 'Nothing Chemically, Ever.' Bag laid "
            "flat or hanging. Soft daylight, wooden-counter or marsh-grass-"
            "mat backdrop."
        ),
    },
    {
        "slug": "tote-black",
        "composition": (
            "Black canvas tote bag, 14×16 inches, shoulder handles. The "
            "official Coastal Brewing Co. brand mark in CREAM ink "
            "(flying stork + stacked COASTAL/BREWING/CO.) centered on the "
            "front. Below wordmark: small cream italic serif 'Nothing "
            "Chemically, Ever.' Soft daylight, flat lay or hanging."
        ),
    },
    {
        "slug": "tshirt-heather-grey",
        "composition": (
            "Heather-grey crew-neck T-shirt laid flat on a wooden surface. "
            "Centered chest design: the official Coastal Brewing Co. brand "
            "mark in dark sepia ink (flying stork above stacked COASTAL/"
            "BREWING/CO. wordmark). Soft daylight, neat flat lay, no model."
        ),
    },
    {
        "slug": "tshirt-cream",
        "composition": (
            "Cream crew-neck T-shirt laid flat on a wooden surface. "
            "Centered chest design: the official Coastal Brewing Co. brand "
            "mark in dark sepia ink (flying stork above stacked COASTAL/"
            "BREWING/CO. wordmark) with small italic 'Nothing Chemically, "
            "Ever.' below. Soft daylight, neat flat lay."
        ),
    },
    {
        "slug": "cap-low-crown-navy",
        "composition": (
            "Low-crown unstructured baseball cap, deep coastal navy color. "
            "Front of cap embroidered with a small cream version of the "
            "Coastal flying-stork mark only — no wordmark, just the bird "
            "in flight. Cap shown three-quarter angle on a wooden surface. "
            "Soft daylight."
        ),
    },
    {
        "slug": "storefront-window-cling-bluffton",
        "composition": (
            "Vinyl window-cling design mockup on a glass storefront window. "
            "Vertical layout: at top, the official Coastal flying-stork mark "
            "above stacked COASTAL/BREWING/CO. heavy serif wordmark in dark "
            "sepia. Below: 'BLUFFTON · LOWCOUNTRY · ESTABLISHED 2026' in "
            "small mono caps. At the bottom edge: italic 'Nothing "
            "Chemically, Ever.' Cream/parchment vinyl on the window with a "
            "soft marsh-edge reflection visible behind."
        ),
    },
    {
        "slug": "popup-a-frame-chalkboard",
        "composition": (
            "A wooden A-frame chalkboard sandwich-board sign on a farmers' "
            "market sidewalk. Front face shows hand-drawn chalk versions: "
            "the Coastal flying-stork mark at top, then 'COASTAL BREWING "
            "CO.' in chalk slab-serif, then 'COFFEE · TEA · MATCHA · CHAI' "
            "in chalk small caps, then '$5 cup · $19 bag', then italic chalk "
            "'Nothing Chemically, Ever.' Wooden frame, slight wear. "
            "Background: soft Lowcountry market scene with palm shadows."
        ),
    },
    {
        "slug": "instagram-team-character-portrait",
        "composition": (
            "Instagram-square (1080x1080) portrait of Sal_Ang of Coastal "
            "Brewing Co. behind a wooden coffee counter. Sal is in FULL "
            "Coastal Boomer_Ang canon uniform: cream linen long-sleeve "
            "work jacket sleeves rolled to mid-forearm, right-chest "
            "stacked COASTAL/BREWING/CO patch in dark sepia, deep "
            "coastal-amber CORP half-apron with white-on-amber square "
            "'CORP' team patch on upper-left chest of the apron (the "
            "patch shows a small flying-stork mark above the 'CORP' "
            "text), high-collar dark charcoal under-shirt visible at "
            "the neck above the open jacket, BLACK TACTICAL VISOR "
            "across his eyes with 'SAL' GLOWING ORANGE LED block "
            "letters centered on the visor, BLACK CLOTH MASK covering "
            "the entire lower half of his face from below the visor "
            "down past the chin. NO eyes, NO nose, NO mouth, NO chin, "
            "NO facial features visible AT ALL beyond the visor and "
            "the cloth mask — only the hairline and medium-thick "
            "locs/braids pulled back behind. Background: a copper "
            "Ethiopian coffee pot, a 'COFFEE TEA MATCHA PURPOSE' "
            "wooden sign. Soft warm directional golden-hour light. "
            "Cream/parchment palette throughout. NO customer in frame."
        ),
    },
]


def _build_prompt(asset: dict) -> str:
    return (
        f"Product mockup: Coastal Brewing Co. — {asset['slug']}\n\n"
        f"COMPOSITION: {asset['composition']}\n\n"
        f"BRAND MARK REFERENCE: the input image is the Coastal Brewing Co. "
        f"official logo — a flying stork (wings up, mid-flight, vintage "
        f"engraving style) above the stacked heavy-serif COASTAL / BREWING "
        f"/ CO. wordmark on cream parchment. Reproduce this mark exactly "
        f"on the asset described above.\n\n"
        f"MOTTO: where shown, render exactly 'Nothing Chemically, Ever.' "
        f"(Title Case, terminal period). Never 'Every cup is what the "
        f"label says it is.'"
    )


def _generate(asset: dict, output_path: Path) -> tuple[bool, str]:
    headers = {
        "Authorization": f"Bearer {KIE_AI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": KIE_GPT_IMAGE_2_MODEL,
        "input": {
            "prompt": _build_prompt(asset),
            # Single input_url — official logo only
            "input_urls": [COASTAL_LOGO_REFERENCE_URL],
            "aspect_ratio": "1:1",
            "resolution": "2K",
        },
    }
    try:
        r = requests.post(KIE_CREATE_TASK_ENDPOINT, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        return False, f"createTask failed: {e}"
    if r.status_code != 200:
        return False, f"createTask HTTP {r.status_code}: {r.text[:200]}"
    task_id = (r.json().get("data") or {}).get("taskId")
    if not task_id:
        return False, f"no taskId: {r.json()}"
    for _ in range(60):
        time.sleep(5)
        try:
            rr = requests.get(KIE_RECORD_INFO_ENDPOINT, params={"taskId": task_id}, headers=headers, timeout=15)
        except requests.RequestException:
            continue
        rec = rr.json().get("data") or {}
        state = rec.get("state")
        if state == "success":
            raw = rec.get("resultJson", "")
            try:
                result = json.loads(raw) if isinstance(raw, str) else (raw or {})
            except (json.JSONDecodeError, TypeError):
                return False, f"resultJson parse failed: {raw[:200]}"
            urls = result.get("resultUrls", []) or []
            if not urls:
                return False, "no resultUrls"
            try:
                ir = requests.get(urls[0], timeout=60)
                ir.raise_for_status()
                output_path.write_bytes(ir.content)
                return True, ""
            except requests.RequestException as e:
                return False, f"download failed: {e}"
        if state == "fail":
            return False, f"fail: {rec.get('errorMessage') or '(no message)'}"
    return False, "polled 5min, no completion"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--only", help="Single slug")
    args = p.parse_args()

    if not KIE_AI_API_KEY:
        sys.exit("ERROR: KIE_AI_API_KEY not set")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    targets = RETRY_ASSETS
    if args.only:
        targets = [a for a in RETRY_ASSETS if a["slug"] == args.only]
        if not targets:
            sys.exit(f"unknown slug: {args.only}")

    print(f"Output: {OUTPUT_DIR}")
    print(f"Retrying {len(targets)} merch mockup(s) with single input_url + shorter prompts\n")

    succeeded = 0
    failed = 0
    for asset in targets:
        slug = asset["slug"]
        out = OUTPUT_DIR / f"{slug}.png"
        t0 = time.monotonic()
        ok, err = _generate(asset, out)
        dt = time.monotonic() - t0
        if ok:
            kb = out.stat().st_size // 1024
            print(f"  [{slug}] OK ({dt:.1f}s, {kb} KB)")
            succeeded += 1
        else:
            print(f"  [{slug}] FAILED: {err}")
            failed += 1

    print(f"\n{'='*60}\nSucceeded: {succeeded}/{len(targets)}\nFailed:    {failed}")


if __name__ == "__main__":
    main()
