"""
Tracing factory — STRIPPED of LangSmith and Langfuse integrations.

Telemetry strip performed 2026-04-10 as part of Wave 2 Gate 2.
Original code connected to api.smith.langchain.com and cloud.langfuse.com.
Replaced with no-op stubs that maintain type safety.
"""

from __future__ import annotations

from typing import Any


def build_tracing_callbacks() -> list[Any]:
    """No-op: all external tracing providers have been removed."""
    return []
