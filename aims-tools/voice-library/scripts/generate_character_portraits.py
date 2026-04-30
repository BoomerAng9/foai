#!/usr/bin/env python3
"""Generate Coastal Sales-team character portraits via Ideogram v3 API.

Uses Sal_Ang as the canonical character reference and produces brand-consistent
portraits for the 12 other team members + Bun_Ang per design.md §11 canon.

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
import json
import os
import sys
import time
from pathlib import Path

import requests

# ─── Config ────────────────────────────────────────────────────────────────

IDEOGRAM_API_KEY = os.environ.get("IDEOGRAM_API_KEY") or os.environ.get(
    "Ideogram_API_Key"
)
IDEOGRAM_ENDPOINT = "https://api.ideogram.ai/v1/ideogram-v3/generate"
RENDERING_SPEED = os.environ.get("IDEOGRAM_RENDER_SPEED", "DEFAULT")  # TURBO | DEFAULT | QUALITY

# OpenAI gpt-image-1 ("GPT Image 2.0" per `feedback_gpt_image_2_standard.md`).
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/edits"

# Kie.ai gpt-image-2-image-to-image — Image Gen 2.0 with reference image.
# Default provider per owner directive 2026-04-29 (after Ideogram canon-fail
# + OpenAI direct billing-limit). Verified working 2026-04-29: Sal-as-reference
# yields canon-aligned environmental portraits at ~$0.05/image, 2-3 min each.
KIE_AI_API_KEY = os.environ.get("KIE_AI_API_KEY") or os.environ.get("Kie_Ai_Api_Key")
KIE_CREATE_TASK_ENDPOINT = "https://api.kie.ai/api/v1/jobs/createTask"
KIE_RECORD_INFO_ENDPOINT = "https://api.kie.ai/api/v1/jobs/recordInfo"
KIE_GPT_IMAGE_2_MODEL = "gpt-image-2-image-to-image"

# Public URL for the canonical Sal_Ang reference. Required by Kie.ai's
# input_urls parameter (must be publicly reachable). Hosted on the foai
# repo's `main` branch at GitHub raw.
SAL_REFERENCE_URL = (
    "https://raw.githubusercontent.com/BoomerAng9/foai/main/"
    "chicken-hawk/hawk-ui/public/chicken-hawk/coffee-shop-sal-ang.png"
)

HOME = Path.home()
SAL_REFERENCE_PATH = HOME / "iCloudPhotos" / "Photos" / "Coffee Shop Sal_Ang.png"
# Illa_Ang reference shows the fully-covered Boomer_Ang canon (visor + face
# coverage) per `~/.claude/skills/iller-ang/intro/assets/illa.png`. Including
# it as a second character_reference helps Ideogram render the full coverage
# rule that single-image reference (Sal alone) wasn't enforcing.
ILLA_REFERENCE_PATH = HOME / ".claude" / "skills" / "iller-ang" / "intro" / "assets" / "illa.png"
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

# Boomer_Ang anti-skin canon — LOAD-BEARING for every Coastal cast portrait.
# Owner directive 2026-04-29 (verbatim): "Every boomer_ang is supposed to have
# its face and neck covered. There should be no skin showing for the
# boomer_angs. You only show the hair. And the the forehead skin. And the
# name the the name of the boomer_ang is is shown inside the visor."
#
# The canonical Sal_Ang reference (`Coffee Shop Sal_Ang.png`) is the visual
# law: visor + black mask cover everything except hair + forehead. Faces are
# NOT shown. No expressions. No smiles. No visible mouths, noses, cheeks,
# jaws, or necks. The name appears INSIDE the visor in glowing orange LED
# block letters with white outline. The "ANG" patch sits on the right chest
# area in matching glowing orange. Skin coverage is non-negotiable.
NO_SKIN_RULE = (
    "CRITICAL — face coverage rule (Coastal Brewing Boomer_Ang canon, "
    "load-bearing): the TOP of the head is NOT covered — hair is fully "
    "visible, and a band of forehead skin sits between the hair and the visor. "
    "From eye-line DOWNWARD, the entire face and neck are covered by a "
    "TWO-PIECE HARD TACTICAL VISOR SYSTEM made of matte-black structured "
    "polymer (military-grade hard plastic, slight sheen, NOT cloth, NOT "
    "fabric, NOT a soft mask):\n"
    "  (1) Upper visor: a horizontal rectangular tactical band across the "
    "eyes containing an LED display showing the character's NAME in glowing "
    "orange block letters with white outline (e.g., 'LOU', 'TATE', "
    "'MARCUS'). Hard rigid surface, NOT goggles.\n"
    "  (2) Lower visor: a separate but connected hard polymer faceplate "
    "covering nose, mouth, cheeks, chin, jaw, and neck — tucking under the "
    "jacket / dress collar. Same matte-black tactical material as the upper "
    "visor. NO cloth, NO fabric texture, NO mask folds. Rigid structural "
    "panel, fighter-pilot oxygen-mask grade.\n"
    "Match the canonical Sal_Ang reference (Coffee Shop Sal_Ang.png): "
    "Sal shows braids on top of his head + forehead skin + horizontal "
    "orange-LED 'SAL' visor across the eyes + structured face cover below. "
    "The top of the head IS NOT a helmet — hair shows naturally. NO visible "
    "mouth, lips, nose, cheeks, chin, jaw, neck skin, or facial expression "
    "below the visor."
)

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
    "embroidery PLUS a small 'ANG' chest patch in glowing orange block letters "
    "with white outline; left-chest carries a small circular sepia 'Made in PLR' "
    "badge above a black rectangular name badge with cream-colored letters "
    "reading '{name}'. The face is covered by a single continuous HARD "
    "TACTICAL VISOR (matte-black structured polymer, fighter-pilot-faceplate "
    "texture — NOT cloth) that begins at the eye-line as an orange-glowing "
    "name screen reading '{name}' in LED-style block letters with white outline "
    "and extends downward as one rigid faceplate covering nose, mouth, chin, "
    "jaw, and neck — tucking under the jacket collar. High-collar dark charcoal "
    "under-shirt; cream / khaki chinos; brown leather belt; gold-toned "
    "wristwatch on right wrist. Clean, professional, hospitality-grade."
)

UNIFORM_WOMEN_BELLE = (
    "Wearing a cream Southern Belle dress — fitted bodice, modest neckline, "
    "knee-or-tea-length skirt, cap or short sleeves, subtle floral accents "
    "(jasmine motif allowed). Over the dress: a cream linen apron, ribbon-tied "
    "at the waist, with a small embroidered Coastal Brewing stork-and-wordmark "
    "patch on the apron chest pocket PLUS a small 'ANG' chest patch in glowing "
    "orange block letters with white outline. Small black rectangular name tag "
    "with cream letters reading '{name}' pinned at the dress collar. The face "
    "is covered by a single continuous HARD TACTICAL VISOR (matte-black "
    "structured polymer, fighter-pilot-faceplate texture — NOT cloth) that "
    "begins at the eye-line as an orange-glowing name screen reading '{name}' "
    "in LED-style block letters with white outline and extends downward as one "
    "rigid faceplate covering nose, mouth, chin, jaw, and neck — tucking under "
    "the dress collar."
)

UNIFORM_WOMEN_SUNDRESS = (
    "Wearing a knee-length cream cotton sun dress, simple silhouette. Over the "
    "dress: a cream linen apron ribbon-tied at the waist, with a small "
    "embroidered Coastal Brewing stork-and-wordmark patch PLUS a small 'ANG' "
    "chest patch in glowing orange block letters with white outline. Small "
    "black rectangular name tag with cream letters reading '{name}' pinned at "
    "the dress collar. The face is covered by a single continuous HARD "
    "TACTICAL VISOR (matte-black structured polymer, fighter-pilot-faceplate "
    "texture — NOT cloth) that begins at the eye-line as an orange-glowing "
    "name screen reading '{name}' in LED-style block letters with white "
    "outline and extends downward as one rigid faceplate covering nose, mouth, "
    "chin, jaw, and neck — tucking under the dress collar."
)

# ─── Cast specs (from design.md §11.5 + persona files) ─────────────────────

# Cast specs — names follow the canonical Boomer_Ang naming convention:
# `<function-prefix>_Ang` where the prefix abbreviates the character's ROLE
# on the team (per `feedback_boomer_ang_names_function_not_human_2026_04_29.md`).
# Sal_Ang = Sal(es)_Ang. NEVER human first names.
#
# Sal is the canonical reference; not regenerated. Other 12 sales-team roles
# + 3 ops/back-office roles below.
CHARACTERS: list[dict] = [
    # ─── Sales-team voice carousel (12) ────────────────────────────────
    {
        "id": "hos_ang",
        "display_name": "Hos_Ang",
        "name_tag": "HOS",
        "function": "Host / front-of-house",
        "gender": "male",
        "race": "mixed-race",
        "hair": "medium-length braids pulled back, similar register to Sal_Ang",
        "uniform": "men",
        "scene_cue": (
            "standing behind the register counter, posture turned slightly "
            "toward the door as a regular walks in, hands resting on the counter"
        ),
    },
    {
        "id": "bar_ang",
        "display_name": "Bar_Ang",
        "name_tag": "BAR",
        "function": "Pour-over barista",
        "gender": "male",
        "race": "Black",
        "hair": (
            "low Caesar haircut with a half-moon part / 'C'-shaped curve shaved "
            "into the left temple, tapered low fade, clean hairline — visible "
            "above the visor"
        ),
        "uniform": "men",
        "scene_cue": (
            "at the pour-over station, holding a metal kettle, body angled toward "
            "the brewer, focused posture"
        ),
    },
    {
        "id": "con_ang",
        "display_name": "Con_Ang",
        "name_tag": "CON",
        "function": "Consultative cup-finder",
        "gender": "female",
        "race": "Black",
        "hair": "shoulder-length French braids visible above the visor",
        "uniform": "sundress",
        "scene_cue": (
            "at the counter near a customer, leaning slightly forward in a "
            "consultative posture, one hand gesturing toward the tea tins"
        ),
    },
    {
        "id": "tas_ang",
        "display_name": "Tas_Ang",
        "name_tag": "TAS",
        "function": "Tasting-bar gentleman",
        "gender": "male",
        "race": "White",
        "hair": "short side-part, neatly combed, clean low fade-to-side, visible above the visor",
        "uniform": "men",
        "scene_cue": (
            "at the tasting bar, arms crossed in a relaxed gentleman stance, "
            "body angled toward a coffee cup on the counter"
        ),
    },
    {
        "id": "tea_ang",
        "display_name": "Tea_Ang",
        "name_tag": "TEA",
        "function": "Afternoon-tea hostess",
        "gender": "female",
        "race": "White",
        "hair": "shoulder-length French braids visible above the visor",
        "uniform": "belle",
        "scene_cue": (
            "preparing afternoon tea — both hands working with a teapot and "
            "small ceramic cups, polished poised posture"
        ),
    },
    {
        "id": "cou_ang",
        "display_name": "Cou_Ang",
        "name_tag": "COU",
        "function": "Counter / Savannah-shop register",
        "gender": "male",
        "race": "Black",
        "hair": (
            "low Caesar haircut with a half-moon part / 'C'-shaped curve shaved "
            "into the left temple, tapered low fade, clean hairline — visible "
            "above the visor"
        ),
        "uniform": "men",
        "scene_cue": (
            "behind a historic-district shop counter at unhurried Savannah "
            "pace, hands resting on the counter, body squared to the room"
        ),
    },
    {
        "id": "gre_ang",
        "display_name": "Gre_Ang",
        "name_tag": "GRE",
        "function": "Morning greeter",
        "gender": "female",
        "race": "Black",
        "hair": "shoulder-length French braids visible above the visor",
        "uniform": "sundress",
        "scene_cue": (
            "morning shift, body turned toward the door as a regular walks in, "
            "one hand raised in greeting, other hand on the counter"
        ),
    },
    {
        "id": "har_ang",
        "display_name": "Har_Ang",
        "name_tag": "HAR",
        "function": "Harbor-view tasting (trans-Atlantic register)",
        "gender": "male",
        "race": "White",
        "hair": "short side-part, slightly polished, clean fade — visible above the visor",
        "uniform": "men",
        "scene_cue": (
            "at a harbor-view tasting station, body squared to the counter, "
            "hands clasped behind the back in a polished trans-Atlantic stance"
        ),
    },
    {
        "id": "cur_ang",
        "display_name": "Cur_Ang",
        "name_tag": "CUR",
        "function": "Tea curator (finishing-school polish)",
        "gender": "female",
        "race": "White",
        "hair": "shoulder-length French braids visible above the visor",
        "uniform": "belle",
        "scene_cue": (
            "at the tea-tasting bar holding a small ceramic cup with both hands, "
            "polished finishing-school posture"
        ),
    },
    {
        "id": "reg_ang",
        "display_name": "Reg_Ang",
        "name_tag": "REG",
        "function": "Register / cashier (student-shift)",
        "gender": "male",
        "race": "White",
        "hair": "short side-part / clean fade-to-side, contemporary college cut, visible above the visor",
        "uniform": "men",
        "scene_cue": (
            "quick student-shift posture at the front counter, leaning slightly "
            "on the counter with one hand, the other hand gesturing toward the menu"
        ),
    },
    {
        "id": "mat_ang",
        "display_name": "Mat_Ang",
        "name_tag": "MAT",
        "function": "Matcha specialist",
        "gender": "female",
        "race": "White",
        "hair": "shoulder-length French braids visible above the visor",
        "uniform": "sundress",
        "scene_cue": (
            "summer-break shift, both hands working a matcha whisk over a small "
            "ceramic bowl, focused posture"
        ),
    },
    # ─── Back-office (1) ────────────────────────────────────────────────
    {
        "id": "bun_ang",
        "display_name": "Bun_Ang",
        "name_tag": "BUN",
        "function": "Bundle specialist (back-office)",
        "gender": "male",
        "race": "White",
        "hair": "short side-part, slightly older / mid-30s register, clean groomed",
        "uniform": "men",
        "scene_cue": (
            "at a small back-office desk with the catalog open, a vintage HP-12C "
            "calculator beside a notebook, calm posture; the bundle math is "
            "happening in his head"
        ),
    },
    # ─── Ops / wholesale / accounts (3 — owner directive 2026-04-29) ────
    {
        "id": "wsl_ang",
        "display_name": "Wsl_Ang",
        "name_tag": "WSL",
        "function": "Wholesale / bulk sales (works with the Sett badgers)",
        "gender": "female",
        "race": "Black",
        "hair": "shoulder-length French braids visible above the visor",
        "uniform": "sundress",
        "scene_cue": (
            "in the warehouse aisle between burlap coffee bag stacks and "
            "5-gallon twine-wrapped tea jars, holding a clipboard, body squared "
            "to a stack as if reviewing inventory; the canonical Boomer_Ang "
            "boomerang weapon visible at her hip"
        ),
    },
    {
        "id": "ret_ang",
        "display_name": "Ret_Ang",
        "name_tag": "RET",
        "function": "Returns / customer service",
        "gender": "female",
        "race": "White (California, ginger / red-hair, Irish-American features)",
        "hair": (
            "shoulder-length French braids in red / auburn (ginger), visible "
            "above the visor; freckled complexion (forehead skin only)"
        ),
        "uniform": "sundress",
        "scene_cue": (
            "at a returns / customer-service counter, two hands resting on a "
            "wrapped package, body squared to the customer side, calm steady "
            "posture; the small returns desk has a clipboard and a 'Returns' "
            "wooden sign in the same register as the COFFEE TEA MATCHA PURPOSE sign"
        ),
    },
    {
        "id": "acc_ang",
        "display_name": "Acc_Ang",
        "name_tag": "ACC",
        "function": "Accountant",
        "gender": "female",
        "race": "Asian American",
        "hair": "shoulder-length French braids visible above the visor",
        "uniform": "sundress",
        "scene_cue": (
            "at a small back-office desk with a ledger and a vintage HP-12C "
            "calculator, both hands working the calculator, body angled toward "
            "the desk in focused accounting posture"
        ),
    },
]


# ─── Prompt builder ────────────────────────────────────────────────────────


def build_prompt(char: dict) -> str:
    name = char["name_tag"]
    if char["uniform"] == "men":
        attire = UNIFORM_MEN.format(name=name)
    elif char["uniform"] == "belle":
        attire = UNIFORM_WOMEN_BELLE.format(name=name)
    elif char["uniform"] == "sundress":
        attire = UNIFORM_WOMEN_SUNDRESS.format(name=name)
    else:
        raise ValueError(f"Unknown uniform spec: {char['uniform']}")

    parts = [
        # NO_SKIN_RULE goes FIRST so the prompt's most-attended tokens carry it.
        NO_SKIN_RULE,
        (
            f"Photorealistic environmental portrait of a Coastal Brewing Co. "
            f"Boomer_Ang character named {char['display_name']}. The character "
            f"is {char['gender']}-presenting and {char['race']}. "
            f"Hair: {char['hair']}."
        ),
        attire,
        f"Scene / posture: {char['scene_cue']}.",
        SHARED_SCENE,
        (
            "Aspect: 3:4 portrait. Cinematic. Authentic. Warm golden-hour "
            "Lowcountry light. Match the visual register of the canonical "
            "reference image (Coffee Shop Sal_Ang): cream/parchment color "
            "palette, warm wood and copper accents, marsh and palm-frond "
            "background, branded counter dressing visible behind the "
            "character. Face coverage matches Sal exactly — hard tactical "
            "visor across the eyes (orange-glowing LED name display) AND a "
            "separate hard tactical visor piece covering nose, mouth, chin, "
            "jaw, neck (same matte-black structured polymer material — not "
            "cloth, not fabric). Hair and forehead skin visible above the "
            "upper visor. NEGATIVE: do not show a visible face, do not show "
            "lips, do not show a smile, do not show cheeks, do not show neck "
            "skin, do not render a soft cloth mask, do not render fabric "
            "texture on the face, do not render a beard — the lower face is "
            "HARD tactical-visor polymer, structured and rigid."
        ),
    ]
    return " ".join(parts)


# ─── API call ──────────────────────────────────────────────────────────────


def _generate_via_ideogram(char: dict) -> Path:
    if not IDEOGRAM_API_KEY:
        raise SystemExit(
            "IDEOGRAM_API_KEY not set. Source from openclaw vault: "
            "ssh myclaw-vps 'docker exec openclaw-sop5-openclaw-1 env | grep -i Ideogram_API_Key'"
        )

    prompt = build_prompt(char)
    headers = {"Api-Key": IDEOGRAM_API_KEY}

    # Ideogram v3 accepts ONE character_reference_image per request (verified
    # 2026-04-29: HTTP 400 "Only one character reference image is allowed per
    # request" when sending two). Sal_Ang is canonical.
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
            "magic_prompt": "OFF",
        }
        resp = requests.post(
            IDEOGRAM_ENDPOINT, headers=headers, files=files, data=data, timeout=120
        )

    if resp.status_code != 200:
        raise RuntimeError(
            f"[{char['id']}] Ideogram API {resp.status_code}: {resp.text[:500]}"
        )

    image_url = resp.json()["data"][0]["url"]
    img_resp = requests.get(image_url, timeout=60)
    img_resp.raise_for_status()

    out_path = OUTPUT_DIR / f"{char['id']}.png"
    out_path.write_bytes(img_resp.content)
    return out_path


def _generate_via_openai(char: dict) -> Path:
    """Generate via OpenAI gpt-image-1 ('GPT Image 2.0').

    Uses /v1/images/edits with the Sal_Ang reference as the input image
    (no mask) — gpt-image-1 treats this as visual context for generation.
    OpenAI quality 'high' renders match brand canon better than Ideogram's
    character-reference for the Boomer_Ang full-coverage rule.
    """
    if not OPENAI_API_KEY:
        raise SystemExit(
            "OPENAI_API_KEY not set. Source from openclaw vault: "
            "ssh myclaw-vps 'docker exec openclaw-sop5-openclaw-1 env | grep -i OPENAI_API_KEY'"
        )

    prompt = build_prompt(char)
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}

    with open(SAL_REFERENCE_PATH, "rb") as ref_f:
        files = [("image[]", ("sal_ang.png", ref_f, "image/png"))]
        data = {
            "model": "gpt-image-1",
            "prompt": prompt,
            "size": "1024x1536",  # 2:3 vertical (closest gpt-image-1 native to 3:4)
            "quality": "high",
            "n": "1",
            "output_format": "png",
        }
        resp = requests.post(
            OPENAI_IMAGE_ENDPOINT, headers=headers, files=files, data=data, timeout=180
        )

    if resp.status_code != 200:
        raise RuntimeError(
            f"[{char['id']}] OpenAI API {resp.status_code}: {resp.text[:600]}"
        )

    payload = resp.json()
    # gpt-image-1 returns base64 by default in `data[0].b64_json`
    import base64
    b64 = payload["data"][0].get("b64_json")
    if b64:
        out_bytes = base64.b64decode(b64)
    else:
        # Fall back to URL form if returned
        url = payload["data"][0]["url"]
        img_resp = requests.get(url, timeout=60)
        img_resp.raise_for_status()
        out_bytes = img_resp.content

    out_path = OUTPUT_DIR / f"{char['id']}.png"
    out_path.write_bytes(out_bytes)
    return out_path


def _generate_via_kie(char: dict) -> Path:
    """Generate via Kie.ai gpt-image-2-image-to-image ('Image Gen 2.0').

    Async task-based: POST creates a task with the public Sal reference URL
    as input_urls; poll /jobs/recordInfo until state=success; download the
    resultUrl (tempfile.aiquickdraw.com) into OUTPUT_DIR.

    Verified working canon-aligned 2026-04-29.
    """
    if not KIE_AI_API_KEY:
        raise SystemExit(
            "KIE_AI_API_KEY not set. Source from openclaw vault: "
            "ssh myclaw-vps 'docker exec openclaw-sop5-openclaw-1 env | grep -i KIE_AI_API_KEY'"
        )

    prompt = build_prompt(char)
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
            f"[{char['id']}] Kie.ai createTask {resp.status_code}: {resp.text[:500]}"
        )
    body = resp.json()
    if body.get("code") != 200:
        raise RuntimeError(f"[{char['id']}] Kie.ai create error: {body}")
    task_id = body["data"]["taskId"]

    # Poll up to ~5 minutes (50 polls * 6s).
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
                        f"[{char['id']}] Kie.ai success but no resultUrls: {pdata}"
                    )
                image_url = urls[0]
            except (json.JSONDecodeError, KeyError, AttributeError) as e:
                raise RuntimeError(f"[{char['id']}] Kie.ai resultJson parse: {e} / {result_json[:300]}")
            img_resp = requests.get(image_url, timeout=120)
            img_resp.raise_for_status()
            out_path = OUTPUT_DIR / f"{char['id']}.png"
            out_path.write_bytes(img_resp.content)
            return out_path
        if state in ("fail", "failed", "error"):
            raise RuntimeError(
                f"[{char['id']}] Kie.ai task {state}: {pdata.get('failMsg') or pdata}"
            )

    raise RuntimeError(f"[{char['id']}] Kie.ai task {task_id} timed out after 5 minutes")


def generate_portrait(char: dict, *, provider: str = "kie") -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if provider == "ideogram":
        if not SAL_REFERENCE_PATH.exists():
            raise SystemExit(f"Sal reference image not found: {SAL_REFERENCE_PATH}")
        return _generate_via_ideogram(char)
    if provider == "openai":
        if not SAL_REFERENCE_PATH.exists():
            raise SystemExit(f"Sal reference image not found: {SAL_REFERENCE_PATH}")
        return _generate_via_openai(char)
    if provider == "kie":
        return _generate_via_kie(char)
    raise ValueError(f"Unknown provider: {provider}")


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
    parser.add_argument(
        "--provider",
        choices=["kie", "ideogram", "openai"],
        default="kie",
        help="Image-gen provider. 'kie' (default) = Kie.ai gpt-image-2-image-to-image ('Image Gen 2.0'). "
             "'ideogram' = Ideogram v3 + Sal character reference. "
             "'openai' = gpt-image-1 direct (no credits as of 2026-04-29).",
    )
    args = parser.parse_args()

    print(f"Provider:     {args.provider}")
    if args.provider == "ideogram":
        print(f"Render speed: {RENDERING_SPEED}")
    if args.provider == "kie":
        print(f"Sal ref URL:  {SAL_REFERENCE_URL}")
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

    if args.provider == "ideogram":
        cost_per_image = {"TURBO": 0.025, "DEFAULT": 0.06, "QUALITY": 0.08}.get(
            RENDERING_SPEED, 0.06
        )
    elif args.provider == "kie":
        # Kie.ai gpt-image-2 at 2K ~$0.05/image (verified 2026-04-29).
        cost_per_image = 0.05
    else:
        # OpenAI gpt-image-1 high-quality 1024x1536 ≈ $0.19/image
        cost_per_image = 0.19
    print(f"Generating {len(targets)} portrait(s) — estimated cost: ${cost_per_image * len(targets):.2f}")
    print()

    succeeded: list[str] = []
    failed: list[tuple[str, str]] = []

    for char in targets:
        print(f"  [{char['id']}] {char['display_name']} ...", end="", flush=True)
        try:
            t0 = time.time()
            path = generate_portrait(char, provider=args.provider)
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
