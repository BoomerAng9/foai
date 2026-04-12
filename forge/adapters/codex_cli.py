"""Forge adapter — Codex CLI (OpenAI code executor).

Delegates to the existing foai/runtime/mcp/codex_tool.py for code generation
and execution via the Codex CLI or OpenAI API.
"""

from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import Any

from forge.adapters.base import ExecutionResult, ExecutorAdapter

# Resolve the path to the existing codex_tool module
_CODEX_TOOL_PATH = Path(__file__).resolve().parent.parent.parent / "runtime" / "mcp"


def _import_codex_tool() -> Any:
    """Dynamically import codex_tool from foai/runtime/mcp/."""
    import importlib.util
    import sys

    module_path = _CODEX_TOOL_PATH / "codex_tool.py"
    if not module_path.exists():
        msg = f"codex_tool.py not found at {module_path}"
        raise ImportError(msg)

    spec = importlib.util.spec_from_file_location("codex_tool", str(module_path))
    if spec is None or spec.loader is None:
        msg = "Failed to create module spec for codex_tool"
        raise ImportError(msg)

    module = importlib.util.module_from_spec(spec)
    sys.modules["codex_tool"] = module
    spec.loader.exec_module(module)
    return module


class CodexAdapter(ExecutorAdapter):
    """Adapter for OpenAI Codex (Python/data/ML code executor).

    Wraps codex_tool.generate_code() and codex_tool.execute_code()
    in an async interface.
    """

    @property
    def name(self) -> str:
        return "codex_cli"

    async def execute(
        self,
        prompt: str,
        context: dict[str, object],
        cwd: str,
    ) -> ExecutionResult:
        """Generate and optionally execute code via Codex.

        The adapter first generates code from the prompt, then executes it
        if the generation succeeds.

        Args:
            prompt: Code generation prompt.
            context: Run context metadata.
            cwd: Working directory for execution.

        Returns:
            ExecutionResult normalized from CodexResult.
        """
        codex_tool = _import_codex_tool()
        start_ms = time.monotonic_ns() // 1_000_000

        loop = asyncio.get_running_loop()

        # Step 1: Generate code
        gen_result = await loop.run_in_executor(
            None,
            lambda: codex_tool.generate_code(prompt=prompt),
        )

        if not gen_result.success or not gen_result.generated_code:
            elapsed_ms = (time.monotonic_ns() // 1_000_000) - start_ms
            return ExecutionResult(
                stdout=gen_result.output,
                stderr=gen_result.error or "Code generation failed",
                exit_code=1,
                files_changed=[],
                duration_ms=elapsed_ms,
            )

        # Step 2: Execute the generated code
        exec_result = await loop.run_in_executor(
            None,
            lambda: codex_tool.execute_code(
                language="python",
                code=gen_result.generated_code,
            ),
        )

        elapsed_ms = (time.monotonic_ns() // 1_000_000) - start_ms

        return ExecutionResult(
            stdout=exec_result.output,
            stderr=exec_result.error or "",
            exit_code=0 if exec_result.success else 1,
            files_changed=[],
            duration_ms=elapsed_ms,
        )
