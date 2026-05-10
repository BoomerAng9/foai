#!/usr/bin/env python3
"""Generate Coastal Brewing Co. customer-journey videos via Kie.ai Seedance.

Sibling to `generate_merch_mockups.py` — same Kie.ai jobs API, same auth,
same poll loop. Targets 8 short cinematic clips (5-9 sec each) covering
the customer journey from discovery to delivery, per
`iCloudDrive/.../coastal-business-plan/customer-journey-video-script.md`.

Brand canon enforced: motto "Nothing Chemically, Ever.", flying-stork
official logo as input_url anchor, team uniforms with badges per
`team-categories-and-uniforms.md`.

HeyGen is struck from the FOAI ecosystem (owner directive 2026-04-30) —
this script never references HeyGen.

Usage:
    KIE_AI_API_KEY=$(ssh myclaw-vps 'docker exec openclaw-sop5-openclaw-1 env' | grep -i KIE_AI_API_KEY | cut -d= -f2-) \\
    python aims-tools/voice-library/scripts/generate_customer_journey_videos.py
    # Single clip:
    python aims-tools/voice-library/scripts/generate_customer_journey_videos.py --only=clip-02-chat
    # List:
    python aims-tools/voice-library/scripts/generate_customer_journey_videos.py --list
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

# Seedance model slug — owner directive 2026-04-30: use Kie.ai Seedance for
# video generation. Kie.ai uses slash-format slugs (verified via
# docs.kie.ai/market/bytedance/seedance-2 and seedance-1-5-pro). Fallback
# chain tried in sequence on 404/unsupported errors. `seedance-2-fast` is
# the faster/cheaper variant — try first to keep cost down.
MODEL_FALLBACK_CHAIN = [
    "bytedance/seedance-2-fast",
    "bytedance/seedance-2",
    "bytedance/seedance-1.5-pro",
]
DEFAULT_MODEL = os.environ.get("COASTAL_VIDEO_MODEL") or MODEL_FALLBACK_CHAIN[0]

# Anchor URLs — same Sal scene + official Coastal logo from merch script.
SAL_REFERENCE_URL = (
    "https://raw.githubusercontent.com/BoomerAng9/foai/main/"
    "chicken-hawk/hawk-ui/public/chicken-hawk/coffee-shop-sal-ang.png"
)
COASTAL_LOGO_REFERENCE_URL = (
    "https://raw.githubusercontent.com/BoomerAng9/foai/main/"
    "coastal-brewing/web/public/coastal-brewing-logo-official.png"
)

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
    / "customer-journey-videos"
)

# Brand register — load-bearing prelude. Includes flying-stork logo canon,
# team-uniform-badge canon, palette. ENFORCES VISOR + CLOTH MASK CANON
# (owner directive 2026-04-30 after first-iteration clips showed faces).
BRAND_REGISTER = (
    "Coastal Brewing Co. official brand canon (LOAD-BEARING):\n\n"
    "BRAND MARK\n"
    "- Logo: flying stork in mid-flight (wings UP, vintage engraving "
    "style), above stacked heavy-serif COASTAL / BREWING / CO. wordmark, "
    "dark sepia ink on cream parchment. NEVER a wading-bird stance.\n\n"
    "PALETTE\n"
    "- Cream/parchment (#FAF7F0, #F4EDE0), dark sepia (#3D2817), deep "
    "coastal navy (#1A2C3D), coastal amber (#C8732B), honey yellow "
    "(#E8A020).\n\n"
    "BOOMER_ANG TEAM UNIFORM CANON (NON-NEGOTIABLE)\n"
    "Every Coastal team member visible on screen MUST wear:\n"
    "- BLACK TACTICAL VISOR across the eyes — the cast member's name "
    "in GLOWING ORANGE LED block letters centered on the visor (e.g., "
    "SAL, ROAST, SHIP). The visor covers the entire upper face.\n"
    "- BLACK CLOTH MASK covering the lower half of the face from below "
    "the visor down past the chin. NO eyes, no nose, no mouth, NO "
    "facial features visible AT ALL. Only the hairline above the visor "
    "is visible.\n"
    "- Cream linen long-sleeve work jacket, sleeves rolled to mid-forearm.\n"
    "- Right-chest stacked COASTAL / BREWING / CO patch in dark sepia.\n"
    "- Left-chest small Made in PLR circular badge above a small black "
    "rectangular name badge with cream lettering.\n"
    "- Cream/khaki chinos, brown leather belt.\n"
    "- Team-color half-apron with team patch:\n"
    "    BREW  apron dark-brown    | patch white-on-dark-brown 'BREW'\n"
    "    ROAST apron dark-olive    | patch white-on-olive 'ROAST'\n"
    "    WOW   apron cream         | patch white-on-deep-navy 'WOW'\n"
    "    SHIP  apron kraft-brown   | patch white-on-kraft 'SHIP'\n"
    "    CORP  apron coastal-amber | patch white-on-amber 'CORP'\n"
    "    MKT   cream field vest    | patch white-on-honey-yellow 'MKT'\n"
    "- High-collar dark charcoal under-shirt visible at neck above the "
    "open jacket.\n\n"
    "HARD EXCLUSIONS (DO NOT GENERATE)\n"
    "- NO customers visible. No customer faces. No customer hands. No "
    "phones, porches, kitchens, or homes. The customer is implied, "
    "never shown.\n"
    "- NO unmasked Boomer_Ang faces. The visor + cloth mask combination "
    "covers EVERY facial feature — render this every time.\n"
    "- NO on-screen text. No captions, no overlay typography, no "
    "labels written into the scene. Text is added in post-production. "
    "Generate visuals only.\n"
    "- NO competitor coffee brands, NO third-party logos beyond the "
    "Coastal flying-stork mark.\n\n"
    "AESTHETIC\n"
    "- Lowcountry South Carolina hospitality. Soft warm directional "
    "light, wooden surfaces, golden-hour warmth where applicable, slight "
    "aged-paper texture in backgrounds."
)

CLIPS = [
    {
        "slug": "clip-01-selection",
        "duration_s": 7,
        "scene": (
            "Slow camera dolly across stacked burlap coffee sacks at a "
            "specialty roastery warehouse. The sacks are stamped with "
            "FAIRTRADE marks plus country of origin (visible: COLOMBIA, "
            "SUMATRA, HONDURAS). A gloved hand belonging to a Coastal "
            "Brewing Co. team member in full ROAST uniform reaches out and "
            "rests on one of the Fairtrade-stamped sacks. The team member's "
            "uniform is fully canonical: cream linen long-sleeve work "
            "jacket sleeves rolled to mid-forearm, right-chest stacked "
            "COASTAL/BREWING/CO patch in dark sepia, dark-olive-green "
            "ROAST half-apron with white-on-olive 'ROAST' square patch on "
            "upper-left chest, BLACK TACTICAL VISOR across the eyes with "
            "'ROAST' GLOWING ORANGE LED block letters centered on the "
            "visor, BLACK CLOTH MASK covering the entire lower face below "
            "the visor — NO eyes visible, NO nose visible, NO mouth "
            "visible, NO facial features visible AT ALL beyond the visor "
            "and mask. Only the hairline above the visor shows. Soft "
            "warm warehouse light from a high window. Slow contemplative "
            "camera motion. The cert-mark stamp on the burlap is the "
            "visual hero alongside the gloved hand."
        ),
    },
    {
        "slug": "clip-02-quality",
        "duration_s": 7,
        "scene": (
            "Tight overhead shot of a wooden cupping table. Five small "
            "white ceramic cupping bowls in a row, each filled with "
            "freshly ground coffee. A SCA cupping scoresheet visible "
            "alongside, handwritten scores partially legible (no specific "
            "text required). A Coastal Brewing Co. team member's gloved "
            "hand in full ROAST uniform reaches in with a stainless-steel "
            "cupping spoon, lifts a sample, gentle steam rises from the "
            "bowl. A burlap-tagged certificate-of-analysis paper lies in "
            "the frame edge with a Fairtrade logo visible. The team "
            "member is in full Boomer_Ang uniform canon: cream linen "
            "long-sleeve jacket sleeves rolled, stacked COASTAL/BREWING/CO "
            "right-chest patch, dark-olive ROAST half-apron with "
            "ROAST patch, BLACK TACTICAL VISOR across eyes ('ROAST' in "
            "GLOWING ORANGE LED), BLACK CLOTH MASK covering entire lower "
            "face below the visor. NO facial features visible. Soft "
            "warm overhead light. The cupping ritual + cert document + "
            "gloved hand are the focus. NO customer."
        ),
    },
    {
        "slug": "clip-03-roast",
        "duration_s": 9,
        "scene": (
            "Inside a specialty coffee roastery. A large industrial drum "
            "coffee roaster runs in the foreground, glowing amber from "
            "the gas flame. Beans visible tumbling through the small "
            "viewport window of the drum. A Coastal Brewing Co. team "
            "member in FULL ROAST uniform canon (cream linen long-sleeve "
            "jacket sleeves rolled, right-chest stacked COASTAL/BREWING/CO "
            "patch in dark sepia, dark-olive-green ROAST half-apron with "
            "white-on-olive ROAST square patch upper-left chest, BLACK "
            "TACTICAL VISOR across the eyes with 'ROAST' GLOWING ORANGE "
            "LED block letters, BLACK CLOTH MASK covering the entire lower "
            "face — NO facial features visible at all beyond the visor "
            "and mask, only the hairline above shows; cream/khaki chinos, "
            "brown leather belt) lifts the sample trier rod from the "
            "roaster, tilts a tray of freshly roasted dark-brown beans "
            "toward the camera, beans cascading slowly. Slight steam "
            "haze. Burlap sacks stacked behind. Warm amber light "
            "dominates the scene. NO customer. The roast process and "
            "the dark roasted beans are the heroes."
        ),
    },
    {
        "slug": "clip-04-packaging",
        "duration_s": 6,
        "scene": (
            "A row of empty cream Coastal Brewing Co. paper coffee bags "
            "lined up on a wooden counter. Each bag has the official "
            "Coastal flying-stork brand mark + stacked COASTAL/BREWING/CO. "
            "wordmark printed in dark sepia ink on the front. Soft "
            "pendant light overhead. A Coastal team member in FULL SHIP "
            "uniform canon (cream linen jacket sleeves rolled, right-chest "
            "COASTAL/BREWING/CO patch, kraft-brown SHIP half-apron with "
            "white-on-kraft SHIP square patch upper-left chest, BLACK "
            "TACTICAL VISOR across eyes with 'SHIP' GLOWING ORANGE LED, "
            "BLACK CLOTH MASK covering lower face — NO face visible at "
            "all) gloved hands fill each bag with freshly roasted beans "
            "using a stainless-steel scoop, then folds the top closed. "
            "Camera slow-pans down the row of bags. The bags themselves "
            "with the prominent flying-stork brand mark are the visual "
            "hero. NO customer."
        ),
    },
    {
        "slug": "clip-05-inventory",
        "duration_s": 6,
        "scene": (
            "Wide static shot of a wooden shelving unit fully stocked "
            "with the complete Coastal Brewing Co. SKU lineup, organized "
            "by category. Shelf 1: cream paper coffee bags in a row, "
            "each showing the flying-stork brand mark and a different "
            "SKU name (Coastal Blend, Coastal Colombia, Coastal "
            "Guatemala, Coastal Peru, Coastal Honduras, Coastal Sumatra). "
            "Shelf 2: cream Lowcountry tea cylindrical tins (Jasmine "
            "Green, English Breakfast, Moroccan Mint, Hibiscus Berry, "
            "Masala) lined up. Shelf 3: white matcha pouch + dark "
            "charcoal Coastal Chai tin. All packaging shows the "
            "Coastal flying-stork mark prominently. Soft directional "
            "warehouse light, slight aged-paper texture in the background "
            "wall. Slow subtle camera push-in to suggest depth and "
            "abundance. NO people in frame — just product on shelves. "
            "NO customer."
        ),
    },
    {
        "slug": "clip-06-order",
        "duration_s": 8,
        "scene": (
            "Sal_Ang at his wooden counter at the Coastal pop-up. Sal is "
            "in COMPLETE Coastal Boomer_Ang canon uniform: cream linen "
            "long-sleeve work jacket sleeves rolled to mid-forearm; "
            "right-chest stacked COASTAL/BREWING/CO patch in dark sepia; "
            "left-chest small Made in PLR circular badge above a small "
            "BLACK rectangular name badge reading 'SAL' in cream "
            "lettering; deep coastal-amber CORP half-apron with "
            "white-on-amber square 'CORP' patch on upper-left chest of "
            "the apron (patch shows a small flying-stork mark above the "
            "'CORP' text); BLACK TACTICAL VISOR across his eyes with "
            "'SAL' GLOWING in ORANGE LED block letters centered on the "
            "visor; BLACK CLOTH MASK covering the entire lower half of "
            "his face from below the visor down past the chin — NO eyes, "
            "NO nose, NO mouth, NO chin, NO facial features visible AT "
            "ALL beyond the visor and mask, only the hairline above the "
            "visor and the medium-thick locs/braids pulled back behind; "
            "high-collar dark charcoal under-shirt visible at neck above "
            "the open jacket; cream/khaki chinos; brown leather belt; "
            "gold watch on right wrist; dark beaded bracelet on right "
            "wrist. Camera at chest height. Sal's hands write in a "
            "small leather pocket notebook on the counter, then rest on "
            "a cream Coastal coffee bag positioned next to a copper "
            "Ethiopian coffee pot. Behind Sal: the canonical 'COFFEE "
            "TEA MATCHA PURPOSE' wooden sign + COASTAL BREWING CO "
            "banner with the flying stork. Soft golden-hour light. NO "
            "customer in frame."
        ),
    },
    {
        "slug": "clip-07-pack-ship",
        "duration_s": 7,
        "scene": (
            "A Coastal team member in FULL SHIP uniform canon at a "
            "wooden packing bench. Uniform: cream linen long-sleeve "
            "jacket sleeves rolled, right-chest stacked COASTAL/BREWING/CO "
            "patch in dark sepia, kraft-brown SHIP half-apron with "
            "multi-pocket tool-belt feel and a white-on-kraft 'SHIP' "
            "square patch on upper-left chest (patch has a small "
            "flying-stork mark above 'SHIP' text); BLACK TACTICAL VISOR "
            "across the eyes with 'SHIP' GLOWING ORANGE LED block "
            "letters centered; BLACK CLOTH MASK covering entire lower "
            "face — NO eyes, NO nose, NO mouth, NO facial features "
            "visible AT ALL; cream/khaki chinos, brown leather belt; "
            "packing tape on a fingertip. Hands take a freshly labeled "
            "cream Coastal coffee bag (flying-stork brand mark "
            "prominent), slide it into a kraft-brown shipping box, peel "
            "a USPS shipping label off a label printer, smooth the "
            "label onto the box. Stacks of cream Coastal bags + tea "
            "tins visible in the background. Soft directional light "
            "from a high warehouse window. NO customer."
        ),
    },
    {
        "slug": "clip-08-outbound",
        "duration_s": 6,
        "scene": (
            "A wooden loading dock in late afternoon golden-hour light. "
            "Multiple Coastal Brewing Co. shipping boxes stacked on a "
            "wooden pallet — kraft-brown corrugated cardboard boxes "
            "with the Coastal flying-stork brand mark printed clearly "
            "on the side of each box. A USPS or UPS truck visible in "
            "the background, parked at the dock with rear doors open. "
            "Clean, practical scene. NO people in frame — the carrier "
            "driver is implied, not shown. Slight morning steam from "
            "coastal air rising. Slow subtle camera dolly toward the "
            "stacked boxes. The brand-marked boxes ready for outbound "
            "are the visual hero. NO customer."
        ),
    },
]


def _validate_env() -> None:
    if not KIE_AI_API_KEY:
        sys.exit("ERROR: KIE_AI_API_KEY not set.")


def _build_prompt(clip: dict) -> str:
    return (
        f"VIDEO CLIP: Coastal Brewing Co. process journey — {clip['slug']}\n\n"
        f"BRAND CANON (LOAD-BEARING)\n{BRAND_REGISTER}\n\n"
        f"REFERENCE IMAGES\n"
        f"- input_urls[0]: Sal_Ang canonical scene — establishes the "
        f"Coastal Lowcountry hospitality lighting, palette, wooden-counter "
        f"context, and the Boomer_Ang uniform canon (visor + cloth mask + "
        f"cream linen jacket).\n"
        f"- input_urls[1]: Official Coastal flying-stork logo — brand mark "
        f"reference. Reproduce on every bag, tin, package, banner, and "
        f"signage element shown.\n\n"
        f"SCENE\n{clip['scene']}\n\n"
        f"DURATION: {clip['duration_s']} seconds\n"
        f"FRAME: 16:9 cinematic, 720p, smooth contemplative camera motion\n\n"
        f"COMPLIANCE (LOAD-BEARING)\n"
        f"- NO customer visible anywhere in the frame. No customer faces, "
        f"hands, phones, porches, kitchens, or homes. The customer is "
        f"implied, never shown.\n"
        f"- Any Boomer_Ang team member visible MUST wear the BLACK "
        f"TACTICAL VISOR + BLACK CLOTH MASK combination so that NO "
        f"facial features (no eyes, no nose, no mouth, no chin) are "
        f"visible. Only the hairline above the visor shows.\n"
        f"- Any Coastal brand mark visible MUST match the official logo "
        f"(input_urls[1]): flying stork in mid-flight (wings up), stacked "
        f"COASTAL / BREWING / CO. heavy-serif wordmark beneath. Never a "
        f"wading-bird stance.\n"
        f"- NO on-screen text. No captions, no overlay typography, no "
        f"labels written into the scene. Generate visuals only — text "
        f"is added in post-production.\n"
        f"- Team uniforms match the patch and apron colors specified "
        f"in the brand canon block above.\n"
        f"- NO alternate brand names, NO other coffee-company marks, NO "
        f"watermarks, NO competitor branding."
    )


def _generate_via_kie(clip: dict, output_path: Path, model: str) -> tuple[bool, str]:
    """Returns (ok, error_message_or_empty)."""
    headers = {
        "Authorization": f"Bearer {KIE_AI_API_KEY}",
        "Content-Type": "application/json",
    }
    # Seedance accepts duration as integer 4-15 seconds; clamp.
    duration = max(4, min(15, int(clip["duration_s"])))
    create_payload = {
        "model": model,
        "input": {
            "prompt": _build_prompt(clip),
            # Kie.ai Seedance uses `reference_image_urls` (max 9 items),
            # NOT `input_urls`. Schema: docs.kie.ai/market/bytedance/seedance-2
            "reference_image_urls": [SAL_REFERENCE_URL, COASTAL_LOGO_REFERENCE_URL],
            "aspect_ratio": "16:9",
            "duration": duration,
            # `seedance-2-fast` may cap at 720p; safe default for all variants.
            "resolution": "720p",
        },
    }
    try:
        r = requests.post(KIE_CREATE_TASK_ENDPOINT, json=create_payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        return False, f"createTask request failed: {e}"
    if r.status_code != 200:
        return False, f"createTask HTTP {r.status_code}: {r.text[:200]}"
    data = r.json().get("data") or {}
    task_id = data.get("taskId")
    if not task_id:
        # Some Kie.ai error responses come back at the outer level
        msg = r.json().get("msg") or r.json().get("message") or "no taskId"
        return False, f"createTask returned no taskId: {msg}"
    # Poll up to 8 minutes (Seedance can take 3-6 min for 8s 1080p)
    for _ in range(96):  # 96 × 5s = 8 min
        time.sleep(5)
        try:
            rr = requests.get(
                KIE_RECORD_INFO_ENDPOINT,
                params={"taskId": task_id},
                headers=headers,
                timeout=15,
            )
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
                return False, f"state=success but no resultUrls in {result}"
            video_url = urls[0]
            try:
                vr = requests.get(video_url, timeout=120)
                vr.raise_for_status()
                output_path.write_bytes(vr.content)
                return True, ""
            except requests.RequestException as e:
                return False, f"video download failed: {e}"
        if state == "fail":
            return False, f"state=fail: {rec.get('errorMessage', '(no message)')}"
    return False, "polled 8min, no completion"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--only", help="Run only this slug")
    p.add_argument("--list", action="store_true", help="List clip slugs and exit")
    p.add_argument(
        "--model",
        help="Override the Kie.ai model slug (default tries fallback chain)",
    )
    args = p.parse_args()

    if args.list:
        for c in CLIPS:
            print(f"{c['slug']:40} {c['duration_s']}s")
        return

    _validate_env()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    targets = CLIPS
    if args.only:
        targets = [c for c in CLIPS if c["slug"] == args.only]
        if not targets:
            sys.exit(f"unknown slug: {args.only}")

    n = len(targets)
    models_to_try = [args.model] if args.model else MODEL_FALLBACK_CHAIN

    print(f"Output dir: {OUTPUT_DIR}")
    print(f"Reference URLs:")
    print(f"  Sal scene:    {SAL_REFERENCE_URL}")
    print(f"  Coastal logo: {COASTAL_LOGO_REFERENCE_URL}")
    print(f"Models to try (in order): {models_to_try}")
    print(f"\nGenerating {n} customer-journey clip(s)\n")

    succeeded = 0
    failed = 0
    last_working_model: str | None = None
    for clip in targets:
        slug = clip["slug"]
        out = OUTPUT_DIR / f"{slug}.mp4"
        # Try the last-known-working model first if we have one
        ordered = (
            [last_working_model] + [m for m in models_to_try if m != last_working_model]
            if last_working_model
            else list(models_to_try)
        )
        ok = False
        last_err = ""
        for model in ordered:
            t0 = time.monotonic()
            ok, err = _generate_via_kie(clip, out, model)
            dt = time.monotonic() - t0
            if ok:
                kb = out.stat().st_size // 1024
                print(f"  [{slug}] ... OK ({dt:.1f}s, {kb} KB, {model}) -> {out.name}")
                last_working_model = model
                break
            last_err = err
            # Only fall through on slug-related errors; bail on auth or other
            if "404" not in err and "model" not in err.lower() and "unsupported" not in err.lower():
                print(f"  [{slug}] ... FAILED ({model}): {err}")
                break
            print(f"  [{slug}] ... model {model} unavailable, trying next...")
        if ok:
            succeeded += 1
        else:
            failed += 1
            print(f"  [{slug}] ... FAILED — last error: {last_err}")

    print()
    print("=" * 60)
    print(f"Succeeded: {succeeded}/{n}")
    print(f"Failed:    {failed}")
    if last_working_model:
        print(f"Working model: {last_working_model}")
    print(f"\nOutputs: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
