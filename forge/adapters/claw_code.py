"""Forge adapter — Claw-Code (Rust-canonical CLI wrapper).

Delegates to the existing foai/runtime/claw/claw_client.py for subprocess
invocation of the vendored Claw-Code CLI.
"""

from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import Any

from forge.adapters.base import ExecutionResult, ExecutorAdapter

# Resolve the path to the existing claw_client module
_CLAW_CLIENT_PATH = Path(__file__).resolve().parent.parent.parent / "runtime" / "claw"


def _import_claw_client() -> Any:
    """Dynamically import claw_client from foai/runtime/claw/."""
    import importlib.util
    import sys

    module_path = _CLAW_CLIENT_PATH / "claw_client.py"
    if not module_path.exists():
        msg = f"claw_client.py not found at {module_path}"
        raise ImportError(msg)

    spec = importlib.util.spec_from_file_location("claw_client", str(module_path))
    if spec is None or spec.loader is None:
        msg = "Failed to create module spec for claw_client"
        raise ImportError(msg)

    module = importlib.util.module_from_spec(spec)
    sys.modules["claw_client"] = module
    spec.loader.exec_module(module)
    return module


class ClawCodeAdapter(ExecutorAdapter):
    """Adapter for the Claw-Code CLI (Rust-canonical code agent).

    Wraps claw_client.run_prompt() in an async interface.
    """

    @property
    def name(self) -> str:
        return "claw_code"

    async def execute(
        self,
        prompt: str,
        context: dict[str, object],
        cwd: str,
    ) -> ExecutionResult:
        """Execute a prompt via the Claw-Code CLI.

        Args:
            prompt: Code generation prompt.
            context: Run context metadata.
            cwd: Working directory for the CLI process.

        Returns:
            ExecutionResult normalized from ClawResult.
        """
        claw_client = _import_claw_client()
        start_ms = time.monotonic_ns() // 1_000_000

        # Run in a thread to keep async
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: claw_client.run_prompt(prompt=prompt, cwd=cwd),
        )

        elapsed_ms = (time.monotonic_ns() // 1_000_000) - start_ms

        return ExecutionResult(
            stdout=result.stdout,
            stderr=result.stderr,
            exit_code=result.returncode,
            files_changed=[],  # Claw CLI doesn't report changed files directly
            duration_ms=elapsed_ms,
        )
