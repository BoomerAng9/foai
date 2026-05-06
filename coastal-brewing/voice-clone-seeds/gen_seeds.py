"""
Generate IVC seed-sample WAVs for Coastal Brewing personas via
Gemini 3.1 Flash TTS, then save to the iCloud audition folder.

Per owner directive 2026-05-05: production voice stack stays Inworld;
this script only produces seed WAVs that get uploaded to Inworld's IVC
clone endpoint after owner audition. See
`feedback_inworld_stays_gemini_only_seeds_clones_2026_05_05.md`.

Usage:
    GEMINI_API_KEY=... python gen_seeds.py
    GEMINI_API_KEY=... python gen_seeds.py --persona sal_ang   # single

Output:
    C:/Users/rishj/iCloudDrive/.../Coastal Brew Voices/<persona>.wav

Each WAV is 24 kHz mono 16-bit PCM (Gemini default), wrapped via stdlib
`wave` so Inworld's IVC endpoint and any media player can read it.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import pathlib
import sys
import wave

import requests

OUTPUT_DIR = pathlib.Path(
    r"C:\Users\rishj\iCloudDrive\ACHIEVEMOR_\Projects_\The Deploy Platform_"
    r"\Claude Code\Inworld Voice Models\Coastal Brew Voices"
)

GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview"
GEMINI_ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_TTS_MODEL}:generateContent"
)

# Per-persona configs. Voices picked from Gemini's 30 prebuilt set on
# timbre fit. Style prompts target accent + cadence + register —
# Gemini steers via natural-language preamble. Scripts have dialect
# markers naturally embedded so the IVC clone carries the persona's
# delivery character into Inworld production.
PERSONAS = {
    "sal_ang": {
        "voice_name": "Charon",
        "style": (
            "Speak in a smooth NYC-into-Coastal-Georgia register — "
            "Black-American lead-barista voice, light AAVE layered "
            "with soft Southern warmth. Easy, welcoming, mid-tempo. "
            "Sound like you're leaning on the bar talking to a regular. "
            "Slight smile in the voice. Mid-baritone. Don't rush the words."
        ),
        "script": (
            "Yeah, welcome in. Coastal Brewing Co., I'm Sal — lead barista. "
            "What you looking for today? I got coffee, tea, matcha, the whole "
            "lineup. If you ain't sure yet, no worries. Tell me what you "
            "usually drink and I'll set you up. We got the Coastal Blend "
            "pulling real nice today — twelve ounce, medium roast, hits like "
            "a Sunday morning. Got the lowcountry teas in too, jasmine, earl "
            "gray, a real solid moroccan mint. And if you mess with mushroom "
            "blends for that steady focus — yeah, we keep those on hand. "
            "Real talk, hold up a second, let me know what mood you in and "
            "I'll meet you where you at."
        ),
    },
    "melli_capensi": {
        "voice_name": "Despina",
        "style": (
            "Confident female executive voice. Decisive, businesslike, "
            "slight warmth. Honey-badger-strategic — reads the deal, "
            "quotes the bracket, sets the timeline. Belter Creole light "
            "layered into the phrasing — sparingly, never marker-stuffed. "
            "Mid-pace, never rushed. Slight dry humor under the surface."
        ),
        "script": (
            "Melli Capensi — bulk and corporate accounts at Coastal Brewing "
            "Co. Let's lock in your order. Twelve units gets you fifteen "
            "percent off MSRP. Fifty-unit bracket steps you up to twenty-"
            "five. Hundred and over, we go thirty-five — and at that volume "
            "I'll spec it personally. Need it for an office, a hotel, a "
            "catering run, a wholesale account — easy on the volume, "
            "kopeng, just tell me what you need and when. Quick approval "
            "and we ship. Timeline holds, paperwork lands clean, no "
            "surprises. If you're above the ladder, ACHEEVY signs off — "
            "I bring it to him direct, no detours. Let's build the order."
        ),
    },
    "luc_ang": {
        "voice_name": "Iapetus",
        "style": (
            "Brooklyn CPA voice. Dry. Precise. Numerical. Short clipped "
            "sentences. The math-sayer. Slight wry undertone — not cold, "
            "just direct. Mid-pace on the numbers, slight pause before "
            "the punchline. Don't editorialize."
        ),
        "script": (
            "LUC. CPA. Math says you got three bags at twelve ounce, that's "
            "seventy-two ounces total. Standing discount on bundle is "
            "fifteen percent. Running the numbers — that puts you at "
            "thirty-eight forty-nine for the bundle, save you six and "
            "change. Doable. Standing coupons are WELCOME10, BREW20, "
            "FREESHIP, TRY-ME — those I can drop today. Anything beyond "
            "that, I cut the math, ACHEEVY signs. Want a deeper number, "
            "gimme the unit count and the SKU, I run it. Tight bracket, "
            "no funny business. The math is the math."
        ),
    },
    "acheevy": {
        "voice_name": "Fenrir",
        "style": (
            "Deep baritone voice, calm authority. Measured. Declaratives, "
            "not negotiations. No exclamation marks. Brooklyn-Queensbridge "
            "cadence — think a senior advisor who decides, doesn't pitch. "
            "Slight Belter Creole register layered in — Thun lexicon "
            "present but not overwhelming. Slow-medium pace. Pauses "
            "between sentences carry weight."
        ),
        "script": (
            "ACHEEVY. Final approval at Coastal Brewing Co. Sal brought "
            "this up, LUC ran the numbers, I'm here to make the call. You "
            "asked for fifteen percent on the bundle. Approved. Your price "
            "is thirty-eight forty-nine, settled. The floor holds. I don't "
            "move past it for anyone, but at fifteen we honor it clean. If "
            "the ask was bigger, the answer would be a counter — best I'd "
            "move, posted up against the floor. Fair? We brewed honest, "
            "the paper trail's owner-signed. You got my word on the price. "
            "Pull the trigger when you're ready."
        ),
    },
}


def _build_payload(cfg: dict) -> dict:
    """Gemini 3.1 Flash TTS request — single-speaker.

    Style preamble is prepended to the script so Gemini's accent/cadence
    steering kicks in. The actual spoken content is the script body.
    The audio_only response_modality returns 24 kHz mono PCM.
    """
    full_text = f"{cfg['style']}\n\n{cfg['script']}"
    return {
        "contents": [{"parts": [{"text": full_text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": cfg["voice_name"]}
                }
            },
        },
    }


def _gen(persona: str, cfg: dict, api_key: str) -> pathlib.Path:
    out_path = OUTPUT_DIR / f"{persona}.wav"
    payload = _build_payload(cfg)
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }
    print(f"[{persona}] requesting {cfg['voice_name']} via {GEMINI_TTS_MODEL}…")
    resp = requests.post(GEMINI_ENDPOINT, headers=headers, json=payload, timeout=180)
    if resp.status_code != 200:
        raise RuntimeError(
            f"Gemini TTS {resp.status_code}: {resp.text[:500]}"
        )
    data = resp.json()
    # Walk: candidates[0].content.parts[i].inline_data.data (base64 PCM)
    audio_b64 = None
    candidates = data.get("candidates") or []
    if candidates:
        parts = candidates[0].get("content", {}).get("parts", []) or []
        for p in parts:
            inline = p.get("inline_data") or p.get("inlineData") or {}
            if inline.get("data"):
                audio_b64 = inline["data"]
                break
    if not audio_b64:
        raise RuntimeError(
            f"Gemini TTS returned no audio for {persona}: {json.dumps(data)[:500]}"
        )

    pcm_bytes = base64.b64decode(audio_b64)

    # Wrap raw 24 kHz mono 16-bit PCM as a RIFF/WAV file.
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)        # 16-bit
        wf.setframerate(24000)
        wf.writeframes(pcm_bytes)

    size_kb = out_path.stat().st_size / 1024
    duration_sec = len(pcm_bytes) / (24000 * 2)
    print(
        f"[{persona}] saved {out_path.name} — "
        f"{size_kb:.1f} KB / {duration_sec:.1f}s"
    )
    return out_path


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--persona", choices=list(PERSONAS.keys()) + ["all"],
                    default="all", help="generate one persona or all four")
    args = ap.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set in env", file=sys.stderr)
        sys.exit(2)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    targets = list(PERSONAS.items()) if args.persona == "all" \
        else [(args.persona, PERSONAS[args.persona])]

    paths = []
    for persona, cfg in targets:
        try:
            paths.append(_gen(persona, cfg, api_key))
        except Exception as e:
            print(f"[{persona}] FAILED: {e}", file=sys.stderr)

    print()
    print("=== Generated ===")
    for p in paths:
        print(f"  {p}")


if __name__ == "__main__":
    main()
