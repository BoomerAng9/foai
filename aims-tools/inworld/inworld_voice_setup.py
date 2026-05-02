"""
FOAI Ecosystem — Inworld Voice Design Setup
Classification: INTERNAL IP — NOT FOR DISTRIBUTION
Version: 1.0.0 — 2026-05-02
Owner: ACHIEVEMOR / FOAI — asg@achievemor.io

Creates Inworld voices via the Voice Design API (text prompt → voice ID).
No audio samples, no third-party TTS services.

Each character's `voice_design_prompt` in their spec YAML is submitted
directly to Inworld's Design endpoint. The returned voice ID is printed
for the owner to set as INWORLD_VOICE_ID_{SLUG} in docker-compose.

Usage:
    python inworld_voice_setup.py --phase 1
    python inworld_voice_setup.py --employee deborah
    python inworld_voice_setup.py --all --dry-run

Required env vars:
    INWORLD_API_CREDENTIALS — Base64-encoded key:secret (from openclaw)
    INWORLD_WORKSPACE_ID    — Workspace ID (e.g. default-4zhua1rhxjfl50z1dnkcba)
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import json
import logging
import os
import pathlib
import sys
import time
from typing import Optional

import httpx
import yaml

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

_STUDIO_BASE = "https://api.inworld.ai/studio/v1"
_REGISTRY_PATH = pathlib.Path(__file__).parent / "character-registry.yaml"
_SPEC_BASE = pathlib.Path(__file__).parent / "character-specs" / "coastal-brewing"

# Sample text used to preview the voice after creation
_SAMPLE_TEXTS = {
    "acheevy":       "Every cup is what the label says it is. No exceptions.",
    "sal_ang":       "Now, this one right here — this is something special.",
    "luc_ang":       "Math checks out. Running the numbers one more time.",
    "melli_capensi": "The Sett is a seven-stage funnel. I built it. I run it.",
    "deborah":       "Come on in. Let me find you the right cup.",
}
_DEFAULT_SAMPLE = "Welcome to Coastal Brewing Co."


# ─────────────────────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────────────────────

def _auth_header() -> str:
    creds = os.environ.get("INWORLD_API_CREDENTIALS", "")
    if creds:
        return f"Basic {creds}"
    key = os.environ.get("INWORLD_API_KEY", "")
    secret = os.environ.get("INWORLD_API_SECRET", "")
    if key and secret:
        encoded = base64.b64encode(f"{key}:{secret}".encode()).decode()
        return f"Basic {encoded}"
    raise RuntimeError(
        "No Inworld credentials found. Set INWORLD_API_CREDENTIALS "
        "(or INWORLD_API_KEY + INWORLD_API_SECRET) in environment."
    )


def _workspace_id() -> str:
    ws = os.environ.get("INWORLD_WORKSPACE_ID", "")
    if not ws:
        raise RuntimeError("INWORLD_WORKSPACE_ID not set.")
    return ws


# ─────────────────────────────────────────────────────────────────────────────
# REGISTRY LOADER
# ─────────────────────────────────────────────────────────────────────────────

def _load_registry() -> list[dict]:
    with open(_REGISTRY_PATH) as f:
        data = yaml.safe_load(f)
    return data.get("characters", [])


def _load_spec(employee_id: str) -> Optional[dict]:
    path = _SPEC_BASE / f"{employee_id}.yaml"
    if not path.exists():
        return None
    with open(path) as f:
        return yaml.safe_load(f)


def _env_slug(employee_id: str) -> str:
    return employee_id.upper().replace("-", "_")


# ─────────────────────────────────────────────────────────────────────────────
# INWORLD VOICE DESIGN API
# ─────────────────────────────────────────────────────────────────────────────

async def design_voice(
    employee_id: str,
    display_name: str,
    voice_design_prompt: str,
    tts_model: str,
    dry_run: bool = False,
) -> Optional[str]:
    """
    Submit a voice design prompt to Inworld and return the created voice ID.

    Inworld Voice Design endpoint:
        POST /studio/v1/workspaces/{workspace}/voice-library/voices
        Body: { "displayName": "...", "designPrompt": "...", "model": "..." }

    Returns the voice ID string, or None on failure.
    """
    ws = _workspace_id()
    url = f"{_STUDIO_BASE}/workspaces/{ws}/voice-library/voices"
    sample_text = _SAMPLE_TEXTS.get(employee_id, _DEFAULT_SAMPLE)

    payload = {
        "displayName": f"{display_name} — Coastal Brewing",
        "designPrompt": voice_design_prompt.strip(),
        "model": tts_model,
        "sampleText": sample_text,
        "tags": ["coastal_brewing", employee_id],
    }

    if dry_run:
        log.info(
            "[DRY RUN] %s — would POST to %s\nPrompt (first 120 chars): %s...",
            employee_id, url, voice_design_prompt[:120],
        )
        return f"DRY_RUN_VOICE_ID_{_env_slug(employee_id)}"

    headers = {
        "Authorization": _auth_header(),
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, headers=headers, json=payload)

        if resp.status_code in (200, 201):
            body = resp.json()
            # Inworld may return { "name": "workspaces/.../voices/...", "voiceId": "..." }
            voice_id = (
                body.get("voiceId")
                or body.get("voice_id")
                or body.get("id")
                or body.get("name", "").split("/")[-1]
            )
            if voice_id:
                log.info("✓ %s — voice created: %s", employee_id, voice_id)
                return voice_id
            else:
                log.error("Unexpected response shape for %s: %s", employee_id, body)
                return None

        elif resp.status_code == 409:
            # Voice already exists — extract existing ID from error body if present
            body = resp.json()
            existing = body.get("details", [{}])[0].get("voiceId", "")
            log.warning(
                "%s — voice already exists (409). Existing ID: %s",
                employee_id, existing or "unknown — check Studio dashboard",
            )
            return existing or None

        else:
            log.error(
                "%s — API error %d: %s",
                employee_id, resp.status_code, resp.text[:400],
            )
            return None

    except httpx.TimeoutException:
        log.error("%s — request timed out after 60s", employee_id)
        return None
    except Exception as exc:
        log.error("%s — unexpected error: %s", employee_id, exc)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# MAIN RUNNER
# ─────────────────────────────────────────────────────────────────────────────

async def run(
    phase: Optional[int],
    employee_filter: Optional[str],
    all_chars: bool,
    dry_run: bool,
) -> None:
    registry = _load_registry()
    results: dict[str, Optional[str]] = {}
    env_lines: list[str] = []

    for entry in registry:
        eid = entry["employee_id"]

        # Filter logic
        if employee_filter and eid != employee_filter:
            continue
        if phase and entry.get("phase") != phase and not all_chars:
            continue
        if not all_chars and not employee_filter and phase is None:
            log.warning("No filter specified — use --phase N, --employee ID, or --all")
            return

        spec = _load_spec(eid)
        if not spec:
            log.warning("%s — no spec YAML found, skipping", eid)
            continue

        prompt = spec.get("voice_design_prompt", "").strip()
        if not prompt:
            log.warning("%s — no voice_design_prompt in spec, skipping", eid)
            continue

        display = spec.get("display_name", eid)
        tts_model = spec.get("tts_model", "tts-1.5-max")

        log.info("Designing voice for %s (%s)...", eid, display)
        voice_id = await design_voice(eid, display, prompt, tts_model, dry_run)
        results[eid] = voice_id

        if voice_id:
            slug = _env_slug(eid)
            env_lines.append(f"INWORLD_VOICE_ID_{slug}={voice_id}")

        # Rate limit — Inworld Studio API: 1 req/sec is safe
        await asyncio.sleep(1.2)

    # ── Output summary ────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("VOICE DESIGN RESULTS")
    print("=" * 60)
    for eid, vid in results.items():
        status = "OK" if vid else "FAIL"
        print(f"  [{status}]  {eid:<20} {vid or 'FAILED'}")

    if env_lines:
        print("\n" + "-" * 60)
        print("Add these to docker-compose.yml coastal-runner env block:")
        print("-" * 60)
        for line in env_lines:
            print(f"  {line}")

        print("\n" + "-" * 60)
        print("Then flip active: true for each character in character-registry.yaml")
        print("and restart the coastal-runner container.")
        print("-" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(description="Inworld Voice Design setup for FOAI characters")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--phase", type=int, help="Activate all Phase N characters")
    group.add_argument("--employee", type=str, help="Activate a single character by employee_id")
    group.add_argument("--all", dest="all_chars", action="store_true", help="All characters")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be sent, no API calls")
    args = parser.parse_args()

    if not args.phase and not args.employee and not args.all_chars:
        parser.error("Specify --phase N, --employee ID, or --all")

    asyncio.run(run(
        phase=args.phase,
        employee_filter=args.employee,
        all_chars=args.all_chars,
        dry_run=args.dry_run,
    ))


if __name__ == "__main__":
    main()
