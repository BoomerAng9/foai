"""Base contract for AutoResearch source adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class SourceFinding:
    """What a source adapter returns when it finds the current flagship
    for a tracked family.
    """

    family: str
    latest_id: str
    release_date: str  # ISO date or "unknown"
    url: str
    summary: str
    capabilities: tuple[str, ...] = ()


class SourceAdapter(ABC):
    """Abstract per-vendor adapter. Concrete classes live in
    autoresearch/sources/<vendor>.py.
    """

    name: str = "base"

    @abstractmethod
    async def latest(self, family: str) -> SourceFinding | None:
        """Return the current flagship for `family`, or None if this
        adapter doesn't track it.
        """
