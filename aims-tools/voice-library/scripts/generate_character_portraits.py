#!/usr/bin/env python3
"""Generate Coastal Sales-team character portraits via Ideogram v3 API.

Uses Sal_Ang as the canonical character reference and produces brand-consistent
portraits for the 12 other team members + Luc_Ang per design.md §11 canon.

Outputs to iCloud Claude Code folder for owner review.

Usage:
    IDEOGRAM_API_KEY=$(ssh myclaw-vps 'docker exec openclaw-sop5-openclaw-1 env' | grep -i Ideogram_API_Key | cut -d= -f2-) \\
    python aims-tools/voice-library/scripts/generate_character_portraits.py

Notes:
    - Sal_Ang is NOT regenerated (canonical reference image already exists).
    - Each portrait costs ~$0.06 at DEFAULT speed; 12 portraits = ~$0.72.
    - Set IDEOGRAM_RENDER_SPEED=TURBO for faster/cheaper iteration ($0.025 each).
    - Re-run with --only=<cast_id> to regenerate a single character.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import requests

# ─── Config ────────────────────────────────────────────────────────────────

IDEOGRAM_API_KEY = os.environ.get("IDEOGRAM_API_KEY") or os.environ.get(
    "Ideogram_API_Key"
)
ENDPOINT = "https://api.ideogram.ai/v1/ideogram-v3/generate"
RENDERING_SPEED = os.environ.get("IDEOGRAM_RENDER_SPEED", "DEFAULT")  # TURBO | DEFAULT | QUALITY

HOME = Path.home()
SAL_REFERENCE_PATH = HOME / "iCloudPhotos" / "Photos" / "Coffee Shop Sal_Ang.png"
OUTPUT_DIR = (
    HOME
    / "iCloudDrive"
    / "ACHIEVEMOR_"
    / "Projects_"
    / "The Deploy Platform_"
    / "Claude Code"
    / "character-portraits"
)

# ─── Shared canon (from design.md §11.1, §11.4) ────────────────────────────

SHARED_SCENE = (
    "Setting: Coastal Brewing Co. — coastal South Carolina Lowcountry pop-up "
    "coffee bar. Cream/parchment + sepia ink palette. Warm golden-hour lighting. "
    "Wooden counter dressed with: cream branded coffee bag (stork glyph + 'COASTAL "
    "BREWING / CO' stacked text), small cylindrical cream-colored tea/matcha tins "
    "with brown bands (MATCHA / LOWCOUNTRY TEA / CHAI labels), small ceramic "
    "Ethiopian-pattern coffee cups on a wooden tray, a long-spouted copper "
    "Ethiopian coffee pot. Wooden vertical sign reading 'COFFEE. TEA. MATCHA. "
    "PURPOSE.' Banner above reads 'COASTAL BREWING CO — Nothing chemically, ever.' "
    "with hand-drawn line-art stork. Branded counter base wall with stork + "
    "stacked 'COASTAL BREWING CO' wordmark + 'Nothing chemically, ever.' tagline. "
    "Palm fronds and marsh visible behind. Cinematic photography, professional, "
    "warm hospitality register, NOT corporate."
)

UNIFORM_MEN = (
    "Wearing the canonical Coastal Brewing uniform: cream / off-white linen "
    "long-sleeve work jacket (sleeves rolled to mid-forearm, partially open at "
    "chest); right-chest carries stacked 'COASTAL / BREWING / CO' sepia stamp "
    "embroidery; left-chest carries a small circular sepia 'Made in PLR' badge "
    "above a black rectangular name badge with cream-colored letters reading "
    "'{name}'; black tactical visor across the eyes with the name '{name}' in "
    "glowing orange LED-style block letters (orange with white outline); "
    "high-collar dark charcoal under-shirt visible at neck above the open jacket; "
    "cream / khaki chinos; brown leather belt; gold-toned wristwatch on right "
    "wrist. Clean, professional, hospitality-grade."
)

UNIFORM_WOMEN_BELLE = (
    "Wearing a cream Southern Belle dress — fitted bodice, modest neckline, "
    "knee-or-tea-length skirt, cap or short sleeves, subtle floral accents "
    "(jasmine motif allowed). Over the dress: a cream linen apron, ribbon-tied "
    "at the waist, with a small embroidered Coastal Brewing stork-and-wordmark "
    "patch on the apron chest pocket. Small black rectangular name tag with "
    "cream letters reading '{name}' pinned at the dress collar."
)

UNIFORM_WOMEN_SUNDRESS = (
    "Wearing a knee-length cream cotton sun dress, simple silhouette. Over the "
    "dress: a cream linen apron ribbon-tied at the waist, with a small "
    "embroidered Coastal Brewing stork-and-wordmark patch. Small black "
    "rectangular name tag with cream letters reading '{name}' pinned at the "
    "dress collar."
)

# ─── Cast specs (from design.md §11.5 + persona files) ─────────────────────

CHARACTERS: list[dict] = [
    {
        "id": "lou_ang",
        "display_name": "Lou_Ang",
        "name_tag": "LOU",
        "gender": "female",
        "race": "mixed-race",
        "hair": "shoulder-length French braids",
        "uniform": "sundress",
        "scene_cue": (
            "behind the register counter, smiling warmly at a regular customer "
            "she just recognized; bright Lowcountry alto front-of-house energy"
        ),
    },
    {
        "id": "tate_ang",
        "display_name": "Tate_Ang",
        "name_tag": "TATE",
        "gender": "male",
        "race": "Black",
        "hair": (
            "low Caesar haircut with a half-moon part / 'C'-shaped curve shaved "
            "into the left temple, tapered low fade, clean hairline"
        ),
        "uniform": "men",
        "scene_cue": (
            "at the pour-over station with a metal kettle, focused on the brew, "
            "syllable-timed percussive cadence implied"
        ),
    },
    {
        "id": "wren_ang",
        "display_name": "Wren_Ang",
        "name_tag": "WREN",
        "gender": "female",
        "race": "Black",
        "hair": "shoulder-length French braids",
        "uniform": "sundress",
        "scene_cue": (
            "consulting with a customer at the counter, leaning slightly forward "
            "to listen, soft mezzo conversational warmth"
        ),
    },
    {
        "id": "holt_ang",
        "display_name": "Holt_Ang",
        "name_tag": "HOLT",
        "gender": "male",
        "race": "White",
        "hair": "short side-part, neatly combed, clean low fade-to-side",
        "uniform": "men",
        "scene_cue": (
            "at the tasting bar, arms crossed in a relaxed Charleston-gentleman "
            "stance, comfortable with silence, surveying the cup he just poured"
        ),
    },
    {
        "id": "eliza_ang",
        "display_name": "Eliza_Ang",
        "name_tag": "ELIZA",
        "gender": "female",
        "race": "White",
        "hair": "shoulder-length French braids",
        "uniform": "belle",
        "scene_cue": (
            "preparing afternoon tea, polite warm inflection, Charleston "
            "debutante-school polish meeting Lowcountry hospitality"
        ),
    },
    {
        "id": "marcus_ang",
        "display_name": "Marcus_Ang",
        "name_tag": "MARCUS",
        "gender": "male",
        "race": "Black",
        "hair": (
            "low Caesar haircut with a half-moon part / 'C'-shaped curve shaved "
            "into the left temple, tapered low fade, clean hairline"
        ),
        "uniform": "men",
        "scene_cue": (
            "behind the historic-district shop counter at unhurried Savannah "
            "pace, knowing register, warm baritone presence"
        ),
    },
    {
        "id": "naya_ang",
        "display_name": "Naya_Ang",
        "name_tag": "NAYA",
        "gender": "female",
        "race": "Black",
        "hair": "shoulder-length French braids",
        "uniform": "sundress",
        "scene_cue": (
            "morning shift, easy laugh, calling a regular by name as they walk "
            "through the door; bright Savannah mezzo, sister-of-the-block warmth"
        ),
    },
    {
        "id": "pip_ang",
        "display_name": "Pip_Ang",
        "name_tag": "PIP",
        "gender": "male",
        "race": "White",
        "hair": "short side-part, slightly polished, clean fade",
        "uniform": "men",
        "scene_cue": (
            "harbor-view tasting station, articulating each word fully, "
            "trans-Atlantic Charleston/British register, pause discipline visible "
            "in the posture"
        ),
    },
    {
        "id": "vi_ang",
        "display_name": "Vi_Ang",
        "name_tag": "VI",
        "gender": "female",
        "race": "White",
        "hair": "shoulder-length French braids",
        "uniform": "belle",
        "scene_cue": (
            "at the tea-tasting bar with a small ceramic cup, light dry-wit "
            "smile, finishing-school polish meeting Lowcountry warmth"
        ),
    },
    {
        "id": "trey_ang",
        "display_name": "Trey_Ang",
        "name_tag": "TREY",
        "gender": "male",
        "race": "White",
        "hair": "short side-part / clean fade-to-side, contemporary college cut",
        "uniform": "men",
        "scene_cue": (
            "quick fast-shift student energy at the front counter, friendly and "
            "fast, knowing the menu cold; CCU sophomore vibe"
        ),
    },
    {
        "id": "mads_ang",
        "display_name": "Mads_Ang",
        "name_tag": "MADS",
        "gender": "female",
        "race": "White",
        "hair": "shoulder-length French braids",
        "uniform": "sundress",
        "scene_cue": (
            "summer-break shift energy, genuine bright enthusiasm, prepping a "
            "matcha; UGA student vibe"
        ),
    },
    {
        "id": "luc_ang",
        "display_name": "Luc_Ang",
        "name_tag": "LUC",
        "gender": "male",
        "race": "White",
        "hair": "short side-part, slightly older / mid-30s register, clean groomed",
        "uniform": "men_no_visor",  # Luc is back-office, no visor
        "scene_cue": (
            "at a small back-office desk with the catalog open, a vintage HP-12C "
            "calculator beside a notebook, calm low-key technical Lowcountry "
            "register; the bundle math is happening in his head"
        ),
    },
]


# ─── Prompt builder ────────────────────────────────────────────────────────


def build_prompt(char: dict) -> str:
    name = char["name_tag"]
    if char["uniform"] == "men":
        attire = UNIFORM_MEN.format(name=name)
    elif char["uniform"] == "men_no_visor":
        attire = (
            UNIFORM_MEN.format(name=name).replace(
                (
                    "; black tactical visor across the eyes with the name "
                    f"'{name}' in glowing orange LED-style block letters "
                    "(orange with white outline)"
                ),
                "",
            )
            + " (No visor — back-office attire.)"
        )
    elif char["uniform"] == "belle":
        attire = UNIFORM_WOMEN_BELLE.format(name=name)
    elif char["uniform"] == "sundress":
        attire = UNIFORM_WOMEN_SUNDRESS.format(name=name)
    else:
        raise ValueError(f"Unknown uniform spec: {char['uniform']}")

    parts = [
        (
            f"Photorealistic environmental portrait. {char['gender'].title()} "
            f"{char['race']} barista named {char['display_name']}, working at "
            f"Coastal Brewing Co. Hair: {char['hair']}."
        ),
        attire,
        f"Scene: {char['scene_cue']}.",
        SHARED_SCENE,
        (
            "Aspect: 3:4 portrait. Cinematic. Authentic. "
            "Warm golden-hour Lowcountry light. NOT a stock photo. "
            "Match the visual register of the canonical reference image: "
            "specifically the cream/parchment color palette, the warm wood "
            "and copper accents, the marsh and palm-frond background, and the "
            "branded counter dressing."
        ),
    ]
    return " ".join(parts)


# ─── API call ──────────────────────────────────────────────────────────────


def generate_portrait(char: dict, *, attempt: int = 1) -> Path:
    if not IDEOGRAM_API_KEY:
        raise SystemExit(
            "IDEOGRAM_API_KEY not set. Source from openclaw vault: "
            "ssh myclaw-vps 'docker exec openclaw-sop5-openclaw-1 env | grep -i Ideogram_API_Key'"
        )
    if not SAL_REFERENCE_PATH.exists():
        raise SystemExit(f"Sal reference image not found: {SAL_REFERENCE_PATH}")

    prompt = build_prompt(char)
    headers = {"Api-Key": IDEOGRAM_API_KEY}

    with open(SAL_REFERENCE_PATH, "rb") as ref_f:
        files = {
            "character_reference_images": (
                "sal_ang.png",
                ref_f,
                "image/png",
            ),
        }
        data = {
            "prompt": prompt,
            "rendering_speed": RENDERING_SPEED,
            "aspect_ratio": "3x4",
            "style_type": "REALISTIC",
            "num_images": "1",
        }
        resp = requests.post(
            ENDPOINT, headers=headers, files=files, data=data, timeout=120
        )

    if resp.status_code != 200:
        body = resp.text[:500]
        raise RuntimeError(
            f"[{char['id']}] Ideogram API {resp.status_code}: {body}"
        )

    result = resp.json()
    image_url = result["data"][0]["url"]

    img_resp = requests.get(image_url, timeout=60)
    img_resp.raise_for_status()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / f"{char['id']}.png"
    out_path.write_bytes(img_resp.content)
    return out_path


# ─── Driver ────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--only",
        help="Generate only this cast_id (debug single character)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List the cast roster and exit",
    )
    args = parser.parse_args()

    print(f"Render speed: {RENDERING_SPEED}")
    print(f"Output dir:   {OUTPUT_DIR}")
    print(f"Sal ref:      {SAL_REFERENCE_PATH}")
    print()

    if args.list:
        for c in CHARACTERS:
            print(f"  - {c['id']:14s}  {c['display_name']:14s} ({c['gender']}, {c['race']})")
        return

    if args.only:
        targets = [c for c in CHARACTERS if c["id"] == args.only]
        if not targets:
            print(f"Unknown cast_id: {args.only}", file=sys.stderr)
            print("Available:", file=sys.stderr)
            for c in CHARACTERS:
                print(f"  - {c['id']}", file=sys.stderr)
            sys.exit(1)
    else:
        targets = CHARACTERS

    cost_per_image = {"TURBO": 0.025, "DEFAULT": 0.06, "QUALITY": 0.08}.get(
        RENDERING_SPEED, 0.06
    )
    print(f"Generating {len(targets)} portrait(s) — estimated cost: ${cost_per_image * len(targets):.2f}")
    print()

    succeeded: list[str] = []
    failed: list[tuple[str, str]] = []

    for char in targets:
        print(f"  [{char['id']}] {char['display_name']} ...", end="", flush=True)
        try:
            t0 = time.time()
            path = generate_portrait(char)
            elapsed = time.time() - t0
            size_kb = path.stat().st_size // 1024
            print(f" OK ({elapsed:.1f}s, {size_kb} KB) -> {path.name}")
            succeeded.append(char["id"])
        except Exception as e:
            print(f" FAILED: {e}")
            failed.append((char["id"], str(e)))

    print()
    print("=" * 60)
    print(f"Succeeded: {len(succeeded)}/{len(targets)}")
    print(f"Failed:    {len(failed)}")
    if failed:
        for cid, err in failed:
            print(f"  - {cid}: {err}")
    print()
    print(f"Outputs: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
