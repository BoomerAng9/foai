"""fal.ai source adapter — surfaces Seedance / DaVinci-MagiHuman flagships.

fal.ai's public model catalog lives at fal.ai/models. There's a less-
documented JSON listing at ``/api/_next/data/...`` that breaks on every
Next.js build hash, so the adapter prefers the visible page scrape.

Returns SourceFinding for families ``seedance`` and
``davinci-magihuman``. Other fal-hosted models can be wired by
extending ``_FAMILY_QUERY``.
"""

from __future__ import annotations

import re

from autoresearch.sources.base import SourceAdapter, SourceFinding
from autoresearch.sources._common import sanitize, scrape


_LISTING_URL = "https://fal.ai/models"

# Each tracked family maps to (search_query, model-id pattern). The
# pattern picks the highest version-tagged variant we find on the page.
_FAMILY_QUERY: dict[str, tuple[str, re.Pattern[str]]] = {
    "seedance": (
        "seedance",
        re.compile(r"seedance[-/](\d+)\.(\d+)", re.IGNORECASE),
    ),
    "davinci-magihuman": (
        "davinci",
        # davinci-magihuman is a static id (no public version axis); we
        # match the name to verify presence, then return the family id.
        re.compile(r"(davinci[-_]?magihuman)", re.IGNORECASE),
    ),
}


class FalModelsAdapter(SourceAdapter):
    name = "fal_models"

    async def latest(self, family: str) -> SourceFinding | None:
        spec = _FAMILY_QUERY.get(family)
        if spec is None:
            return None
        query, pattern = spec

        # One scrape per family — fal listings are big enough we don't
        # want to refetch within a single run, but Hermes only runs the
        # scheduler weekly so cache freshness isn't a concern.
        text = await scrape(_LISTING_URL, f"fal-models-{family}.html")
        if not text:
            return None

        if family == "seedance":
            return _resolve_seedance(family, text, pattern)
        if family == "davinci-magihuman":
            return _resolve_magihuman(family, text, pattern)
        return None


def _resolve_seedance(
    family: str, text: str, pattern: re.Pattern[str]
) -> SourceFinding | None:
    """Pick the highest (major, minor) seedance variant present."""
    candidates: list[tuple[int, int, str]] = []
    for m in pattern.finditer(text):
        major = int(m.group(1))
        minor = int(m.group(2))
        candidates.append((major, minor, m.group(0).lower()))
    if not candidates:
        return None
    candidates.sort(key=lambda t: (t[0], t[1]), reverse=True)
    major, minor, raw = candidates[0]
    model_id = f"seedance-{major}.{minor} (via fal.ai)"
    return SourceFinding(
        family=family,
        latest_id=model_id,
        release_date="unknown",
        url=_LISTING_URL,
        summary=sanitize(
            f"Highest seedance version on fal.ai/models: '{raw}' "
            f"(resolved to '{model_id}')."
        ),
        capabilities=("text-to-video", "image-to-video", "subject-preserving"),
    )


def _resolve_magihuman(
    family: str, text: str, pattern: re.Pattern[str]
) -> SourceFinding | None:
    """davinci-magihuman is a flat id; verify presence + report unchanged."""
    m = pattern.search(text)
    if not m:
        return None
    return SourceFinding(
        family=family,
        latest_id="davinci-magihuman (via fal.ai)",
        release_date="unknown",
        url=_LISTING_URL,
        summary=sanitize(
            f"davinci-magihuman present on fal.ai/models (match: '{m.group(0)}')."
        ),
        capabilities=("talking-head", "lip-sync"),
    )
