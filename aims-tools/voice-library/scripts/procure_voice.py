#!/usr/bin/env python3
"""FOAI voice-procurement pipeline.

Search PD/CC-licensed audio via Brave, download from archive.org, upload
to Inworld voice cloning. Returns the cloned voiceId for plugging into
character voice maps.

Pipeline:
  1. Brave search for license-permissive narrator audio
  2. archive.org metadata API → resolve direct MP3 URL
  3. Download MP3 (≤ 4 MB, Inworld's clone-input cap)
  4. Base64-encode + POST to Inworld /voices/v1/voices:clone
  5. Persist the returned voiceId to outputs/voices.json

Usage:
    BRAVE_API_KEY=... INWORLD_API_KEY=... \\
        python procure_voice.py \\
        --display-name "ACHEEVY-IdrisArchetype-v1" \\
        --description "Black-British baritone for ACHEEVY" \\
        --archive-id MarcusGarveySpeech1921 \\
        --filename marcus_garvey_speech_1921.mp3

Env vars (read at runtime):
    BRAVE_API_KEY    — for search-driven discovery (optional once you
                        have a known archive_id)
    INWORLD_API_KEY  — base64 key:secret bundle for Inworld auth
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import pathlib
import sys
from typing import Optional

import httpx


_INWORLD_CLONE_ENDPOINT = "https://api.inworld.ai/voices/v1/voices:clone"
_INWORLD_TTS_ENDPOINT = "https://api.inworld.ai/tts/v1/voice"
_ARCHIVE_DOWNLOAD_BASE = "https://archive.org/download"
_BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search"

# Inworld clone-input cap (per the platform UI docs).
_MAX_AUDIO_BYTES = 4 * 1024 * 1024


def _output_dir() -> pathlib.Path:
    """Voice-model storage dir. Canonical location is the iCloud Claude
    Code folder ("Inworld Voice Models"); falls back to the local
    voice-library/outputs/ if iCloud isn't mounted."""
    icloud = pathlib.Path.home() / "iCloudDrive" / "ACHIEVEMOR_" / "Projects_" / "The Deploy Platform_" / "Claude Code" / "Inworld Voice Models"
    if icloud.exists():
        out = icloud / "cloned-samples"
        out.mkdir(parents=True, exist_ok=True)
        return out
    here = pathlib.Path(__file__).resolve().parent
    out = here.parent / "outputs"
    out.mkdir(parents=True, exist_ok=True)
    return out


def _archive_raw_dir() -> pathlib.Path:
    """Where to drop raw + trimmed PD-source audio. Same iCloud root
    when available, separate subfolder for clean organization."""
    icloud = pathlib.Path.home() / "iCloudDrive" / "ACHIEVEMOR_" / "Projects_" / "The Deploy Platform_" / "Claude Code" / "Inworld Voice Models"
    if icloud.exists():
        out = icloud / "source-archive-public-domain"
        out.mkdir(parents=True, exist_ok=True)
        return out
    return _output_dir()


def brave_search(query: str, count: int = 5) -> list[dict]:
    """Brave Search API — returns web results matching the query."""
    key = os.environ.get("BRAVE_API_KEY", "").strip()
    if not key:
        return []
    r = httpx.get(
        _BRAVE_ENDPOINT,
        headers={"X-Subscription-Token": key, "Accept": "application/json"},
        params={"q": query, "count": count},
        timeout=15,
    )
    r.raise_for_status()
    return r.json().get("web", {}).get("results", [])


def archive_download_url(archive_id: str, filename: str) -> str:
    return f"{_ARCHIVE_DOWNLOAD_BASE}/{archive_id}/{filename}"


def archive_resolve_audio(archive_id: str) -> Optional[tuple[str, str]]:
    """Hit archive.org metadata API and return (filename, format) of the
    smallest audio file in the item — preferring MP3. Returns None if no
    audio file is found."""
    r = httpx.get(f"https://archive.org/metadata/{archive_id}", timeout=20)
    r.raise_for_status()
    files = r.json().get("files", []) or []
    audio = []
    for f in files:
        fmt = (f.get("format") or "").lower()
        if any(t in fmt for t in ("mp3", "vbr mp3", "ogg", "wav", "webm")):
            try:
                size = int(f.get("size", "0") or "0")
            except ValueError:
                size = 0
            audio.append((f.get("name", ""), fmt, size))
    if not audio:
        return None
    # Prefer MP3 then sort by size (smaller fits Inworld's 4 MB cap)
    audio.sort(key=lambda x: (0 if "mp3" in x[1] else 1, x[2]))
    name, fmt, _ = audio[0]
    return name, fmt


def download_audio(archive_id: str, filename: str) -> bytes:
    url = archive_download_url(archive_id, filename)
    r = httpx.get(url, timeout=60, follow_redirects=True)
    r.raise_for_status()
    return r.content


def trim_audio_to_seconds(input_bytes: bytes, input_ext: str, max_seconds: int) -> bytes:
    """Trim audio to at most `max_seconds`. Uses the bundled ffmpeg from
    imageio-ffmpeg (no system install required). Returns the trimmed bytes
    as MP3 regardless of input format (smallest size for Inworld upload).
    Inworld's clone API rejects audio > 180 seconds (verified empirically
    2026-05-03 — docs said 5-15s but the actual API ceiling is 1-180s)."""
    import subprocess
    import tempfile
    try:
        from imageio_ffmpeg import get_ffmpeg_exe
        ffmpeg = get_ffmpeg_exe()
    except ImportError:
        raise SystemExit(
            "imageio-ffmpeg not installed. Run: pip install imageio-ffmpeg"
        )
    with tempfile.NamedTemporaryFile(suffix=f".{input_ext}", delete=False) as inf:
        inf.write(input_bytes)
        in_path = inf.name
    out_path = in_path + ".trimmed.mp3"
    try:
        result = subprocess.run(
            [
                ffmpeg, "-y", "-i", in_path, "-t", str(max_seconds),
                "-acodec", "libmp3lame", "-b:a", "128k", "-ac", "1", "-ar", "22050",
                out_path,
            ],
            capture_output=True, timeout=60,
        )
        if result.returncode != 0:
            raise SystemExit(
                f"ffmpeg trim failed: {result.stderr.decode('utf-8', errors='replace')[:500]}"
            )
        with open(out_path, "rb") as f:
            trimmed = f.read()
        return trimmed
    finally:
        for p in (in_path, out_path):
            try:
                os.unlink(p)
            except OSError:
                pass


def inworld_clone_voice(
    audio_bytes: bytes,
    display_name: str,
    description: str = "",
    transcription: str = "",
    tags: Optional[list[str]] = None,
) -> dict:
    """POST audio to Inworld voice cloning. Returns the response dict
    containing the cloned voice ID."""
    key = os.environ.get("INWORLD_API_KEY", "").strip()
    if not key:
        raise SystemExit("INWORLD_API_KEY not set")
    payload = {
        "displayName": display_name,
        "langCode": "EN_US",
        "voiceSamples": [
            {
                "audioData": base64.b64encode(audio_bytes).decode("ascii"),
                "transcription": transcription,
            }
        ],
        "description": description,
        "tags": tags or ["coastal_brewing", "foai_voice"],
        "audioProcessingConfig": {"removeBackgroundNoise": True},
    }
    headers = {
        "Authorization": f"Basic {key}",
        "Content-Type": "application/json",
    }
    r = httpx.post(_INWORLD_CLONE_ENDPOINT, headers=headers, json=payload, timeout=120)
    if r.status_code not in (200, 201):
        raise SystemExit(
            f"Inworld clone error {r.status_code}: {r.text[:500]}"
        )
    return r.json()


def inworld_tts_test(voice_id: str, text: str) -> bytes:
    """Synthesize a test sample with the cloned voice. Returns WAV bytes."""
    key = os.environ.get("INWORLD_API_KEY", "").strip()
    payload = {
        "text": text,
        "voiceId": voice_id,
        "modelId": "inworld-tts-1.5-max",
        "language": "en",
    }
    r = httpx.post(
        _INWORLD_TTS_ENDPOINT,
        headers={"Authorization": f"Basic {key}", "Content-Type": "application/json"},
        json=payload,
        timeout=30,
    )
    if r.status_code != 200:
        raise SystemExit(f"Inworld TTS test error {r.status_code}: {r.text[:300]}")
    audio_b64 = r.json().get("audioContent", "")
    return base64.b64decode(audio_b64)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--archive-id", help="archive.org item identifier (use this OR --source-file)")
    p.add_argument("--source-file", help="local audio file to clone from (use this OR --archive-id) — bypasses archive.org download for owner-supplied sources (e.g. Jarrett voice training)")
    p.add_argument("--filename", help="specific filename within the archive item; auto-resolved if omitted")
    p.add_argument("--display-name", required=True, help="display name for the cloned voice in Inworld dashboard")
    p.add_argument("--description", default="", help="description text saved with the voice")
    p.add_argument("--transcription", default="", help="optional transcription of the audio sample")
    p.add_argument("--test-text", default="ACHEEVY here. Coastal Brewing — coffee, tea, matcha. Brewed honest.", help="text to synthesize for verification after cloning")
    p.add_argument("--skip-test", action="store_true", help="skip the TTS verification synthesis after cloning")
    p.add_argument("--trim-seconds", type=int, default=30, help="trim downloaded audio to at most N seconds before upload (Inworld accepts 1-180s, smaller cloning samples = faster upload)")
    args = p.parse_args()

    if not args.archive_id and not args.source_file:
        print("error: provide --archive-id OR --source-file", file=sys.stderr)
        return 1
    if args.archive_id and args.source_file:
        print("error: pass only one of --archive-id or --source-file", file=sys.stderr)
        return 1

    out_dir = _output_dir()
    archive_dir = _archive_raw_dir()

    if args.source_file:
        src = pathlib.Path(args.source_file)
        if not src.exists():
            print(f"  ! source file not found: {src}", file=sys.stderr)
            return 1
        print(f"[1/5] Loading owner-supplied audio: {src}")
        raw_bytes = src.read_bytes()
        filename = src.name
        ext_for_label = "owner-supplied"
        print(f"  loaded: {len(raw_bytes)} bytes ({len(raw_bytes) // 1024} KB)")
    else:
        print(f"[1/5] Resolving audio for archive item: {args.archive_id}")
        if args.filename:
            filename = args.filename
            fmt = "(specified)"
        else:
            resolved = archive_resolve_audio(args.archive_id)
            if not resolved:
                print(f"  ! no audio file found in {args.archive_id}", file=sys.stderr)
                return 1
            filename, fmt = resolved
            print(f"  resolved: {filename} ({fmt})")
        print(f"[2/5] Downloading audio: {archive_download_url(args.archive_id, filename)}")
        raw_bytes = download_audio(args.archive_id, filename)
        print(f"  downloaded: {len(raw_bytes)} bytes ({len(raw_bytes) // 1024} KB)")
        raw_local = archive_dir / f"{args.archive_id}__{filename}"
        raw_local.write_bytes(raw_bytes)
        print(f"  saved raw: {raw_local}")
        ext_for_label = args.archive_id

    # Inworld clone API requires 1-180 seconds. Trim to args.trim_seconds.
    ext = (filename.rsplit(".", 1)[-1] or "mp3").lower()
    print(f"[2.5/5] Trimming to {args.trim_seconds}s via bundled ffmpeg...")
    audio_bytes = trim_audio_to_seconds(raw_bytes, ext, args.trim_seconds)
    print(f"  trimmed: {len(audio_bytes)} bytes ({len(audio_bytes) // 1024} KB)")
    if len(audio_bytes) > _MAX_AUDIO_BYTES:
        raise SystemExit(
            f"trimmed audio is {len(audio_bytes) // 1024} KB, exceeds Inworld 4 MB cap. "
            f"Reduce --trim-seconds."
        )
    trimmed_local = archive_dir / f"{ext_for_label}__trimmed_{args.trim_seconds}s.mp3"
    trimmed_local.write_bytes(audio_bytes)
    print(f"  saved trimmed: {trimmed_local}")

    print(f"[3/5] Cloning to Inworld: displayName={args.display_name!r}")
    clone_resp = inworld_clone_voice(
        audio_bytes=audio_bytes,
        display_name=args.display_name,
        description=args.description,
        transcription=args.transcription,
    )
    voice = clone_resp.get("voice") or clone_resp
    voice_id = (
        voice.get("voiceId")
        or voice.get("voice_id")
        or voice.get("name", "").split("/")[-1]
    )
    if not voice_id:
        print(f"  ! could not extract voiceId from response: {clone_resp}", file=sys.stderr)
        return 2
    print(f"  [OK] cloned: voiceId={voice_id}")

    # Persist record for downstream wiring
    record = {
        "voice_id": voice_id,
        "display_name": args.display_name,
        "description": args.description,
        "source_archive_id": args.archive_id,
        "source_filename": filename,
        "audio_bytes": len(audio_bytes),
        "raw_clone_response": clone_resp,
    }
    record_path = out_dir / f"{args.display_name}.json"
    record_path.write_text(json.dumps(record, indent=2), encoding="utf-8")
    print(f"  saved record: {record_path}")

    if args.skip_test:
        return 0

    print(f"[4/5] Verifying with TTS synthesis (voiceId={voice_id}, text={args.test_text[:60]!r}...)")
    test_audio = inworld_tts_test(voice_id, args.test_text)
    test_path = out_dir / f"{args.display_name}__test.wav"
    test_path.write_bytes(test_audio)
    print(f"  [OK] test audio: {test_path} ({len(test_audio) // 1024} KB WAV)")

    print(f"[5/5] DONE. Update _INWORLD_VOICE_MAP[\"acheevy\"]['voiceId'] = {voice_id!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
