"""
Drive POST /api/v1/voice/clone for each Coastal persona.

Reads the same PERSONAS dict gen_seeds.py used so the transcription
sent to Inworld matches the audio byte-for-byte. Prints + saves the
returned voiceIds to a JSON map for the next-step wiring into
_INWORLD_VOICE_MAP.
"""
from __future__ import annotations

import json
import os
import pathlib
import sys

import requests

# Reuse the PERSONAS dict from the generator so transcription stays canonical.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from gen_seeds import PERSONAS  # noqa: E402

RUNNER_BASE = os.environ.get("RUNNER_BASE", "http://127.0.0.1:8080")
GATEWAY_TOKEN = os.environ.get("COASTAL_GATEWAY_TOKEN", "").strip()
OUT_PATH = pathlib.Path(__file__).resolve().parent / "voice_ids.json"

# Display-name slugs Inworld will append to the workspace prefix.
DISPLAY_NAME = {
    "sal_ang":       "Coastal-Sal-Ang-v2",
    "melli_capensi": "Coastal-Melli-Capensi-v2",
    "luc_ang":       "Coastal-LUC-Ang-v2",
    "acheevy":       "Coastal-ACHEEVY-v2",
}


def clone(persona: str) -> dict:
    cfg = PERSONAS[persona]
    body = {
        "audio_filename": f"{persona}.wav",
        "transcription": cfg["script"],
        "display_name": DISPLAY_NAME[persona],
        "lang_code": "en",
        "remove_background_noise": True,
    }
    headers = {
        "Content-Type": "application/json",
        "X-Coastal-Token": GATEWAY_TOKEN,
    }
    print(f"[{persona}] cloning -> {DISPLAY_NAME[persona]}")
    r = requests.post(
        f"{RUNNER_BASE}/api/v1/voice/clone",
        json=body, headers=headers, timeout=240,
    )
    if r.status_code != 200:
        print(f"  FAILED {r.status_code}: {r.text[:500]}")
        return {"persona": persona, "error": r.text[:500], "status": r.status_code}
    data = r.json()
    voice_id = data.get("voice_id")
    print(f"  voice_id = {voice_id}")
    return {
        "persona": persona,
        "voice_id": voice_id,
        "display_name": DISPLAY_NAME[persona],
        "audio_bytes": data.get("audio_bytes"),
    }


def main():
    if not GATEWAY_TOKEN:
        print("ERROR: COASTAL_GATEWAY_TOKEN not set", file=sys.stderr)
        sys.exit(2)

    results = []
    for persona in PERSONAS.keys():
        results.append(clone(persona))

    OUT_PATH.write_text(json.dumps(results, indent=2))
    print()
    print(f"=== wrote {OUT_PATH} ===")
    for r in results:
        if "voice_id" in r and r["voice_id"]:
            print(f"  {r['persona']:<16} {r['voice_id']}")
        else:
            print(f"  {r['persona']:<16} FAILED: {r.get('error','')[:200]}")


if __name__ == "__main__":
    main()
