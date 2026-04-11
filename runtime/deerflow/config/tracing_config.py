"""
Tracing configuration — STRIPPED of LangSmith and Langfuse.

Telemetry strip performed 2026-04-10 as part of Wave 2 Gate 2.
All external tracing provider configs replaced with no-op stubs.
"""

from pydantic import BaseModel, Field


class TracingConfig(BaseModel):
    """No-op tracing configuration stub."""

    @property
    def is_configured(self) -> bool:
        return False

    @property
    def explicitly_enabled_providers(self) -> list[str]:
        return []

    @property
    def enabled_providers(self) -> list[str]:
        return []

    def validate_enabled(self) -> None:
        pass


_tracing_config: TracingConfig | None = None


def get_tracing_config() -> TracingConfig:
    """Return no-op tracing config."""
    global _tracing_config
    if _tracing_config is None:
        _tracing_config = TracingConfig()
    return _tracing_config


def get_enabled_tracing_providers() -> list[str]:
    return []


def get_explicitly_enabled_tracing_providers() -> list[str]:
    return []


def validate_enabled_tracing_providers() -> None:
    pass


def is_tracing_enabled() -> bool:
    return False
