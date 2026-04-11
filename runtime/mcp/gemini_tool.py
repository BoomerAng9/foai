"""
gemini_tool.py — MCP-compatible tool wrapping Gemini as the "everything else" executor.

This is the "gemini" executor in MoEx — the default fallback for tasks
that are not Rust/systems (claw) or Python/data (codex).

Default model: gemini-3.1-flash (per latest-model-only rule).

MCP tool format: name, description, input_schema, execute().
"""

from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from typing import Any, Optional


# ---------------------------------------------------------------------------
# MCP Tool Schema
# ---------------------------------------------------------------------------

TOOL_NAME = "gemini"
TOOL_DESCRIPTION = (
    "General-purpose code and content generator powered by Gemini. "
    "Handles JavaScript, TypeScript, React, infrastructure, docs, and more. "
    "Default executor in MoEx for non-Rust/non-Python tasks."
)

INPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "action": {
            "type": "string",
            "enum": ["generate", "chat"],
            "description": "Which action to perform.",
        },
        "prompt": {
            "type": "string",
            "description": "Prompt for generation (required for 'generate').",
        },
        "messages": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "role": {"type": "string", "enum": ["user", "model"]},
                    "content": {"type": "string"},
                },
                "required": ["role", "content"],
            },
            "description": "Chat history (required for 'chat').",
        },
        "model": {
            "type": "string",
            "default": "gemini-3.1-flash",
            "description": "Gemini model to use.",
        },
    },
    "required": ["action"],
}

DEFAULT_MODEL = "gemini-3.1-flash"


@dataclass
class GeminiResult:
    """Result from a Gemini tool invocation."""

    success: bool
    output: str
    error: Optional[str] = None
    model_used: str = DEFAULT_MODEL


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def _get_api_key() -> Optional[str]:
    """Retrieve Gemini API key from environment."""
    return (
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
        or os.environ.get("GOOGLE_GENAI_API_KEY")
    )


def _gemini_cli_available() -> bool:
    """Check if the Gemini CLI is installed and on PATH."""
    try:
        result = subprocess.run(
            ["gemini", "--version"],
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

def generate(prompt: str, model: str = DEFAULT_MODEL) -> GeminiResult:
    """Generate content using Gemini.

    Tries Gemini CLI first, then the google-genai SDK, then stubs.

    Args:
        prompt: Generation prompt.
        model: Model name (default: gemini-3.1-flash).

    Returns:
        GeminiResult with generated content.
    """
    api_key = _get_api_key()

    # Path 1: Gemini CLI
    if _gemini_cli_available():
        try:
            result = subprocess.run(
                ["gemini", "-m", model, prompt],
                capture_output=True,
                text=True,
                timeout=120,
            )
            if result.returncode == 0:
                return GeminiResult(
                    success=True,
                    output=result.stdout.strip(),
                    model_used=model,
                )
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

    # Path 2: google-genai SDK
    if api_key:
        try:
            from google import genai

            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model,
                contents=prompt,
            )
            return GeminiResult(
                success=True,
                output=response.text or "",
                model_used=model,
            )
        except ImportError:
            pass  # SDK not installed, fall through
        except Exception as exc:
            return GeminiResult(
                success=False,
                output="",
                error=f"Gemini API error: {exc}",
                model_used=model,
            )

    # Path 3: Stub
    return GeminiResult(
        success=False,
        output="",
        error=(
            "Gemini executor not available. "
            "Set GEMINI_API_KEY or install the Gemini CLI."
        ),
        model_used=model,
    )


def chat(messages: list[dict[str, str]], model: str = DEFAULT_MODEL) -> GeminiResult:
    """Multi-turn chat using Gemini.

    Args:
        messages: List of {role, content} dicts.
        model: Model name (default: gemini-3.1-flash).

    Returns:
        GeminiResult with the assistant's response.
    """
    api_key = _get_api_key()

    if not api_key:
        return GeminiResult(
            success=False,
            output="",
            error="Gemini chat requires GEMINI_API_KEY.",
            model_used=model,
        )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part(text=msg["content"])],
                )
            )

        response = client.models.generate_content(
            model=model,
            contents=contents,
        )
        return GeminiResult(
            success=True,
            output=response.text or "",
            model_used=model,
        )
    except ImportError:
        return GeminiResult(
            success=False,
            output="",
            error="google-genai SDK not installed. Run: pip install google-genai",
            model_used=model,
        )
    except Exception as exc:
        return GeminiResult(
            success=False,
            output="",
            error=f"Gemini chat error: {exc}",
            model_used=model,
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
    model = params.get("model", DEFAULT_MODEL)

    if action == "generate":
        prompt = params.get("prompt", "")
        if not prompt:
            return {"success": False, "error": "Missing 'prompt' parameter."}
        result = generate(prompt, model)
    elif action == "chat":
        messages = params.get("messages", [])
        if not messages:
            return {"success": False, "error": "Missing 'messages' parameter."}
        result = chat(messages, model)
    else:
        return {"success": False, "error": f"Unknown action: {action}"}

    return {
        "success": result.success,
        "output": result.output,
        "error": result.error,
        "model_used": result.model_used,
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
