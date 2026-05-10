#!/usr/bin/env python3
"""Generate Sqwaadrun fleet character art via Recraft V4.

Source roster: ~/foai/smelter-os/sqwaadrun/sqwaadrun_hawks.json
Output:        ~/foai/chicken-hawk/hawk-ui/public/hawks/<lowercase_id>.png

Idempotent — re-running skips files that already exist with non-zero size.
Uses RECRAFT_API_KEY env, or pulls from openclaw vault on myclaw-vps.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 hawk-ui/sqwaadrun-gen"
)

ROSTER = Path(os.environ.get(
    "ROSTER",
    r"C:\Users\rishj\foai\smelter-os\sqwaadrun\sqwaadrun\sqwaadrun_hawks.json",
))
OUT_DIR = Path(os.environ.get(
    "OUT_DIR",
    r"C:\Users\rishj\foai\chicken-hawk\hawk-ui\public\hawks",
))
OUT_DIR.mkdir(parents=True, exist_ok=True)

STYLE_DIRECTIVE = (
    "digital illustration, character portrait, square composition, "
    "vibrant amber-and-slate palette with role-specific accent color, "
    "dynamic pose, clean studio background, cohesive Sqwaadrun fleet style — "
    "cinematic but illustrated, bold linework, semi-realistic anthropomorphic "
    "hawk in tactical gear"
)


def get_recraft_key() -> str:
    key = os.environ.get("RECRAFT_API_KEY", "").strip()
    if key:
        return key
    try:
        out = subprocess.run(
            ["ssh", "myclaw-vps",
             "docker exec openclaw-sop5-openclaw-1 sh -c 'echo $RECRAFT_API_KEY'"],
            capture_output=True, text=True, check=True, timeout=30,
        )
        return out.stdout.strip()
    except Exception as e:
        print(f"FATAL: could not retrieve RECRAFT_API_KEY: {e}", file=sys.stderr)
        sys.exit(1)


def generate(prompt: str, key: str) -> str:
    body = json.dumps({
        "prompt": prompt,
        "style": "digital_illustration",
        "size": "1024x1024",
        "n": 1,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://external.api.recraft.ai/v1/images/generations",
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read())
    url = data.get("data", [{}])[0].get("url")
    if not url:
        raise RuntimeError(f"no URL in Recraft response: {data}")
    return url


def download(url: str, out_path: Path) -> int:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        out_path.write_bytes(r.read())
    return out_path.stat().st_size


def main() -> int:
    roster = json.loads(ROSTER.read_text(encoding="utf-8"))
    print(f"[hawk]Generating {len(roster)} Sqwaadrun hawks → {OUT_DIR}\n")

    key = get_recraft_key()
    if not key:
        print("FATAL: empty RECRAFT_API_KEY", file=sys.stderr)
        return 1

    done, skipped, failed = 0, 0, 0
    for i, hawk in enumerate(roster, start=1):
        hid = hawk["id"]
        title = hawk.get("title", "")
        visual = hawk.get("visual", "")
        personality = hawk.get("personality", "")
        filename = f"{hid.lower()}.png"
        out_path = OUT_DIR / filename

        if out_path.exists() and out_path.stat().st_size > 0:
            print(f"[skip]{hid} — already exists ({out_path.stat().st_size}b), skipping")
            skipped += 1
            continue

        prompt = f"{visual} Personality: {personality}. Title: {title}. Style: {STYLE_DIRECTIVE}."
        print(f"[gen][{i}/{len(roster)}] {hid} ({title})")
        try:
            url = generate(prompt, key)
            size = download(url, out_path)
            print(f"  ok saved {filename} ({size}b)", flush=True)
            done += 1
        except Exception as e:
            print(f"  FAIL {e}", file=sys.stderr, flush=True)
            failed += 1
        time.sleep(2.0)

    print(f"\n--------------------------------")
    print(f"[hawk]done — generated: {done}  skipped: {skipped}  failed: {failed}")
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
