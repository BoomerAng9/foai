"""
codesandbox_client.py — CodeSandbox integration for the Deploy Platform.

Provides sandbox creation, command execution, and URL sharing
for aiPLUG runtimes and demo environments.

Authentication: CODESANDBOX_API_KEY env var.
API docs: https://codesandbox.io/docs/api

NOTE: This is a scaffolded implementation. The CodeSandbox API
requires an API key and specific SDK. Core structure is in place
with clear TODO markers for full integration.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class SandboxResult:
    """Result from a CodeSandbox operation."""

    success: bool
    sandbox_id: Optional[str] = None
    url: Optional[str] = None
    output: Optional[str] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CODESANDBOX_API_BASE = "https://api.codesandbox.io/v1"

# Supported templates for quick sandbox creation
TEMPLATES = {
    "react": "react",
    "react-ts": "react-ts",
    "next": "nextjs",
    "next-ts": "nextjs-ts",
    "node": "node",
    "python": "python3",
    "vanilla": "vanilla",
    "vue": "vue3",
    "static": "static",
}


def _get_api_key() -> Optional[str]:
    """Retrieve CodeSandbox API key from environment."""
    return os.environ.get("CODESANDBOX_API_KEY")


def _api_available() -> bool:
    """Check if the CodeSandbox API is configured."""
    return _get_api_key() is not None


def _make_request(
    method: str,
    endpoint: str,
    data: Optional[dict] = None,
) -> dict[str, Any]:
    """Make an authenticated request to the CodeSandbox API.

    Args:
        method: HTTP method.
        endpoint: API endpoint path.
        data: Optional JSON body.

    Returns:
        Response JSON as dict.
    """
    import urllib.request
    import json

    api_key = _get_api_key()
    if not api_key:
        raise RuntimeError("CODESANDBOX_API_KEY not set.")

    url = f"{CODESANDBOX_API_BASE}{endpoint}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def create_sandbox(
    template: str = "react",
    files: Optional[dict[str, str]] = None,
) -> SandboxResult:
    """Create a new CodeSandbox.

    Args:
        template: Sandbox template name (see TEMPLATES).
        files: Optional dict of {filepath: content} to seed the sandbox.

    Returns:
        SandboxResult with sandbox_id and URL on success.
    """
    if not _api_available():
        # TODO: Replace stub with real API call when CODESANDBOX_API_KEY is configured.
        return SandboxResult(
            success=False,
            error=(
                "CodeSandbox API not configured. "
                "Set CODESANDBOX_API_KEY environment variable. "
                "Get a key at https://codesandbox.io/dashboard/settings/api"
            ),
        )

    resolved_template = TEMPLATES.get(template, template)

    # Build the files payload
    sandbox_files = {}
    if files:
        for path, content in files.items():
            sandbox_files[path] = {"content": content}

    try:
        response = _make_request(
            "POST",
            "/sandboxes",
            data={
                "template": resolved_template,
                "files": sandbox_files,
            },
        )
        sandbox_id = response.get("data", {}).get("id", response.get("id"))
        return SandboxResult(
            success=True,
            sandbox_id=sandbox_id,
            url=f"https://codesandbox.io/s/{sandbox_id}",
        )
    except Exception as exc:
        return SandboxResult(success=False, error=str(exc))


def execute_in_sandbox(sandbox_id: str, command: str) -> SandboxResult:
    """Execute a command inside an existing sandbox.

    Args:
        sandbox_id: The sandbox identifier.
        command: Shell command to run.

    Returns:
        SandboxResult with command output.
    """
    if not _api_available():
        # TODO: Wire up real execution when API key is available.
        return SandboxResult(
            success=False,
            sandbox_id=sandbox_id,
            error="CodeSandbox API not configured. Set CODESANDBOX_API_KEY.",
        )

    try:
        response = _make_request(
            "POST",
            f"/sandboxes/{sandbox_id}/execute",
            data={"command": command},
        )
        return SandboxResult(
            success=True,
            sandbox_id=sandbox_id,
            output=response.get("output", ""),
        )
    except Exception as exc:
        return SandboxResult(
            success=False,
            sandbox_id=sandbox_id,
            error=str(exc),
        )


def get_sandbox_url(sandbox_id: str) -> SandboxResult:
    """Get the shareable URL for a sandbox.

    Args:
        sandbox_id: The sandbox identifier.

    Returns:
        SandboxResult with the URL.
    """
    if not sandbox_id:
        return SandboxResult(
            success=False,
            error="sandbox_id is required.",
        )

    url = f"https://codesandbox.io/s/{sandbox_id}"
    return SandboxResult(
        success=True,
        sandbox_id=sandbox_id,
        url=url,
    )


def get_sandbox_embed_url(sandbox_id: str) -> SandboxResult:
    """Get the embeddable URL for a sandbox.

    Args:
        sandbox_id: The sandbox identifier.

    Returns:
        SandboxResult with the embed URL.
    """
    if not sandbox_id:
        return SandboxResult(
            success=False,
            error="sandbox_id is required.",
        )

    url = f"https://codesandbox.io/embed/{sandbox_id}"
    return SandboxResult(
        success=True,
        sandbox_id=sandbox_id,
        url=url,
    )
