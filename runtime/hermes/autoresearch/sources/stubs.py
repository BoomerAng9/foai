"""Stub adapters — one per vendor we plan to track but haven't wired yet.

Each stub returns None for every call, so the engine sees "no finding"
rather than an error. Replace with a real adapter when the integration
work is prioritized.

TODO per adapter:
  - fal_models         → scrape fal.ai/models listing for Seedance/DaVinci versions
  - recraft_api        → hit external.api.recraft.ai/v1/models listing
  - google_aistudio    → scrape ai.google.dev/gemini-api/docs/models (JS-rendered; may need Playwright)
  - anthropic_api      → fetch docs.claude.com/en/docs/models-overview markdown
  - huggingface_search → search huggingface.co/models?search=<family> sorted by downloads
"""

from __future__ import annotations

from autoresearch.sources.base import SourceAdapter, SourceFinding


class StubAdapter(SourceAdapter):
    def __init__(self, name: str) -> None:
        self.name = name

    async def latest(self, family: str) -> SourceFinding | None:
        return None
