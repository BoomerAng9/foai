"""One-shot: clone the Nas best-window MP3 to an Inworld custom voice
and print the resulting voiceId. Designed to run INSIDE the
coastal-runner container so the INWORLD_API_KEY stays in env-only.

Usage (from VPS host):
  docker exec coastal-runner python /workspace/scripts/_clone_acheevy_nas.py

Reads the staged mp3 from the same scripts directory (already mounted
into the container) and calls Inworld's voices clone endpoint with
the analyzer-confirmed transcription text from the 0:00-0:30 window.
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

# The mp3 is staged next to this script via SCP. The container's WORKDIR
# is /workspace; the scripts dir mounts there.
SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
SOURCE_MP3 = SCRIPT_DIR / "_acheevy_clone_source_nas_30s.mp3"
if not SOURCE_MP3.exists():
    sys.stderr.write(f"source mp3 missing: {SOURCE_MP3}\n")
    sys.exit(3)

# Analyzer-confirmed transcript span for the 0:00-0:30 window of the
# Nas Power 105.1 Stillmatic clip. (YouTube auto-subs were
# rolling-caption duplicated; this is the deduplicated content.)
TRANSCRIPTION = (
    "And I was told and begged to do the Summer Jam. "
    "I was begged to come to Hot 97 because I had a hot new record "
    "that nobody wanted to support except for the streets. "
    "And it was told to come there and save Angie Martinez's job."
)

DISPLAY_NAME = "ACHEEVY-Nas-Queensbridge-baritone-v1"
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
        {"audioData": audio_b64, "transcription": TRANSCRIPTION}
    ],
    "audioProcessingConfig": {"removeBackgroundNoise": True},
}
headers = {
    "Authorization": f"Basic {API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

sys.stderr.write(f"POST {CLONE_ENDPOINT} ({DISPLAY_NAME})\n")
try:
    with httpx.Client(timeout=120.0) as client:
        resp = client.post(CLONE_ENDPOINT, json=payload, headers=headers)
except Exception as exc:
    sys.stderr.write(f"clone request failed: {exc}\n")
    sys.exit(4)

sys.stderr.write(f"HTTP {resp.status_code}\n")
if resp.status_code != 200:
    sys.stderr.write(f"body: {resp.text[:1500]}\n")
    sys.exit(5)

body = resp.json()
print(json.dumps(body, indent=2))

voice_id = body.get("voiceId") or body.get("name") or body.get("id")
if voice_id:
    sys.stderr.write(f"\nNEW VOICE ID: {voice_id}\n")
    sys.stderr.write(
        f"Set INWORLD_VOICE_ID_ACHEEVY='{voice_id}' "
        f"in coastal-runner env to wire it into ACHEEVY.\n"
    )
