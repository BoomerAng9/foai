"""Anthropic source adapter — fetches the docs models-overview page.

Anthropic does not publish an open model-listing JSON API; the
canonical source of truth for "what's the current flagship Claude
model" is the docs page at docs.claude.com/en/docs/models-overview.

Strategy:
1. Fetch the docs page (Sqwaadrun primary; httpx fallback).
2. Match every ``claude-(opus|sonnet|haiku)-X-Y`` token in the text.
3. Return the highest version for the family-mapped tier.

Registry maps family ``claude`` to this adapter via ``source="anthropic_api"``
and pins to ``claude-opus-4-7`` today. Adapter returns SourceFinding
only when its highest detected Opus version differs from / exceeds
the pinned id; otherwise the engine still gets a finding (current)
and classifies normally.
"""

from __future__ import annotations

import re

from autoresearch.sources.base import SourceAdapter, SourceFinding
from autoresearch.sources._common import sanitize, scrape


_DOCS_URL = "https://docs.claude.com/en/docs/models-overview"

# Matches the canonical Claude model id form: claude-<tier>-<major>-<minor>
# (e.g. claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5). Anthropic's
# published canon — see Anthropic docs.
#
# Minor version is constrained to 1-2 digits so dated-alias forms like
# claude-opus-4-20250514 don't get parsed as version (major=4, minor=20250514).
# Anthropic publishes both the canonical id (claude-opus-4-7) and a dated
# alias on the docs page; we only want the canonical.
_MODEL_PATTERN = re.compile(
    r"claude-(opus|sonnet|haiku)-(\d+)-(\d{1,2})(?!\d)",
    re.IGNORECASE,
)

_FAMILY_TIER = {
    "claude": "opus",  # family=claude pins to the Opus flagship by default
}


class AnthropicDocsAdapter(SourceAdapter):
    """Scrapes the Anthropic models-overview docs page for the flagship.

    Returns the highest-version model id for the tier the family points
    at (defaults to Opus for ``family=claude``).
    """

    name = "anthropic_api"

    async def latest(self, family: str) -> SourceFinding | None:
        tier = _FAMILY_TIER.get(family)
        if tier is None:
            return None

        text = await scrape(_DOCS_URL, "anthropic-docs-models.html")
        if not text:
            return None

        # Collect (tier, major, minor) for the requested tier only.
        candidates: list[tuple[int, int, str]] = []
        for m in _MODEL_PATTERN.finditer(text):
            if m.group(1).lower() != tier:
                continue
            major = int(m.group(2))
            minor = int(m.group(3))
            candidates.append((major, minor, m.group(0)))

        if not candidates:
            return None

        # Highest (major, minor) wins.
        candidates.sort(key=lambda t: (t[0], t[1]), reverse=True)
        major, minor, raw = candidates[0]
        model_id = f"claude-{tier}-{major}-{minor}"

        return SourceFinding(
            family=family,
            latest_id=model_id,
            release_date="unknown",  # docs page doesn't surface dates inline
            url=_DOCS_URL,
            summary=sanitize(
                f"Highest {tier} version on Anthropic models-overview docs: "
                f"'{raw}' (resolved to '{model_id}')."
            ),
            capabilities=_infer_caps(tier),
        )


def _infer_caps(tier: str) -> tuple[str, ...]:
    if tier == "opus":
        return ("heavy-reasoning", "long-context", "tool-use")
    if tier == "sonnet":
        return ("balanced-reasoning", "tool-use")
    if tier == "haiku":
        return ("fast-inference", "low-cost", "tool-use")
    return ()
