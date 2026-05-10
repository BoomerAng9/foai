#!/usr/bin/env python3
"""FOAI voice-audition tool — generate side-by-side TTS samples for owner
to A/B before any voice is committed to the production voice map.

Usage:
    INWORLD_API_KEY=... python audition_voices.py \\
        --voice-ids Tyler Ronald Graham Rupert Marcus Malcolm \\
        --text "ACHEEVY here. Coastal Brewing — coffee, tea, matcha, brewed honest." \\
        --label-prefix acheevy_audition

Outputs:
    iCloud/.../Inworld Voice Models/auditions/<label-prefix>__<voiceId>.wav

Then the owner listens, picks the winner, and we set INWORLD_VOICE_ID_ACHEEVY
(or update _INWORLD_VOICE_MAP) without further guesswork.

Why this exists:
    On 2026-05-03 a cloned voice was committed to ACHEEVY's voice map
    without ever being auditioned by a human. Inworld returned HTTP 200
    + a 118 KB WAV; that was treated as success. Owner heard the WAV
    and called it robotic. The pattern that caused the failure: confusing
    API success with quality success. This tool removes that ambiguity —
    every voice candidate produces a WAV in the same folder with a
    consistent name, owner listens, picks.
"""
from __future__ import annotations

import argparse
import base64
import os
import pathlib
import re
import sys
import time

import httpx


_INWORLD_TTS_ENDPOINT = "https://api.inworld.ai/tts/v1/voice"
_DEFAULT_TEXT = "ACHEEVY here. Coastal Brewing — coffee, tea, matcha, brewed honest. Tell me what cup we finding for ya today."


def _audition_dir() -> pathlib.Path:
    icloud = pathlib.Path.home() / "iCloudDrive" / "ACHIEVEMOR_" / "Projects_" / "The Deploy Platform_" / "Claude Code" / "Inworld Voice Models"
    if icloud.exists():
        out = icloud / "auditions"
        out.mkdir(parents=True, exist_ok=True)
        return out
    here = pathlib.Path(__file__).resolve().parent
    out = here.parent / "outputs" / "auditions"
    out.mkdir(parents=True, exist_ok=True)
    return out


def synth(voice_id: str, text: str, model: str = "inworld-tts-1.5-max") -> bytes:
    key = os.environ.get("INWORLD_API_KEY", "").strip()
    if not key:
        raise SystemExit("INWORLD_API_KEY not set")
    payload = {
        "text": text,
        "voiceId": voice_id,
        "modelId": model,
        "language": "en",
    }
    r = httpx.post(
        _INWORLD_TTS_ENDPOINT,
        headers={"Authorization": f"Basic {key}", "Content-Type": "application/json"},
        json=payload,
        timeout=30,
    )
    if r.status_code != 200:
        raise SystemExit(f"voice {voice_id} HTTP {r.status_code}: {r.text[:200]}")
    return base64.b64decode(r.json().get("audioContent", ""))


def safe_filename(s: str) -> str:
    """Turn a voiceId (which can contain `__`, `-`, etc.) into a safe
    filename component."""
    return re.sub(r"[^a-zA-Z0-9._-]+", "_", s)[:80]


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--voice-ids", nargs="+", required=True, help="space-separated list of Inworld voiceIds (stock OR cloned)")
    p.add_argument("--text", default=_DEFAULT_TEXT, help="text to synthesize for each candidate (the SAME text for all so the comparison is fair)")
    p.add_argument("--label-prefix", default="audition", help="filename prefix for output WAVs")
    p.add_argument("--model", default="inworld-tts-1.5-max", help="Inworld TTS model — max (flagship) or mini (fast/cheap)")
    args = p.parse_args()

    out_dir = _audition_dir()
    print(f"Audition output dir: {out_dir}")
    print(f"Text: {args.text}")
    print(f"Model: {args.model}")
    print(f"Candidates: {len(args.voice_ids)}")
    print()

    succeeded: list[tuple[str, pathlib.Path]] = []
    failed: list[tuple[str, str]] = []

    for vid in args.voice_ids:
        try:
            t0 = time.time()
            audio = synth(vid, args.text, args.model)
            elapsed = time.time() - t0
            out_path = out_dir / f"{args.label_prefix}__{safe_filename(vid)}.wav"
            out_path.write_bytes(audio)
            size_kb = len(audio) // 1024
            print(f"  [OK] {vid:60s} {elapsed:5.1f}s  {size_kb:>4} KB  -> {out_path.name}")
            succeeded.append((vid, out_path))
        except SystemExit as exc:
            err = str(exc)
            print(f"  [FAIL] {vid:60s} {err[:100]}")
            failed.append((vid, err))

    print()
    print("=" * 70)
    print(f"Succeeded: {len(succeeded)}/{len(args.voice_ids)}")
    print(f"Failed:    {len(failed)}")
    print()
    print(f"All audition WAVs in: {out_dir}")
    print()
    print("Next: listen to each, pick the winner, set:")
    print(f"  INWORLD_VOICE_ID_ACHEEVY=<winning-voiceId>  (env var on coastal-runner)")
    print(f"OR edit _INWORLD_VOICE_MAP in scripts/api_server.py.")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
