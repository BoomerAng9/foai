"""Google AI Studio source adapter — scrapes the Gemini models doc page.

The Gemini API docs at ai.google.dev/gemini-api/docs/models are the
authoritative list of currently-served Gemini variants. The page is
JS-rendered in some browsers; the Sqwaadrun scraper handles that
when available. httpx fallback grabs the raw HTML — typically still
enough to match the canonical model ids (Google embeds them as text
in code blocks).

Returns SourceFinding for family ``gemini``. Family is pinned to
``gemini-3.1-flash`` today; adapter surfaces the highest version it
finds for the tier mapped to the family.
"""

from __future__ import annotations

import re

from autoresearch.sources.base import SourceAdapter, SourceFinding
from autoresearch.sources._common import sanitize, scrape


_DOCS_URL = "https://ai.google.dev/gemini-api/docs/models"

# Matches gemini-<major>.<minor>-<tier>[-<sub>] where tier is one of the
# canonical Google identifiers. The optional sub-tier keeps things like
# "flash-lite" and "flash-live" addressable.
_MODEL_PATTERN = re.compile(
    r"gemini-(\d+)\.(\d+)-(pro|flash|flash-lite|flash-live|nano)(?:-(\w+))?",
    re.IGNORECASE,
)

# Family pins to a tier; if your registry adds gemini-pro, gemini-flash-lite
# etc as separate families, extend this map.
_FAMILY_TIER = {
    "gemini": "flash",
}


class GoogleAIStudioAdapter(SourceAdapter):
    name = "google_aistudio"

    async def latest(self, family: str) -> SourceFinding | None:
        tier = _FAMILY_TIER.get(family)
        if tier is None:
            return None

        text = await scrape(_DOCS_URL, "google-aistudio-models.html")
        if not text:
            return None

        # We track only the bare tier (e.g. gemini-3.1-flash) — derivative
        # variants like flash-image / flash-live are different product
        # surfaces with their own pinned ids; surfacing them here as
        # "the latest flash" creates false-positive drift signals (the
        # docs page lists flash-image more prominently than bare flash
        # in places, but they're not substitutes).
        candidates: list[tuple[int, int, str]] = []
        for m in _MODEL_PATTERN.finditer(text):
            if m.group(3).lower() != tier:
                continue
            sub = (m.group(4) or "").lower()
            if sub:
                continue  # skip derivative variants
            major = int(m.group(1))
            minor = int(m.group(2))
            candidates.append((major, minor, m.group(0).lower()))

        if not candidates:
            return None

        candidates.sort(key=lambda t: (t[0], t[1]), reverse=True)
        major, minor, raw = candidates[0]
        model_id = f"gemini-{major}.{minor}-{tier}"

        return SourceFinding(
            family=family,
            latest_id=model_id,
            release_date="unknown",
            url=_DOCS_URL,
            summary=sanitize(
                f"Highest gemini-{tier} version on AI Studio docs: '{raw}' "
                f"(resolved to '{model_id}')."
            ),
            capabilities=_infer_caps(tier),
        )


def _infer_caps(tier: str) -> tuple[str, ...]:
    base = ("tool-use", "multimodal")
    if tier == "pro":
        return base + ("heavy-reasoning", "long-context")
    if tier == "flash":
        return base + ("fast-inference", "1m-context")
    if tier in ("flash-lite", "nano"):
        return base + ("low-cost", "fast-inference")
    return base
