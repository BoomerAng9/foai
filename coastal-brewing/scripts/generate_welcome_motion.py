"""Generate the one-time universal Coastal welcome motion clip.

Iller_Ang 4-step canon — using the existing storefront PNG as the
first-frame anchor instead of generating a fresh still (the storefront
is already brand-canon, so step A1 is a no-op for this run). Submits
to Kie.ai Seedance 2.0 i2v with motion guidance, polls until done,
downloads to web/public/welcome/coastal-welcome-motion.mp4.

Usage:
    KIE_AI_API_KEY=... python generate_welcome_motion.py

Cost: ~$0.50-1.00 one-time. Output is committed to the repo and
served as the universal background motion behind every personalized
welcome card.
"""
from __future__ import annotations

import os
import pathlib
import sys
import time

import requests

KIE_API_KEY = os.environ.get("KIE_AI_API_KEY") or os.environ.get("KIE_API_KEY", "")
KIE_BASE = "https://api.kie.ai"

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "welcome"
OUTPUT_PATH = OUTPUT_DIR / "coastal-welcome-motion.mp4"

# The brand-canon storefront image — served at brewing.foai.cloud and
# already used as the hero. Reusing it as the first-frame anchor keeps
# the welcome motion tied to the live brand surface customers know.
FIRST_FRAME_URL = "https://brewing.foai.cloud/coastal-brewing-co-storefront.png"

MOTION_PROMPT = (
    "Subtle living motion on the Coastal Brewing Co. storefront — "
    "a small wood-stork weather vane gently turning in a coastal "
    "breeze, palm fronds swaying lightly, Spanish moss drifting, "
    "warm golden-hour light slowly shifting across the cup display "
    "in the window, faint marsh ripples in the background. Locked "
    "frame — no camera movement, no zoom, no pan. Cinematic, warm, "
    "premium, contemplative Lowcountry mood. The polar opposite of "
    "frantic stock-footage motion. The brand mark above the door "
    "stays sharp and unchanged."
)


def _post(path: str, body: dict, timeout: int = 30) -> dict:
    if not KIE_API_KEY:
        raise RuntimeError("KIE_AI_API_KEY not set")
    r = requests.post(
        f"{KIE_BASE}{path}",
        headers={
            "Authorization": f"Bearer {KIE_API_KEY}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=timeout,
    )
    r.raise_for_status()
    return r.json()


def _get(path: str, timeout: int = 15) -> dict:
    if not KIE_API_KEY:
        raise RuntimeError("KIE_AI_API_KEY not set")
    r = requests.get(
        f"{KIE_BASE}{path}",
        headers={"Authorization": f"Bearer {KIE_API_KEY}"},
        timeout=timeout,
    )
    r.raise_for_status()
    return r.json()


def submit_seedance() -> str:
    """Submit the i2v task. Returns taskId."""
    body = {
        "model": "bytedance/seedance-2",
        "input": {
            "prompt": MOTION_PROMPT,
            "first_frame_url": FIRST_FRAME_URL,
            "aspect_ratio": "16:9",
            "duration": 6,
            "resolution": "720p",
            "generate_audio": False,
        },
    }
    print("[seedance] submitting i2v task…")
    resp = _post("/api/v1/jobs/createTask", body)
    if resp.get("code") != 200:
        raise RuntimeError(f"submit failed: {resp.get('msg')}")
    task_id = resp["data"]["taskId"]
    print(f"[seedance] taskId: {task_id}")
    return task_id


def poll_until_done(task_id: str, deadline_sec: int = 600) -> str:
    """Poll until task completes. Returns videoUrl.

    Kie.ai's canonical Coastal-tested poll endpoint is /jobs/recordInfo
    (not /jobs/getTaskDetail — that path returns 404 on the v1 API).
    Reference: `generate_product_images.py` line 55.
    """
    deadline = time.time() + deadline_sec
    backoff = 5
    while time.time() < deadline:
        resp = _get(f"/api/v1/jobs/recordInfo?taskId={task_id}")
        if resp.get("code") != 200:
            raise RuntimeError(f"poll failed: {resp.get('msg')}")
        data = resp.get("data") or {}
        # The recordInfo response shape uses `state` not `status` and
        # the result lives under `resultJson` (a JSON string) for
        # video tasks. Decode defensively.
        state = (data.get("state") or data.get("status") or "unknown").lower()
        progress = data.get("progress")
        print(f"[seedance] state={state} progress={progress}")
        if state in ("success", "succeeded", "completed"):
            url = _extract_video_url(data)
            if not url:
                raise RuntimeError(f"no video url in completed response: {data}")
            return url
        if state in ("fail", "failed", "error"):
            raise RuntimeError(f"task failed: {data.get('failMsg') or data.get('error')}")
        time.sleep(backoff)
        backoff = min(backoff + 2, 15)
    raise RuntimeError(f"task {task_id} timed out after {deadline_sec}s")


def _extract_video_url(data: dict) -> str | None:
    """Walk Kie.ai's response variants to find the video URL.

    Observed shapes:
      - data.resultJson = '{"resultUrls": ["https://..."]}'
      - data.output = {"video_url": "..."} or {"url": "..."}
      - data.resultUrls = ["..."]
    """
    rj = data.get("resultJson")
    if isinstance(rj, str):
        import json as _json
        try:
            parsed = _json.loads(rj)
        except Exception:
            parsed = {}
        urls = parsed.get("resultUrls") or []
        if urls:
            return urls[0]
    output = data.get("output") or {}
    return (
        output.get("video_url")
        or output.get("url")
        or (data.get("resultUrls") or [None])[0]
    )


def download(url: str, dest: pathlib.Path) -> None:
    print(f"[seedance] downloading -> {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    r = requests.get(url, timeout=120, stream=True)
    r.raise_for_status()
    with dest.open("wb") as f:
        for chunk in r.iter_content(chunk_size=64 * 1024):
            if chunk:
                f.write(chunk)
    size_mb = dest.stat().st_size / (1024 * 1024)
    print(f"[seedance] saved {dest.name} — {size_mb:.2f} MB")


def main() -> int:
    if not KIE_API_KEY:
        print("ERROR: KIE_AI_API_KEY not set in env", file=sys.stderr)
        return 2
    if OUTPUT_PATH.exists():
        ans = input(f"{OUTPUT_PATH.name} already exists. Overwrite? [y/N] ")
        if ans.strip().lower() != "y":
            print("aborted.")
            return 0
    task_id = submit_seedance()
    video_url = poll_until_done(task_id)
    download(video_url, OUTPUT_PATH)
    print()
    print(f"=== DONE ===")
    print(f"Output: {OUTPUT_PATH}")
    print(f"Review the clip before committing. If motion is wrong,")
    print(f"refine MOTION_PROMPT in this script and re-run.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
