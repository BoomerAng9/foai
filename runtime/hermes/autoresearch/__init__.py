"""AutoResearch — Hermes-hosted model-currency enforcement layer.

Sibling to Deep Think. Weekly cron + CLI + API that keeps every model
we depend on current with its vendor's latest compatible release.

See autoresearch/README.md for the full design.
"""

from autoresearch.engine import CurrencyReport, DriftEntry, scan_all
from autoresearch.registry import REGISTRY, TrackedModel

__all__ = [
    "CurrencyReport",
    "DriftEntry",
    "REGISTRY",
    "TrackedModel",
    "scan_all",
]
