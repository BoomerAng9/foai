"""Forge adapter — Gemini CLI (general-purpose code/content generator).

Delegates to the existing foai/runtime/mcp/gemini_tool.py for content
generation via the Gemini CLI or Google GenAI SDK.
"""

from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import Any

from forge.adapters.base import ExecutionResult, ExecutorAdapter

# Resolve the path to the existing gemini_tool module
_GEMINI_TOOL_PATH = Path(__file__).resolve().parent.parent.parent / "runtime" / "mcp"


def _import_gemini_tool() -> Any:
    """Dynamically import gemini_tool from foai/runtime/mcp/."""
    import importlib.util
    import sys

    module_path = _GEMINI_TOOL_PATH / "gemini_tool.py"
    if not module_path.exists():
        msg = f"gemini_tool.py not found at {module_path}"
        raise ImportError(msg)

    spec = importlib.util.spec_from_file_location("gemini_tool", str(module_path))
    if spec is None or spec.loader is None:
        msg = "Failed to create module spec for gemini_tool"
        raise ImportError(msg)

    module = importlib.util.module_from_spec(spec)
    sys.modules["gemini_tool"] = module
    spec.loader.exec_module(module)
    return module


class GeminiAdapter(ExecutorAdapter):
    """Adapter for Gemini (general-purpose code and content generation).

    Wraps gemini_tool.generate() in an async interface.
    Default model: gemini-3.1-flash (per latest-model-only rule).
    """

    @property
    def name(self) -> str:
        return "gemini_cli"

    async def execute(
        self,
        prompt: str,
        context: dict[str, object],
        cwd: str,
    ) -> ExecutionResult:
        """Generate content via Gemini.

        Args:
            prompt: Generation prompt.
            context: Run context metadata.
            cwd: Working directory (used for file path resolution).

        Returns:
            ExecutionResult normalized from GeminiResult.
        """
        gemini_tool = _import_gemini_tool()
        start_ms = time.monotonic_ns() // 1_000_000

        loop = asyncio.get_running_loop()

        result = await loop.run_in_executor(
            None,
            lambda: gemini_tool.generate(prompt=prompt),
        )

        elapsed_ms = (time.monotonic_ns() // 1_000_000) - start_ms

        return ExecutionResult(
            stdout=result.output,
            stderr=result.error or "",
            exit_code=0 if result.success else 1,
            files_changed=[],
            duration_ms=elapsed_ms,
        )
