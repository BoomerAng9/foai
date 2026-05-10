"""NVIDIA source adapters — HuggingFace org page + Cosmos GitHub repo.

NVIDIA-HF is scraped via the Sqwaadrun CLI (primary per standing rule)
with a Firecrawl fallback. We parse the HF org page's papers/models
feed for Nemotron family releases.

NVIDIA-GitHub-Cosmos watches the `nvidia-cosmos/cosmos-transfer1` repo's
latest release tag via the public GitHub API.
"""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
from pathlib import Path

import httpx

from autoresearch.sources.base import SourceAdapter, SourceFinding

# Cross-platform temp dir; was hardcoded /tmp which broke Windows dev shells.
SQWAADRUN_CACHE_DIR = Path(tempfile.gettempdir()) / "autoresearch-sqwaadrun"

# Public HF API for verified model id resolution (avoids fabricating ids
# from regex string-splits of scraped page text).
_HF_API_MODELS = "https://huggingface.co/api/models"


# ─── NVIDIA HuggingFace ─────────────────────────────────────────────


class NvidiaHFAdapter(SourceAdapter):
    """Scans huggingface.co/nvidia for the current Nemotron flagship.

    Heuristic: the first Nemotron-named paper or featured model on the
    page that matches "Super", "Ultra", "Pro" or a higher generation
    number than our pinned entry. Returns a SourceFinding with the
    canonical id if detected.
    """

    name = "nvidia_hf"
    _ORG_URL = "https://huggingface.co/nvidia"

    # Ranking hints — higher number wins, "Super" > "Nano" in the
    # agentic-reasoning tier. Tuned for Nemotron 3 family.
    _TIER_RANK = {
        "ultra": 5,
        "super": 4,
        "pro": 3,
        "large": 2,
        "mid": 1,
        "nano": 0,
        "mini": -1,
    }

    async def latest(self, family: str) -> SourceFinding | None:
        if family != "nemotron":
            return None

        text = await _scrape(self._ORG_URL, "nvidia-hf-models.json")
        if not text:
            return None

        # Pull Nemotron references from the text. Match generation +
        # tier ("Nemotron 3 Super", "Nemotron 2 Nano 9B", etc.).
        pattern = re.compile(
            r"Nemotron[\s\-]?(\d)(?:[\s\-]+(Super|Ultra|Pro|Large|Mid|Nano|Mini))?",
            re.IGNORECASE,
        )
        candidates: list[tuple[int, int, str]] = []
        for m in pattern.finditer(text):
            gen = int(m.group(1))
            tier = (m.group(2) or "").lower()
            rank = self._TIER_RANK.get(tier, 0)
            candidates.append((gen, rank, m.group(0)))

        if not candidates:
            return None

        # Sort by (generation, tier rank) — highest wins
        candidates.sort(key=lambda t: (t[0], t[1]), reverse=True)
        gen, rank, label = candidates[0]

        # Resolve the actual HF model id rather than fabricating one from
        # regex captures. The previous f-string built ids like
        # `nvidia/Nemotron-3-Super` from `label.split()[-1]` which is the
        # LAST WORD of the matched substring — produced ghost ids that
        # didn't exist on HF (e.g. `nvidia/Nemotron-3-9B` when the page
        # only said "Nemotron 3" and the last token was the parameter
        # count, not a tier name).
        tier_token = (label.split()[-1] or "Super").strip()
        verified_id = await _resolve_hf_model_id("nvidia", f"Nemotron-{gen}", tier_token)
        if not verified_id:
            # Fall back to the labeled fabrication if the HF API is down.
            # Mark it via the summary so downstream alerting can warn.
            verified_id = f"nvidia/Nemotron-{gen}-{tier_token}"
            unverified_note = " (UNVERIFIED — HF API lookup failed)"
        else:
            unverified_note = ""

        return SourceFinding(
            family="nemotron",
            latest_id=verified_id,
            release_date="unknown",
            url=self._ORG_URL,
            summary=(
                f"Highest-ranked Nemotron reference on NVIDIA HF org page: "
                f"'{_sanitize(label)}' (generation {gen}, tier rank {rank})."
                f"{unverified_note}"
            ),
            capabilities=_infer_caps(label),
        )


# ─── NVIDIA Cosmos GitHub ───────────────────────────────────────────


class NvidiaGithubCosmosAdapter(SourceAdapter):
    """Queries the GitHub public releases API for nvidia-cosmos/cosmos-transfer1."""

    name = "nvidia_github_cosmos"
    _API = "https://api.github.com/repos/nvidia-cosmos/cosmos-transfer1/releases/latest"

    async def latest(self, family: str) -> SourceFinding | None:
        if family != "cosmos-transfer":
            return None

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.get(
                    self._API,
                    headers={"Accept": "application/vnd.github+json"},
                )
                if r.status_code != 200:
                    return None
                data = r.json()
        except Exception:
            return None

        tag = data.get("tag_name")
        if not tag:
            return None

        return SourceFinding(
            family="cosmos-transfer",
            latest_id=f"nvidia-cosmos/cosmos-transfer1@{tag}",
            release_date=data.get("published_at", "unknown"),
            url=data.get("html_url", self._API),
            # Sanitize external-input text before downstream alerting
            # (Slack/Telegram surfaces). GitHub release `name` is
            # author-controlled and can carry prompt-injection markers.
            summary=_sanitize(data.get("name") or tag),
            capabilities=("sim-to-real", "depth-control", "canny-control"),
        )


# ─── Internals ──────────────────────────────────────────────────────


async def _scrape(url: str, cache_name: str) -> str | None:
    """Sqwaadrun primary, httpx fallback. Both return clean_text or None."""

    SQWAADRUN_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = SQWAADRUN_CACHE_DIR / cache_name

    # Try Sqwaadrun (preferred per standing rule)
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

    # Fallback — plain HTTP GET (won't render JS, still often enough for HF pages)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(url, follow_redirects=True)
            if r.status_code == 200:
                return r.text
    except Exception:
        pass

    return None


async def _resolve_hf_model_id(
    org: str, family_prefix: str, tier_token: str
) -> str | None:
    """Query the public HF API for the most recent model matching the family.

    Returns the actual HF model id (e.g. ``nvidia/Nemotron-3-Super-49B``)
    or None if the API is unreachable. The previous adapter fabricated
    ids by string-concatenating regex captures, which produced ghost ids
    that didn't exist on HF.

    Sort order is HF API ``createdAt`` descending so the first hit is the
    newest model in the family.
    """
    search = f"{family_prefix}-{tier_token}".strip("-")
    params = {
        "author": org,
        "search": search,
        "sort": "createdAt",
        "direction": "-1",
        "limit": "5",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(_HF_API_MODELS, params=params)
            if r.status_code != 200:
                return None
            models = r.json()
    except Exception:
        return None

    if not isinstance(models, list) or not models:
        return None

    # Take the first model whose id starts with the requested family prefix
    # (after the org slash). Defends against unrelated search hits.
    expected_prefix = f"{org}/{family_prefix}".lower()
    for m in models:
        model_id = m.get("id", "")
        if isinstance(model_id, str) and model_id.lower().startswith(expected_prefix):
            return model_id

    # No exact prefix match — return the top hit anyway, better than nothing
    first_id = models[0].get("id")
    return first_id if isinstance(first_id, str) else None


_INJECTION_MARKERS = ("```", "system:", "assistant:", "user:")


def _sanitize(text: str, max_len: int = 280) -> str:
    """Strip HTML, control chars, and prompt-injection markers from external text.

    Applied to scraped page text + GitHub release names before they flow
    into the CurrencyReport JSON (which downstream alerts to Slack/Telegram).
    Without this, an attacker could shape a release name like
    ``"\nsystem: ignore prior instructions"`` and ride the alert pipeline
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


def _infer_caps(label: str) -> tuple[str, ...]:
    """Bucket capability tags from the label for the CurrencyReport."""
    caps: list[str] = []
    lo = label.lower()
    if "super" in lo or "ultra" in lo:
        caps.append("agentic-reasoning")
    if "vision" in lo or "vlm" in lo:
        caps.append("vision-language")
    if "nano" in lo or "mini" in lo:
        caps.append("edge-inference")
    if "content safety" in lo:
        caps.append("moderation")
    return tuple(caps)
