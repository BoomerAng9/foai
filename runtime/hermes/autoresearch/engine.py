"""AutoResearch engine — scans all source adapters, diffs against the
registry, returns a CurrencyReport.

Single entry point: `scan_all() -> CurrencyReport`.
Called by:
  - Hermes scheduler (weekly Monday 06:00 UTC)
  - CLI `python -m autoresearch.cli check`
  - Hermes router `GET /autoresearch/report`
"""

from __future__ import annotations

import asyncio
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

from autoresearch.registry import REGISTRY, TrackedModel
from autoresearch.sources import ADAPTERS
from autoresearch.sources.base import SourceFinding


# ─── Output shapes ──────────────────────────────────────────────────


@dataclass(frozen=True)
class DriftEntry:
    family: str
    pinned_id: str
    latest_id: str
    role: str
    consumers: tuple[str, ...]
    severity: str  # "current" | "upgrade-candidate" | "unknown" | "blocker"
    summary: str
    source_url: str
    upgrade_blocker: str = ""


@dataclass
class CurrencyReport:
    scanned_at: str
    total_tracked: int
    total_checked: int
    entries: list[DriftEntry] = field(default_factory=list)

    @property
    def upgrade_candidates(self) -> list[DriftEntry]:
        return [e for e in self.entries if e.severity == "upgrade-candidate"]

    @property
    def current(self) -> list[DriftEntry]:
        return [e for e in self.entries if e.severity == "current"]

    def to_dict(self) -> dict[str, Any]:
        return {
            "scanned_at": self.scanned_at,
            "total_tracked": self.total_tracked,
            "total_checked": self.total_checked,
            "upgrade_candidates": [asdict(e) for e in self.upgrade_candidates],
            "current": [asdict(e) for e in self.current],
            "unknown_or_blocker": [
                asdict(e)
                for e in self.entries
                if e.severity in ("unknown", "blocker")
            ],
        }


# ─── Core scan ──────────────────────────────────────────────────────


async def scan_all() -> CurrencyReport:
    """Check every registered model against its source adapter."""
    tasks = [_check_one(m) for m in REGISTRY]
    entries = await asyncio.gather(*tasks, return_exceptions=False)
    return CurrencyReport(
        scanned_at=datetime.now(timezone.utc).isoformat(),
        total_tracked=len(REGISTRY),
        total_checked=sum(1 for e in entries if e.severity != "unknown"),
        entries=list(entries),
    )


async def _check_one(model: TrackedModel) -> DriftEntry:
    adapter = ADAPTERS.get(model.source)
    if adapter is None:
        return DriftEntry(
            family=model.family,
            pinned_id=model.pinned_id,
            latest_id="",
            role=model.role,
            consumers=model.consumers,
            severity="unknown",
            summary=f"No source adapter registered for '{model.source}'",
            source_url="",
            upgrade_blocker=model.upgrade_blocker,
        )

    try:
        finding: SourceFinding | None = await adapter.latest(model.family)
    except Exception as e:
        return DriftEntry(
            family=model.family,
            pinned_id=model.pinned_id,
            latest_id="",
            role=model.role,
            consumers=model.consumers,
            severity="unknown",
            summary=f"Adapter '{adapter.name}' raised: {type(e).__name__}: {e}",
            source_url="",
            upgrade_blocker=model.upgrade_blocker,
        )

    if finding is None:
        return DriftEntry(
            family=model.family,
            pinned_id=model.pinned_id,
            latest_id="",
            role=model.role,
            consumers=model.consumers,
            severity="unknown",
            summary=(
                f"Adapter '{adapter.name}' found no finding for "
                f"family '{model.family}' — wire a real adapter."
            ),
            source_url="",
            upgrade_blocker=model.upgrade_blocker,
        )

    severity = _classify(model, finding)
    return DriftEntry(
        family=model.family,
        pinned_id=model.pinned_id,
        latest_id=finding.latest_id,
        role=model.role,
        consumers=model.consumers,
        severity=severity,
        summary=finding.summary,
        source_url=finding.url,
        upgrade_blocker=model.upgrade_blocker,
    )


def _classify(model: TrackedModel, finding: SourceFinding) -> str:
    """Upgrade-candidate if pinned != latest AND no blocker. Else current or blocker."""
    if model.upgrade_blocker:
        return "blocker"

    # Normalize both IDs for comparison (case + whitespace insensitive)
    pinned_norm = _normalize(model.pinned_id)
    latest_norm = _normalize(finding.latest_id)

    if latest_norm and latest_norm not in pinned_norm and pinned_norm not in latest_norm:
        return "upgrade-candidate"
    return "current"


def _normalize(s: str) -> str:
    return "".join(ch for ch in s.lower() if ch.isalnum())
