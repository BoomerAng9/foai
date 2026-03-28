"""VPS2 remote sandbox provider — executes code on the remote OpenSandbox API.

This provider routes code-execution requests to the OpenSandbox service
running on VPS2 (10.0.0.2:4400) over the WireGuard tunnel.  It communicates
via HTTP with the sandbox server's REST API rather than managing Docker
containers directly.

Architecture
------------
* Agent (VPS1) ──WireGuard──► OpenSandbox (VPS2:4400)
* Each execution creates an isolated container on VPS2
* Sessions persist a container for multi-step workflows (file I/O + exec)
* Supported languages: Python, JavaScript, TypeScript, Bash, Go, Rust

API Endpoints
-------------
* ``GET  /health``                          – Liveness check
* ``POST /api/sandbox/execute``             – One-shot code execution
* ``GET  /api/sandbox/languages``           – List supported languages
* ``POST /api/sandbox/sessions``            – Create persistent session
* ``POST /api/sandbox/sessions/:id/execute`` – Execute in session
* ``DELETE /api/sandbox/sessions/:id``      – Destroy session
* ``GET  /api/sandbox/executions``          – List executions
* ``GET  /api/sandbox/stats``               – Execution stats
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import uuid
from functools import wraps
from typing import IO, Any, AsyncIterator, Dict, Literal, Optional, TYPE_CHECKING

import httpx

from ii_sandbox_server.config import SandboxConfig
from ii_sandbox_server.sandboxes.base import BaseSandbox
from ii_sandbox_server.models.exceptions import (
    SandboxNotFoundException,
    SandboxTimeoutException,
    SandboxNotInitializedError,
    SandboxGeneralException,
)

if TYPE_CHECKING:
    from ii_sandbox_server.lifecycle.queue import SandboxQueueScheduler

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 30  # seconds per HTTP request
EXECUTE_TIMEOUT = 120  # generous timeout for code execution
SESSION_IDLE_TIMEOUT = 3600  # 1 hour session idle timeout


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def remote_exception_handler(func):
    """Translate HTTP / remote errors into sandbox domain exceptions."""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except httpx.TimeoutException as exc:
            sandbox_id = getattr(args[0], "_sandbox_id", "unknown") if args else "unknown"
            raise SandboxTimeoutException(sandbox_id, func.__name__) from exc
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                sandbox_id = getattr(args[0], "_sandbox_id", "unknown") if args else "unknown"
                raise SandboxNotFoundException(sandbox_id) from exc
            raise SandboxGeneralException(
                f"VPS2 API error in {func.__name__}: {exc.response.status_code} – {exc.response.text}"
            ) from exc
        except (SandboxNotFoundException, SandboxTimeoutException, SandboxGeneralException):
            raise  # re-raise our own exceptions
        except SandboxNotInitializedError:
            raise
        except Exception as exc:
            raise SandboxGeneralException(
                f"VPS2 sandbox {func.__name__} failed: {exc}"
            ) from exc

    return wrapper


def _get_base_url(config: SandboxConfig) -> str:
    """Resolve the VPS2 sandbox base URL from config or env."""
    # Try config field first, then env vars, then default
    url = getattr(config, "vps2_sandbox_url", None)
    if url:
        return url.rstrip("/")
    url = os.getenv("VPS2_SANDBOX_URL", os.getenv("OPEN_SANDBOX_URL"))
    if url:
        return url.rstrip("/")
    # Default: WireGuard tunnel address
    return "http://10.0.0.2:4400"


def _get_fallback_url() -> Optional[str]:
    """Optional public fallback URL for VPS2 sandbox."""
    url = os.getenv("VPS2_SANDBOX_FALLBACK_URL")
    return url.rstrip("/") if url else None


# ---------------------------------------------------------------------------
# Provider
# ---------------------------------------------------------------------------

class VPS2Sandbox(BaseSandbox):
    """Remote sandbox provider for VPS2 OpenSandbox service.

    Routes execution to the HTTP API at ``http://10.0.0.2:4400``.
    Supports both one-shot execution and persistent sessions for
    multi-step workflows (file I/O across multiple commands).
    """

    def __init__(
        self,
        sandbox_id: str,
        base_url: str,
        session_id: Optional[str] = None,
        queue: Optional["SandboxQueueScheduler"] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        super().__init__()
        self._sandbox_id = sandbox_id
        self._base_url = base_url
        self._session_id = session_id
        self._queue = queue
        self._metadata = metadata or {}
        self._client: Optional[httpx.AsyncClient] = None

    # ---- HTTP client management -------------------------------------------

    async def _get_client(self) -> httpx.AsyncClient:
        """Lazy-init a shared httpx.AsyncClient."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                timeout=httpx.Timeout(DEFAULT_TIMEOUT, connect=10.0),
                headers={
                    "Content-Type": "application/json",
                    "X-Sandbox-Id": self._sandbox_id,
                },
            )
        return self._client

    async def _close_client(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    # ---- properties -------------------------------------------------------

    @property
    def sandbox_id(self) -> str:
        return self._sandbox_id

    @property
    def provider_sandbox_id(self) -> str:
        """Session ID on VPS2 (or sandbox_id if no session)."""
        return self._session_id or self._sandbox_id

    # ---- class-level lifecycle --------------------------------------------

    @classmethod
    async def create(
        cls,
        config: SandboxConfig,
        queue: Optional["SandboxQueueScheduler"] = None,
        sandbox_id: Optional[str] = None,
        metadata: Optional[dict] = None,
        sandbox_template_id: Optional[str] = None,
    ) -> "VPS2Sandbox":
        """Create a new VPS2 sandbox instance.

        Attempts to create a persistent session on VPS2 if the API supports it.
        Falls back to stateless mode if sessions aren't available.
        """
        base_url = _get_base_url(config)
        sandbox_id = sandbox_id or str(uuid.uuid4())

        instance = cls(
            sandbox_id=sandbox_id,
            base_url=base_url,
            queue=queue,
            metadata=metadata,
        )

        # Verify VPS2 is reachable
        await instance._health_check()

        # Try to create a persistent session for file I/O support
        session_id = await instance._try_create_session()
        if session_id:
            instance._session_id = session_id
            logger.info(
                f"Created VPS2 sandbox {sandbox_id} with session {session_id}"
            )
        else:
            logger.info(
                f"Created VPS2 sandbox {sandbox_id} (stateless mode — no session API)"
            )

        return instance

    @classmethod
    async def connect(
        cls,
        provider_sandbox_id: str,
        config: SandboxConfig,
        queue: Optional["SandboxQueueScheduler"] = None,
        sandbox_id: Optional[str] = None,
    ) -> "VPS2Sandbox":
        """Connect to an existing VPS2 sandbox session."""
        base_url = _get_base_url(config)
        resolved_id = sandbox_id or provider_sandbox_id

        instance = cls(
            sandbox_id=resolved_id,
            base_url=base_url,
            session_id=provider_sandbox_id,
            queue=queue,
        )

        # Verify connectivity
        await instance._health_check()
        logger.info(f"Connected to VPS2 sandbox {resolved_id}")
        return instance

    @classmethod
    async def resume(
        cls,
        provider_sandbox_id: str,
        config: SandboxConfig,
        queue: Optional["SandboxQueueScheduler"] = None,
        sandbox_id: Optional[str] = None,
    ) -> "VPS2Sandbox":
        """Resume is equivalent to connect for the remote provider."""
        return await cls.connect(provider_sandbox_id, config, queue, sandbox_id)

    @classmethod
    async def delete(
        cls,
        provider_sandbox_id: str,
        config: SandboxConfig,
        queue: Optional["SandboxQueueScheduler"] = None,
        sandbox_id: Optional[str] = None,
    ) -> bool:
        """Delete/cleanup a VPS2 sandbox session."""
        base_url = _get_base_url(config)
        try:
            async with httpx.AsyncClient(
                base_url=base_url, timeout=DEFAULT_TIMEOUT
            ) as client:
                resp = await client.delete(
                    f"/api/sandbox/sessions/{provider_sandbox_id}"
                )
                if resp.status_code in (200, 204, 404):
                    logger.info(f"Deleted VPS2 session {provider_sandbox_id}")
                    return True
        except Exception as exc:
            logger.warning(f"Failed to delete VPS2 session {provider_sandbox_id}: {exc}")
        # Cleanup queue if present
        if queue and sandbox_id:
            await queue.cancel_message(sandbox_id)
        return True  # best-effort cleanup

    @classmethod
    async def stop(
        cls,
        provider_sandbox_id: str,
        config: SandboxConfig,
        queue: Optional["SandboxQueueScheduler"] = None,
        sandbox_id: Optional[str] = None,
    ) -> bool:
        """Stop a VPS2 sandbox session (same as delete for remote)."""
        return await cls.delete(provider_sandbox_id, config, queue, sandbox_id)

    @classmethod
    async def schedule_timeout(
        cls,
        provider_sandbox_id: str,
        sandbox_id: str,
        config: SandboxConfig,
        queue: Optional["SandboxQueueScheduler"] = None,
        timeout_seconds: int = 0,
    ):
        """Schedule a timeout via the queue (if available)."""
        if queue and sandbox_id:
            from datetime import datetime, timezone
            await queue.schedule_message(
                sandbox_id=sandbox_id,
                action="pause",
                delay_seconds=timeout_seconds or config.timeout_seconds,
                metadata={
                    "reason": "idle",
                    "provider": "vps2",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
            )

    # ---- instance-level operations ----------------------------------------

    @remote_exception_handler
    async def _health_check(self) -> Dict[str, Any]:
        """Verify VPS2 sandbox API is reachable."""
        client = await self._get_client()
        resp = await client.get("/health")
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "ok":
            raise SandboxGeneralException(
                f"VPS2 sandbox unhealthy: {data}"
            )
        return data

    async def _try_create_session(self) -> Optional[str]:
        """Attempt to create a persistent session on VPS2.

        Returns session ID if the API supports sessions, None otherwise.
        The session API returns ``{"ok": true, "session": {"id": "session-xxx", ...}}``.
        """
        try:
            client = await self._get_client()
            resp = await client.post(
                "/api/sandbox/sessions",
                json={
                    "language": "bash",
                    "ttlMinutes": SESSION_IDLE_TIMEOUT // 60,
                },
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                session = data.get("session", data)
                session_id = session.get("id")
                if session_id:
                    # Wait for session container to be ready
                    await self._wait_session_ready(session_id)
                return session_id
        except Exception as exc:
            logger.debug(f"Session creation not supported: {exc}")
        return None

    async def _wait_session_ready(
        self, session_id: str, max_wait: float = 30.0
    ) -> None:
        """Poll session status until 'ready' or timeout."""
        client = await self._get_client()
        deadline = asyncio.get_event_loop().time() + max_wait
        interval = 0.5

        while asyncio.get_event_loop().time() < deadline:
            await asyncio.sleep(interval)
            try:
                resp = await client.get(f"/api/sandbox/sessions/{session_id}")
                if resp.status_code == 200:
                    data = resp.json()
                    session = data.get("session", data)
                    status = session.get("status", "")
                    if status == "ready":
                        logger.debug(f"Session {session_id} is ready")
                        return
                    if status in ("expired", "destroyed", "error"):
                        logger.warning(f"Session {session_id} failed: {status}")
                        return
            except Exception:
                pass
            interval = min(interval * 1.5, 3.0)

        logger.warning(f"Session {session_id} not ready after {max_wait}s")

    @remote_exception_handler
    async def _execute_code(
        self,
        code: str,
        language: str = "bash",
        timeout: int = EXECUTE_TIMEOUT,
        stdin: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute code on VPS2 sandbox API.

        The API is async: POST returns immediately with an execution ID,
        then we poll ``GET /api/sandbox/executions/:id`` until completion.

        Returns the full execution result dict with stdout, stderr, exitCode.
        """
        client = await self._get_client()

        payload: Dict[str, Any] = {
            "code": code,
            "language": language,
            "timeout": timeout,
        }
        if stdin:
            payload["stdin"] = stdin

        # Use session endpoint if a session is active
        if self._session_id:
            endpoint = f"/api/sandbox/sessions/{self._session_id}/execute"
        else:
            endpoint = "/api/sandbox/execute"

        resp = await client.post(
            endpoint,
            json=payload,
            timeout=httpx.Timeout(DEFAULT_TIMEOUT, connect=10.0),
        )
        resp.raise_for_status()
        data = resp.json()

        # Extract execution object (may be nested under "execution" key)
        execution = data.get("execution", data)
        exec_id = execution.get("id")
        status = execution.get("status")

        # If already completed (synchronous response), return immediately
        if status == "completed" or status == "failed":
            return execution

        # Poll for completion
        if exec_id:
            return await self._poll_execution(exec_id, timeout)

        # Fallback: return whatever we got
        return execution

    async def _poll_execution(
        self, exec_id: str, timeout: int = EXECUTE_TIMEOUT
    ) -> Dict[str, Any]:
        """Poll ``GET /api/sandbox/executions/:id`` until done or timeout."""
        client = await self._get_client()
        deadline = asyncio.get_event_loop().time() + timeout
        poll_interval = 0.3  # start fast

        while asyncio.get_event_loop().time() < deadline:
            await asyncio.sleep(poll_interval)
            resp = await client.get(
                f"/api/sandbox/executions/{exec_id}",
                timeout=httpx.Timeout(DEFAULT_TIMEOUT, connect=10.0),
            )
            if resp.status_code == 404:
                raise SandboxNotFoundException(exec_id)
            resp.raise_for_status()
            data = resp.json()
            execution = data.get("execution", data)
            status = execution.get("status", "")

            if status in ("completed", "failed", "timeout", "error"):
                return execution

            # Back off gradually: 0.3 → 0.5 → 1.0 → 2.0 (cap)
            poll_interval = min(poll_interval * 1.5, 2.0)

        raise SandboxTimeoutException(exec_id, "poll_execution")

    # ---- abstract method implementations ----------------------------------

    @remote_exception_handler
    async def expose_port(self, port: int) -> str:
        """Port exposure is not directly supported on the remote sandbox.

        Returns the VPS2 sandbox base URL as a reference.
        """
        logger.warning(
            f"Port exposure not supported on VPS2 sandbox — returning base URL"
        )
        return f"{self._base_url}:{port}"

    @remote_exception_handler
    async def upload_file(
        self, file_content: str | bytes | IO, remote_file_path: str
    ):
        """Upload a file to the sandbox by writing via bash."""
        if isinstance(file_content, bytes):
            content_b64 = base64.b64encode(file_content).decode("ascii")
            code = (
                f"mkdir -p \"$(dirname '{remote_file_path}')\" && "
                f"echo '{content_b64}' | base64 -d > '{remote_file_path}'"
            )
        elif isinstance(file_content, str):
            # Escape for heredoc
            escaped = file_content.replace("'", "'\\''")
            code = (
                f"mkdir -p \"$(dirname '{remote_file_path}')\" && "
                f"cat > '{remote_file_path}' << 'IIEOF'\n{escaped}\nIIEOF"
            )
        else:
            data = file_content.read()
            if isinstance(data, str):
                data = data.encode("utf-8")
            content_b64 = base64.b64encode(data).decode("ascii")
            code = (
                f"mkdir -p \"$(dirname '{remote_file_path}')\" && "
                f"echo '{content_b64}' | base64 -d > '{remote_file_path}'"
            )

        result = await self._execute_code(code, language="bash")
        exit_code = result.get("exitCode", result.get("exit_code", -1))
        if exit_code != 0:
            stderr = result.get("stderr", "")
            raise SandboxGeneralException(
                f"Failed to upload file to {remote_file_path}: {stderr}"
            )
        return True

    @remote_exception_handler
    async def download_file(
        self, remote_file_path: str, format: Literal["text", "bytes"] = "text"
    ) -> Optional[str | bytes]:
        """Download a file from the sandbox by reading via bash."""
        if format == "bytes":
            code = f"base64 '{remote_file_path}'"
            result = await self._execute_code(code, language="bash")
            exit_code = result.get("exitCode", result.get("exit_code", -1))
            if exit_code != 0:
                return None
            stdout = result.get("stdout", result.get("output", ""))
            return base64.b64decode(stdout.strip())
        else:
            code = f"cat '{remote_file_path}'"
            result = await self._execute_code(code, language="bash")
            exit_code = result.get("exitCode", result.get("exit_code", -1))
            if exit_code != 0:
                return None
            return result.get("stdout", result.get("output", ""))

    async def download_file_stream(
        self, remote_file_path: str
    ) -> AsyncIterator[bytes]:
        """Download a file as an async byte stream."""
        content = await self.download_file(remote_file_path, format="bytes")
        if content:
            yield content  # type: ignore[misc]

    @remote_exception_handler
    async def delete_file(self, file_path: str) -> bool:
        """Delete a file in the sandbox."""
        result = await self._execute_code(
            f"rm -f '{file_path}'", language="bash"
        )
        return result.get("exitCode", result.get("exit_code", -1)) == 0

    @remote_exception_handler
    async def write_file(
        self, file_content: str | bytes | IO, file_path: str
    ) -> bool:
        """Write content to a file in the sandbox."""
        await self.upload_file(file_content, file_path)
        return True

    @remote_exception_handler
    async def read_file(self, file_path: str) -> str:
        """Read a file from the sandbox."""
        content = await self.download_file(file_path, format="text")
        return content or ""

    @remote_exception_handler
    async def run_cmd(self, command: str, background: bool = False) -> str:
        """Execute a command in the remote sandbox.

        This is the primary execution method. Commands are sent to VPS2's
        ``/api/v1/execute`` endpoint (or session exec if a session exists).
        """
        if background:
            code = f"nohup sh -c '{command}' > /dev/null 2>&1 &"
        else:
            code = command

        result = await self._execute_code(code, language="bash")
        exit_code = result.get("exitCode", result.get("exit_code", -1))
        stdout = result.get("stdout", result.get("output", ""))
        stderr = result.get("stderr", "")

        if exit_code != 0 and not background:
            raise Exception(
                f"Command failed (exit {exit_code}): {command}\n{stdout}\n{stderr}"
            )

        return stdout

    @remote_exception_handler
    async def create_directory(
        self, directory_path: str, exist_ok: bool = False
    ) -> bool:
        """Create a directory in the sandbox."""
        flag = "-p" if exist_ok else ""
        result = await self._execute_code(
            f"mkdir {flag} '{directory_path}'", language="bash"
        )
        return result.get("exitCode", result.get("exit_code", -1)) == 0

    # ---- VPS2-specific convenience methods --------------------------------

    @remote_exception_handler
    async def execute_python(
        self, code: str, timeout: int = EXECUTE_TIMEOUT
    ) -> Dict[str, Any]:
        """Execute Python code directly (bypasses bash wrapping)."""
        return await self._execute_code(code, language="python", timeout=timeout)

    @remote_exception_handler
    async def execute_javascript(
        self, code: str, timeout: int = EXECUTE_TIMEOUT
    ) -> Dict[str, Any]:
        """Execute JavaScript code directly."""
        return await self._execute_code(code, language="javascript", timeout=timeout)

    @remote_exception_handler
    async def get_languages(self) -> list[str]:
        """List supported languages on the VPS2 sandbox."""
        client = await self._get_client()
        resp = await client.get("/api/sandbox/languages")
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list):
            return data
        return data.get("languages", [])

    @remote_exception_handler
    async def get_health(self) -> Dict[str, Any]:
        """Get detailed health info from VPS2 sandbox."""
        return await self._health_check()

    # ---- cleanup ----------------------------------------------------------

    async def cleanup(self):
        """Clean up resources."""
        if self._session_id:
            try:
                client = await self._get_client()
                await client.delete(f"/api/sandbox/sessions/{self._session_id}")
            except Exception as exc:
                logger.debug(f"Session cleanup failed: {exc}")
        await self._close_client()

    def __del__(self):
        """Best-effort cleanup on garbage collection."""
        if self._client and not self._client.is_closed:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(self._close_client())
                else:
                    loop.run_until_complete(self._close_client())
            except Exception:
                pass
