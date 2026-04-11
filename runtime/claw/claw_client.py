"""
claw_client.py — Python subprocess wrapper around the vendored Claw-Code CLI.

Exposes:
    run_prompt(prompt, cwd)          — one-shot prompt execution
    run_session(session_id, prompt, cwd) — named session prompt
    resume_session(session_id)       — resume an existing session

Uses subprocess.run with timeout, captures stdout/stderr, parses JSON output
where available.
"""

from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

# Default timeout for CLI invocations (seconds).
DEFAULT_TIMEOUT_SECONDS = 300

# Path to the vendored Claw-Code CLI binary or entry point.
# On systems with Rust compiled: the rusty-claude-cli binary.
# Fallback: the Python bootstrap entry point.
_VENDORED_ROOT = Path(__file__).resolve().parent.parent / "claw-code-vendored"
_RUST_BINARY = _VENDORED_ROOT / "rust" / "target" / "release" / "rusty-claude-cli"
_PYTHON_ENTRY = _VENDORED_ROOT / "src" / "main.py"


def _resolve_cli_command() -> list[str]:
    """Resolve the CLI command to invoke Claw-Code."""
    # Prefer compiled Rust binary if available.
    if _RUST_BINARY.exists():
        return [str(_RUST_BINARY)]
    # Fallback to Python entry point.
    if _PYTHON_ENTRY.exists():
        return ["python", str(_PYTHON_ENTRY)]
    # Last resort: assume 'claw' is on PATH.
    return ["claw"]


@dataclass(frozen=True)
class ClawResult:
    """Result of a Claw-Code CLI invocation."""

    returncode: int
    stdout: str
    stderr: str
    parsed_json: Optional[dict[str, Any]] = field(default=None)

    @property
    def ok(self) -> bool:
        return self.returncode == 0

    @property
    def output(self) -> str:
        """Return stdout if successful, stderr otherwise."""
        return self.stdout if self.ok else self.stderr


def _try_parse_json(text: str) -> Optional[dict[str, Any]]:
    """Attempt to parse JSON from CLI output."""
    stripped = text.strip()
    if not stripped:
        return None
    # Try to find JSON in the output (may be mixed with non-JSON lines).
    for candidate in [stripped, stripped.split("\n")[-1]]:
        try:
            return json.loads(candidate)
        except (json.JSONDecodeError, IndexError):
            continue
    return None


def _run_cli(
    args: list[str],
    cwd: Optional[str | Path] = None,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
    env_overrides: Optional[dict[str, str]] = None,
) -> ClawResult:
    """Execute the Claw-Code CLI with given arguments."""
    cmd = _resolve_cli_command() + args
    env = os.environ.copy()
    if env_overrides:
        env.update(env_overrides)

    try:
        result = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )
    except subprocess.TimeoutExpired:
        return ClawResult(
            returncode=-1,
            stdout="",
            stderr=f"Claw-Code CLI timed out after {timeout}s",
        )
    except FileNotFoundError:
        return ClawResult(
            returncode=-2,
            stdout="",
            stderr="Claw-Code CLI binary not found. Ensure the vendored tree is compiled or 'claw' is on PATH.",
        )

    return ClawResult(
        returncode=result.returncode,
        stdout=result.stdout,
        stderr=result.stderr,
        parsed_json=_try_parse_json(result.stdout),
    )


def run_prompt(
    prompt: str,
    cwd: Optional[str | Path] = None,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
    model: Optional[str] = None,
) -> ClawResult:
    """Execute a one-shot prompt against the Claw-Code CLI.

    Args:
        prompt: The prompt text to send.
        cwd: Working directory for the CLI process.
        timeout: Maximum execution time in seconds.
        model: Optional model override.

    Returns:
        ClawResult with captured output.
    """
    args = ["--print", "--prompt", prompt]
    if model:
        args.extend(["--model", model])
    return _run_cli(args, cwd=cwd, timeout=timeout)


def run_session(
    session_id: str,
    prompt: str,
    cwd: Optional[str | Path] = None,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
    model: Optional[str] = None,
) -> ClawResult:
    """Execute a prompt within a named session.

    Args:
        session_id: Unique session identifier for conversation continuity.
        prompt: The prompt text to send.
        cwd: Working directory for the CLI process.
        timeout: Maximum execution time in seconds.
        model: Optional model override.

    Returns:
        ClawResult with captured output.
    """
    args = ["--print", "--session-id", session_id, "--prompt", prompt]
    if model:
        args.extend(["--model", model])
    return _run_cli(args, cwd=cwd, timeout=timeout)


def resume_session(
    session_id: str,
    cwd: Optional[str | Path] = None,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
) -> ClawResult:
    """Resume an existing session by ID.

    Args:
        session_id: Session identifier to resume.
        cwd: Working directory for the CLI process.
        timeout: Maximum execution time in seconds.

    Returns:
        ClawResult with captured output.
    """
    args = ["--resume", "--session-id", session_id]
    return _run_cli(args, cwd=cwd, timeout=timeout)
