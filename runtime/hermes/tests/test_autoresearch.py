"""Smoke tests for AutoResearch — registry integrity + engine behavior.

Network-dependent adapter tests live separately (mark them with a
decorator and skip in CI if you add them). These pure unit tests
verify wiring, registry consistency, and the classification logic.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest

# Make hermes package layout importable for tests
HERMES_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(HERMES_ROOT))

from autoresearch.engine import DriftEntry, _classify  # noqa: E402
from autoresearch.registry import REGISTRY, TrackedModel, by_family, by_source  # noqa: E402
from autoresearch.sources import ADAPTERS  # noqa: E402
from autoresearch.sources.base import SourceFinding  # noqa: E402


class TestRegistry:
    def test_registry_is_non_empty(self):
        assert len(REGISTRY) >= 1

    def test_family_ids_are_unique(self):
        ids = [m.family for m in REGISTRY]
        assert len(ids) == len(set(ids)), "family ids must be unique"

    def test_every_model_source_has_an_adapter(self):
        for m in REGISTRY:
            assert m.source in ADAPTERS, (
                f"family '{m.family}' points at source '{m.source}' "
                f"which has no adapter in autoresearch/sources/__init__.py"
            )

    def test_by_family_lookup(self):
        first = REGISTRY[0]
        assert by_family(first.family) == first
        assert by_family("not-a-real-family-xyz") is None

    def test_by_source_filters(self):
        assert len(by_source("nvidia_hf")) >= 1  # nemotron tracked
        # Stubs hold real families too — don't assert empty on unused stubs.

    def test_pinned_ids_are_plausible(self):
        for m in REGISTRY:
            assert m.pinned_id.strip() != ""
            assert m.role.strip() != ""
            assert m.consumers, f"family '{m.family}' has no consumers"


class TestClassification:
    def _model(self, pinned: str, blocker: str = "") -> TrackedModel:
        return TrackedModel(
            family="test",
            pinned_id=pinned,
            role="test",
            consumers=("x",),
            source="nvidia_hf",
            upgrade_blocker=blocker,
        )

    def _finding(self, latest: str) -> SourceFinding:
        return SourceFinding(
            family="test",
            latest_id=latest,
            release_date="2026-01-01",
            url="https://example.com",
            summary="test",
        )

    def test_current_when_latest_matches_pinned(self):
        m = self._model("nvidia/Nemotron-3-Nano-30B-A3B-Base-BF16")
        f = self._finding("nvidia/Nemotron-3-Nano-30B-A3B-Base-BF16")
        assert _classify(m, f) == "current"

    def test_current_when_latest_is_substring_of_pinned(self):
        # Pinned includes extra suffix but core id matches — still current
        m = self._model("nvidia/Nemotron-3-Super-v1.2")
        f = self._finding("Nemotron-3-Super")
        assert _classify(m, f) == "current"

    def test_upgrade_candidate_when_latest_differs(self):
        m = self._model("nvidia/Nemotron-3-Nano-30B-A3B-Base-BF16")
        f = self._finding("nvidia/Nemotron-3-Super")
        assert _classify(m, f) == "upgrade-candidate"

    def test_blocker_when_upgrade_blocker_is_set(self):
        m = self._model(
            "nvidia/Nemotron-3-Nano-30B-A3B-Base-BF16",
            blocker="ACHEEVY legal review required before Super upgrade",
        )
        f = self._finding("nvidia/Nemotron-3-Super")
        assert _classify(m, f) == "blocker"


class TestDriftEntry:
    def test_drift_entry_fields(self):
        e = DriftEntry(
            family="nemotron",
            pinned_id="nvidia/Nemotron-3-Nano-30B",
            latest_id="nvidia/Nemotron-3-Super",
            role="PersonaPlex",
            consumers=("gateway",),
            severity="upgrade-candidate",
            summary="newer flagship detected",
            source_url="https://huggingface.co/nvidia",
        )
        assert e.severity == "upgrade-candidate"
        assert "nemotron" in e.family


class TestCLIImportable:
    """Ensure the CLI module is importable without running any network calls."""

    def test_cli_imports(self):
        from autoresearch import cli  # noqa: F401

    def test_router_imports(self):
        from routers.autoresearch_router import router  # noqa: F401

        assert router.prefix == "/autoresearch"
