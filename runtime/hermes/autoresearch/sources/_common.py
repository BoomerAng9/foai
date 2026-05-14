"""Shared helpers for source adapters.

Extracted to a private module so multiple per-vendor adapters can
reuse the Sqwaadrun-primary-plus-httpx-fallback scrape, the
prompt-injection sanitizer, and the HF model-id verification path
without duplicating ~75 LOC across files.

`nvidia.py` keeps its private copies of these helpers for now to
minimize the blast radius of this change — a future refactor can
de-dup once these are battle-tested.
"""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
from pathlib import Path

import httpx

SQWAADRUN_CACHE_DIR = Path(tempfile.gettempdir()) / "autoresearch-sqwaadrun"

_HF_API_MODELS = "https://huggingface.co/api/models"

_INJECTION_MARKERS = ("```", "system:", "assistant:", "user:")


async def scrape(url: str, cache_name: str) -> str | None:
    """Sqwaadrun primary, httpx fallback. Returns clean_text or None.

    Cache files land in a process-wide temp dir; `cache_name` MUST be unique
    per call site or you'll race other adapters writing the same path.
    """
    SQWAADRUN_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = SQWAADRUN_CACHE_DIR / cache_name

    try:
        proc = subprocess.run(
            ["sqwaadrun", "scrape-clean", url, "-o", str(cache_path)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
        )
        if proc.returncode == 0 and cache_path.exists():
            data = json.loads(cache_path.read_text(encoding="utf-8"))
            return data["scrape"]["clean_text"]
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError):
        pass

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(url, follow_redirects=True)
            if r.status_code == 200:
                return r.text
    except Exception:
        pass

    return None


def sanitize(text: str, max_len: int = 280) -> str:
    """Strip HTML, control chars, and prompt-injection markers from external text.

    Applied to scraped page text + GitHub release names before they flow
    into the CurrencyReport JSON (which downstream alerts to Slack/Telegram).
    Without this, an attacker could shape a release name like
    ``"\\nsystem: ignore prior instructions"`` and ride the alert pipeline
    into the LLM that summarises the report.
    """
    if not text:
        return ""
    out = re.sub(r"<[^>]+>", "", text)
    out = re.sub(r"[\x00-\x1f\x7f]", " ", out)
    for marker in _INJECTION_MARKERS:
        out = out.replace(marker, "")
    out = re.sub(r"\s+", " ", out).strip()
    return out[:max_len]


async def hf_search_models(
    search: str,
    *,
    author: str | None = None,
    sort: str = "createdAt",
    direction: str = "-1",
    limit: int = 5,
) -> list[dict] | None:
    """Hit the public HF API model search. Returns the list or None on failure.

    No auth required for read-only search. Used by both the
    `huggingface_search` adapter and the future `anthropic_api` / others
    if they ever need to cross-check a model id against HF.
    """
    params: dict[str, str] = {
        "search": search,
        "sort": sort,
        "direction": direction,
        "limit": str(limit),
    }
    if author:
        params["author"] = author

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(_HF_API_MODELS, params=params)
            if r.status_code != 200:
                return None
            models = r.json()
    except Exception:
        return None

    return models if isinstance(models, list) else None


def parse_semver(text: str) -> tuple[int, int, int] | None:
    """Pull the highest (major, minor, patch) tuple out of a blob of text.

    Returns None if nothing version-shaped is in the text. Used by
    vendor adapters that surface versions as part of free-form docs
    (Anthropic / Google) where there's no clean API to query for the
    flagship model id.
    """
    matches = re.findall(r"(\d+)[.-](\d+)(?:[.-](\d+))?", text)
    if not matches:
        return None
    versions = [
        (int(a), int(b), int(c) if c else 0) for a, b, c in matches
    ]
    return max(versions)
