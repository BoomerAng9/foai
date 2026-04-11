"""
codex_tool.py — MCP-compatible tool wrapping OpenAI Codex as the Python executor.

This is the "codex" executor in MoEx — handles Python/data/ML tasks.
Chicken Hawk dispatches here for code generation and execution.

MCP tool format: name, description, input_schema, execute().
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
from dataclasses import dataclass, field
from typing import Any, Optional

# ---------------------------------------------------------------------------
# MCP Tool Schema
# ---------------------------------------------------------------------------

TOOL_NAME = "codex"
TOOL_DESCRIPTION = (
    "Python code executor powered by OpenAI Codex. "
    "Generates and executes Python/data/ML code. "
    "Dispatched by MoEx for Python-classified tasks."
)

INPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "action": {
            "type": "string",
            "enum": ["execute_code", "generate_code"],
            "description": "Which action to perform.",
        },
        "language": {
            "type": "string",
            "default": "python",
            "description": "Programming language (default: python).",
        },
        "code": {
            "type": "string",
            "description": "Code to execute (required for execute_code).",
        },
        "prompt": {
            "type": "string",
            "description": "Natural language prompt (required for generate_code).",
        },
    },
    "required": ["action"],
}


@dataclass
class CodexResult:
    """Result from a Codex tool invocation."""

    success: bool
    output: str
    error: Optional[str] = None
    generated_code: Optional[str] = None


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def _get_api_key() -> Optional[str]:
    """Retrieve OpenAI API key from environment."""
    return os.environ.get("OPENAI_API_KEY")


def _codex_cli_available() -> bool:
    """Check if the Codex CLI is installed and on PATH."""
    try:
        result = subprocess.run(
            ["codex", "--version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


# ---------------------------------------------------------------------------
# Core Functions
# ---------------------------------------------------------------------------

def execute_code(language: str, code: str) -> CodexResult:
    """Execute code in a sandboxed subprocess.

    Args:
        language: Programming language (only 'python' supported currently).
        code: Source code to execute.

    Returns:
        CodexResult with stdout/stderr output.
    """
    if language.lower() not in ("python", "py", "python3"):
        return CodexResult(
            success=False,
            output="",
            error=f"Unsupported language for Codex executor: {language}. Use 'python'.",
        )

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False
    ) as tmp:
        tmp.write(code)
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            ["python", tmp_path],
            capture_output=True,
            text=True,
            timeout=60,
        )
        return CodexResult(
            success=result.returncode == 0,
            output=result.stdout,
            error=result.stderr if result.returncode != 0 else None,
        )
    except subprocess.TimeoutExpired:
        return CodexResult(
            success=False,
            output="",
            error="Execution timed out after 60 seconds.",
        )
    finally:
        os.unlink(tmp_path)


def generate_code(prompt: str, language: str = "python") -> CodexResult:
    """Generate code using the Codex CLI or OpenAI API.

    Falls back to a stub if neither is available.

    Args:
        prompt: Natural language description of what to generate.
        language: Target language (default: python).

    Returns:
        CodexResult with generated code in generated_code field.
    """
    api_key = _get_api_key()

    # Path 1: Try Codex CLI
    if _codex_cli_available():
        try:
            result = subprocess.run(
                ["codex", "--quiet", prompt],
                capture_output=True,
                text=True,
                timeout=120,
            )
            if result.returncode == 0:
                return CodexResult(
                    success=True,
                    output=result.stdout,
                    generated_code=result.stdout.strip(),
                )
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass  # Fall through to API path

    # Path 2: Try OpenAI API directly
    if api_key:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {
                        "role": "system",
                        "content": f"Generate {language} code. Return ONLY the code, no explanation.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=2048,
            )
            generated = response.choices[0].message.content or ""
            # Strip markdown fences if present
            if generated.startswith("```"):
                lines = generated.split("\n")
                lines = [l for l in lines if not l.startswith("```")]
                generated = "\n".join(lines)
            return CodexResult(
                success=True,
                output="Code generated via OpenAI API.",
                generated_code=generated.strip(),
            )
        except Exception as exc:
            return CodexResult(
                success=False,
                output="",
                error=f"OpenAI API error: {exc}",
            )

    # Path 3: Stub — no API key, no CLI
    return CodexResult(
        success=False,
        output="",
        error=(
            "Codex executor not available. "
            "Set OPENAI_API_KEY or install the Codex CLI."
        ),
    )


# ---------------------------------------------------------------------------
# MCP Execute Entrypoint
# ---------------------------------------------------------------------------

def execute(params: dict[str, Any]) -> dict[str, Any]:
    """MCP-compatible execute function.

    Args:
        params: Input matching INPUT_SCHEMA.

    Returns:
        Dict with result fields.
    """
    action = params.get("action", "")
    language = params.get("language", "python")

    if action == "execute_code":
        code = params.get("code", "")
        if not code:
            return {"success": False, "error": "Missing 'code' parameter."}
        result = execute_code(language, code)
    elif action == "generate_code":
        prompt = params.get("prompt", "")
        if not prompt:
            return {"success": False, "error": "Missing 'prompt' parameter."}
        result = generate_code(prompt, language)
    else:
        return {"success": False, "error": f"Unknown action: {action}"}

    return {
        "success": result.success,
        "output": result.output,
        "error": result.error,
        "generated_code": result.generated_code,
    }


# ---------------------------------------------------------------------------
# MCP Tool Definition (for registration)
# ---------------------------------------------------------------------------

MCP_TOOL_DEFINITION: dict[str, Any] = {
    "name": TOOL_NAME,
    "description": TOOL_DESCRIPTION,
    "input_schema": INPUT_SCHEMA,
    "execute": execute,
}
