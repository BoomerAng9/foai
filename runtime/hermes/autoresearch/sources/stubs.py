"""Stub adapter — fallback for vendors we haven't wired yet.

Returns None for every call so the engine sees "no finding" rather than
an error. Replace by adding a per-vendor adapter file and registering it
in ``sources/__init__.py``.

Previously the project registered five named stubs (fal_models /
recraft_api / google_aistudio / anthropic_api / huggingface_search);
those vendors now have real adapters. The class stays as the canonical
escape hatch for the next family that gets added before its adapter
exists.
"""

from __future__ import annotations

from autoresearch.sources.base import SourceAdapter, SourceFinding


class StubAdapter(SourceAdapter):
    def __init__(self, name: str) -> None:
        self.name = name

    async def latest(self, family: str) -> SourceFinding | None:
        return None
