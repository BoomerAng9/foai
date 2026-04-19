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
from pathlib import Path

import httpx

from autoresearch.sources.base import SourceAdapter, SourceFinding

SQWAADRUN_CACHE_DIR = Path("/tmp/autoresearch-sqwaadrun")


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

        return SourceFinding(
            family="nemotron",
            latest_id=f"nvidia/Nemotron-{gen}-{label.split()[-1] or 'Super'}",
            release_date="unknown",
            url=self._ORG_URL,
            summary=(
                f"Highest-ranked Nemotron reference on NVIDIA HF org page: "
                f"'{label}' (generation {gen}, tier rank {rank})."
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
            summary=(data.get("name") or tag)[:200],
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
