"""Tests for forge adapters — registration and base class."""

from __future__ import annotations

from forge.adapters.base import ExecutionResult, ExecutorAdapter
from forge.adapters.claw_code import ClawCodeAdapter
from forge.adapters.codex_cli import CodexAdapter
from forge.adapters.gemini_cli import GeminiAdapter
from forge.core.runtime import AdapterRegistry


class TestExecutionResult:
    def test_creation(self) -> None:
        r = ExecutionResult(stdout="ok", stderr="", exit_code=0, duration_ms=100)
        assert r.stdout == "ok"
        assert r.exit_code == 0
        assert r.files_changed == []

    def test_frozen(self) -> None:
        r = ExecutionResult(stdout="ok", stderr="", exit_code=0)
        try:
            r.stdout = "changed"  # type: ignore[misc]
            raise AssertionError("Should be frozen")
        except AttributeError:
            pass


class TestAdapterRegistry:
    def test_register_all_three(self) -> None:
        """All 3 concrete adapters should register with unique names."""
        registry = AdapterRegistry()

        claw = ClawCodeAdapter()
        codex = CodexAdapter()
        gemini = GeminiAdapter()

        registry.register(claw)
        registry.register(codex)
        registry.register(gemini)

        assert len(registry) == 3
        assert "claw_code" in registry
        assert "codex_cli" in registry
        assert "gemini_cli" in registry

    def test_get_adapter(self) -> None:
        registry = AdapterRegistry()
        claw = ClawCodeAdapter()
        registry.register(claw)

        retrieved = registry.get("claw_code")
        assert retrieved is claw
        assert registry.get("nonexistent") is None

    def test_list_adapters(self) -> None:
        registry = AdapterRegistry()
        registry.register(ClawCodeAdapter())
        registry.register(CodexAdapter())
        registry.register(GeminiAdapter())

        names = sorted(registry.list_adapters())
        assert names == ["claw_code", "codex_cli", "gemini_cli"]

    def test_adapter_names(self) -> None:
        assert ClawCodeAdapter().name == "claw_code"
        assert CodexAdapter().name == "codex_cli"
        assert GeminiAdapter().name == "gemini_cli"

    def test_adapters_are_executor_adapter(self) -> None:
        """All adapters must be subclasses of ExecutorAdapter."""
        assert isinstance(ClawCodeAdapter(), ExecutorAdapter)
        assert isinstance(CodexAdapter(), ExecutorAdapter)
        assert isinstance(GeminiAdapter(), ExecutorAdapter)
