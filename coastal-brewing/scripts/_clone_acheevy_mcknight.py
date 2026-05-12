"""One-shot: clone the Brian McKnight 30s MP3 to an Inworld custom voice
and print the resulting voiceId. Owner directive 2026-05-12: ACHEEVY's
voice must sit in the Brian McKnight / Case / Nas / AZ register; the
prior Nas-sourced v2 clone (`_clone_acheevy_nas.py`) didn't match the
smooth-R&B-tenor register owner wanted. This script clones a new IVC
seed from a Brian McKnight interview clip (Tammi Mac Late Show, 2020,
~3:02-3:32 window — clean monologue, studio mic, no music backing).

Usage (from VPS host):
  docker exec coastal-runner python /workspace/scripts/_clone_acheevy_mcknight.py

Reads the staged mp3 from the same scripts directory (already mounted
into the container) and calls Inworld's voices clone endpoint with
the manually-cleaned transcription text from that 30s window.

After this runs and prints a voiceId, update `_COASTAL_V2_VOICEID["acheevy"]`
in scripts/api_server.py to the new id and restart coastal-runner.
"""
from __future__ import annotations

import base64
import json
import os
import pathlib
import sys

import httpx

API_KEY = os.environ.get("INWORLD_API_KEY", "").strip()
if not API_KEY:
    sys.stderr.write("INWORLD_API_KEY missing in env\n")
    sys.exit(2)

CLONE_ENDPOINT = "https://api.inworld.ai/voices/v1/voices:clone"

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
SOURCE_MP3 = SCRIPT_DIR / "_acheevy_clone_source_mcknight_30s.mp3"
if not SOURCE_MP3.exists():
    sys.stderr.write(f"source mp3 missing: {SOURCE_MP3}\n")
    sys.exit(3)

# Manually-cleaned transcript from the 3:02-3:32 window of the Tammi Mac
# Late Show interview (YouTube auto-subs were rolling-caption duplicated;
# this is the deduplicated, sentence-cased version that aligns with what
# the listener actually hears in the audio).
TRANSCRIPTION = (
    "Here's the thing, even when I travel, my wife is with me "
    "every second of every day. Why? Because we want to be "
    "together every second of every day. We don't get on each "
    "other's nerves. We don't really have anything that rubs "
    "either one of us the wrong way. I would much rather be "
    "with her than not with her."
)

DISPLAY_NAME = "ACHEEVY-McKnight-soulful-tenor-v3"
LANG_CODE = "en"

audio_bytes = SOURCE_MP3.read_bytes()
audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
sys.stderr.write(
    f"Staged audio: {SOURCE_MP3.name} ({len(audio_bytes)} bytes, "
    f"{len(audio_b64)} chars b64)\n"
)

payload = {
    "displayName": DISPLAY_NAME,
    "langCode": LANG_CODE,
    "voiceSamples": [
        {"audioData": audio_b64, "transcription": TRANSCRIPTION},
    ],
    "audioProcessingConfig": {"removeBackgroundNoise": True},
}

with httpx.Client(timeout=120.0) as client:
    resp = client.post(
        CLONE_ENDPOINT,
        headers={
            "Authorization": f"Basic {API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
    )

sys.stderr.write(f"HTTP {resp.status_code}\n")
try:
    body = resp.json()
except Exception:
    body = {"raw": resp.text}

print(json.dumps(body, indent=2))

if resp.status_code != 200:
    sys.exit(4)

# Pull the voiceId out for easy capture
vid = body.get("voiceId") or body.get("name") or "(missing)"
sys.stderr.write(f"\nNEW VOICE_ID: {vid}\n")
sys.stderr.write("Next step: update _COASTAL_V2_VOICEID['acheevy'] in scripts/api_server.py\n")
