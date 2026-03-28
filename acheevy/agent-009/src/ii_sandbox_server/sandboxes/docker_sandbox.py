"""Docker sandbox provider — runs isolated containers on the host Docker daemon.

This provider creates sibling containers (via the mounted Docker socket) to
provide sandboxed code-execution environments.  Each sandbox is a Docker
container built from a configurable image (defaults to the same base as the
E2B template).

Key design choices
------------------
* **aiodocker** for fully async Docker API calls
* One container per sandbox — start / exec / stop / remove
* Pause/resume maps to ``docker pause`` / ``docker unpause``
* File I/O goes through ``docker exec`` tar pipes (same pattern as ``docker cp``)
* Port exposure uses Docker's ``HostConfig.PortBindings`` — the returned URL
  is ``http://<host>:<mapped-port>``
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
import tarfile
import uuid
from datetime import datetime, timezone
from functools import wraps
from typing import IO, AsyncIterator, Literal, Optional, TYPE_CHECKING

import aiodocker

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

DEFAULT_TIMEOUT = 3600
LABEL_PREFIX = "ii-sandbox"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def docker_exception_handler(func):
    """Translate Docker-specific exceptions into sandbox domain exceptions."""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except aiodocker.exceptions.DockerError as exc:
            status = getattr(exc, "status", 0)
            if status == 404:
                raise SandboxNotFoundException(str(args[0])) from exc
            raise SandboxGeneralException(
                f"Docker error in {func.__name__}: {exc}"
            ) from exc
        except asyncio.TimeoutError:
            raise SandboxTimeoutException(str(args[0]), func.__name__)
        except (SandboxNotFoundException, SandboxTimeoutException, SandboxGeneralException):
            raise  # re-raise our own exceptions
        except Exception as exc:
            raise SandboxGeneralException(
                f"Failed to {func.__name__}: {exc}"
            ) from exc

    return wrapper


def _make_tar(path: str, data: bytes) -> bytes:
    """Create an in-memory tar archive with a single file at *path*."""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as tar:
        info = tarfile.TarInfo(name=os.path.basename(path))
        info.size = len(data)
        tar.addfile(info, io.BytesIO(data))
    buf.seek(0)
    return buf.read()


def _extract_tar(tar_bytes: bytes, filename: str) -> bytes:
    """Extract a single file from an in-memory tar archive."""
    buf = io.BytesIO(tar_bytes)
    with tarfile.open(fileobj=buf, mode="r") as tar:
        for member in tar.getmembers():
            if member.name == filename or member.name.endswith(f"/{filename}"):
                f = tar.extractfile(member)
                if f:
                    return f.read()
    raise FileNotFoundError(f"{filename} not found in tar archive")


# ---------------------------------------------------------------------------
# Provider
# ---------------------------------------------------------------------------

class DockerSandbox(BaseSandbox):
    """Docker-based sandbox provider for self-hosted deployments.

    Creates isolated containers on the host Docker daemon. The sandbox-server
    container must have ``/var/run/docker.sock`` mounted.
    """

    def __init__(
        self,
        container: aiodocker.docker.DockerContainer,
        container_id: str,
        sandbox_id: str,
        queue: Optional["SandboxQueueScheduler"],
        docker: aiodocker.Docker,
        host_address: str = "localhost",
    ):
        super().__init__()
        self._container = container
        self._container_id = container_id
        self._sandbox_id = sandbox_id
        self._queue = queue
        self._docker = docker
        self._host_address = host_address

    # ---- properties -------------------------------------------------------

    def _ensure_sandbox(self):
        if not self._container:
            raise SandboxNotInitializedError(
                f"Sandbox not initialized: {self._sandbox_id}"
            )

    @property
    def sandbox_id(self) -> str:
        return self._sandbox_id

    @property
    def provider_sandbox_id(self) -> str:
        self._ensure_sandbox()
        return self._container_id

    # ---- class-level lifecycle --------------------------------------------

    @classmethod
    @docker_exception_handler
    async def create(
        cls,
        config: SandboxConfig,
        queue: Optional["SandboxQueueScheduler"] = None,
        sandbox_id: Optional[str] = None,
        metadata: Optional[dict] = None,
        sandbox_template_id: Optional[str] = None,
    ) -> "DockerSandbox":
        docker = aiodocker.Docker()
        sandbox_id = sandbox_id or str(uuid.uuid4())
        image = config.docker_sandbox_image or "ii-agent-sandbox:latest"
        host = config.docker_host_address or "localhost"

        # Labels for identification / lifecycle management
        labels = {
            f"{LABEL_PREFIX}.sandbox-id": sandbox_id,
            f"{LABEL_PREFIX}.managed": "true",
        }
        if metadata:
            for k, v in metadata.items():
                labels[f"{LABEL_PREFIX}.meta.{k}"] = str(v)

        container_config: dict = {
            "Image": image,
            "Labels": labels,
            "Hostname": f"sandbox-{sandbox_id[:8]}",
            "WorkingDir": "/workspace",
            "Cmd": ["bash", "/app/start-services.sh"],
            "HostConfig": {
                "Memory": config.default_memory_limit * 1024 * 1024,  # MB → bytes
                "NanoCpus": config.default_cpu_limit * 1_000_000,  # milli → nano
                "NetworkMode": "bridge" if config.default_network_enabled else "none",
            },
        }

        container = await docker.containers.create_container(config=container_config)
        container_id = container._id  # type: ignore[attr-defined]
        await container.start()

        instance = cls(
            container=container,
            container_id=container_id,
            sandbox_id=sandbox_id,
            queue=queue,
            docker=docker,
            host_address=host,
        )

        # Schedule lifecycle timeout
        await instance._schedule_timeout(config.timeout_seconds, config.pause_before_timeout_seconds)

        logger.info(f"Created Docker sandbox {sandbox_id} (container {container_id[:12]})")
        return instance

    @classmethod
    @docker_exception_handler
    async def connect(
        cls,
        provider_sandbox_id: str,
        config: SandboxConfig,
        queue: Optional["SandboxQueueScheduler"] = None,
        sandbox_id: Optional[str] = None,
    ) -> "DockerSandbox":
        docker = aiodocker.Docker()
        container = docker.containers.container(provider_sandbox_id)
        info = await container.show()
        host = config.docker_host_address or "localhost"

        resolved_sandbox_id = sandbox_id or info.get("Config", {}).get("Labels", {}).get(
            f"{LABEL_PREFIX}.sandbox-id", provider_sandbox_id
        )

        instance = cls(
            container=container,
            container_id=provider_sandbox_id,
            sandbox_id=resolved_sandbox_id,
            queue=queue,
            docker=docker,
            host_address=host,
        )
        logger.info(f"Connected to Docker sandbox {resolved_sandbox_id}")
        return instance

    @classmethod
    @docker_exception_handler
    async def resume(
        cls,
        provider_sandbox_id: str,
        config: SandboxConfig,
        queue: Optional["SandboxQueueScheduler"] = None,
        sandbox_id: Optional[str] = None,
    ) -> "DockerSandbox":
        docker = aiodocker.Docker()
        container = docker.containers.container(provider_sandbox_id)
        await container.unpause()
        host = config.docker_host_address or "localhost"

        info = await container.show()
        resolved_sandbox_id = sandbox_id or info.get("Config", {}).get("Labels", {}).get(
            f"{LABEL_PREFIX}.sandbox-id", provider_sandbox_id
        )

        instance = cls(
            container=container,
            container_id=provider_sandbox_id,
            sandbox_id=resolved_sandbox_id,
            queue=queue,
            docker=docker,
            host_address=host,
        )
        await instance._schedule_timeout(config.timeout_seconds)
        logger.info(f"Resumed Docker sandbox {resolved_sandbox_id}")
        return instance

    @classmethod
    @docker_exception_handler
    async def delete(
        cls,
        provider_sandbox_id: str,
        config: SandboxConfig,
        queue: Optional["SandboxQueueScheduler"] = None,
        sandbox_id: Optional[str] = None,
    ) -> bool:
        docker = aiodocker.Docker()
        try:
            container = docker.containers.container(provider_sandbox_id)
            await container.kill()
        except Exception:
            pass  # already stopped
        try:
            container = docker.containers.container(provider_sandbox_id)
            await container.delete(force=True)
        except Exception:
            pass
        if queue and sandbox_id:
            await queue.cancel_message(sandbox_id)
        logger.info(f"Deleted Docker sandbox container {provider_sandbox_id[:12]}")
        await docker.close()
        return True

    @classmethod
    @docker_exception_handler
    async def stop(
        cls,
        provider_sandbox_id: str,
        config: SandboxConfig,
        queue: Optional["SandboxQueueScheduler"] = None,
        sandbox_id: Optional[str] = None,
    ) -> bool:
        docker = aiodocker.Docker()
        container = docker.containers.container(provider_sandbox_id)
        info = await container.show()
        state = info.get("State", {})

        if state.get("Paused"):
            logger.info(f"Sandbox {sandbox_id} is already paused, skipping")
        else:
            await container.pause()
            logger.info(f"Paused Docker sandbox {sandbox_id}")

        if queue and sandbox_id:
            await queue.cancel_message(sandbox_id)
        await docker.close()
        return True

    @classmethod
    @docker_exception_handler
    async def schedule_timeout(
        cls,
        provider_sandbox_id: str,
        sandbox_id: str,
        config: SandboxConfig,
        queue: Optional["SandboxQueueScheduler"] = None,
        timeout_seconds: int = 0,
    ):
        docker = aiodocker.Docker()
        container = docker.containers.container(provider_sandbox_id)
        info = await container.show()
        state = info.get("State", {})

        if state.get("Paused"):
            logger.info(f"Sandbox {sandbox_id} is already paused, skipping timeout")
            await docker.close()
            return

        instance = cls(
            container=container,
            container_id=provider_sandbox_id,
            sandbox_id=sandbox_id,
            queue=queue,
            docker=docker,
        )
        await instance._schedule_timeout(timeout_seconds)

    # ---- instance-level operations ----------------------------------------

    async def _schedule_timeout(
        self,
        timeout: int = DEFAULT_TIMEOUT,
        pause_before_timeout: int = 600,
    ):
        """Schedule pause → delete cycle through the Redis queue."""
        if self._queue and self._sandbox_id:
            await self._queue.schedule_message(
                sandbox_id=self._sandbox_id,
                action="pause",
                delay_seconds=timeout,
                metadata={
                    "reason": "idle",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            logger.info(
                f"Scheduled timeout for sandbox {self._sandbox_id} in {timeout // 60} min"
            )

    async def get_host(self) -> str:
        self._ensure_sandbox()
        return self._host_address

    @docker_exception_handler
    async def expose_port(self, port: int) -> str:
        """Return a URL for *port* inside the sandbox.

        For Docker we rely on the port already being mapped at container create
        time, or we inspect the container for dynamic host ports.
        """
        self._ensure_sandbox()
        info = await self._container.show()
        network_settings = info.get("NetworkSettings", {})
        ports = network_settings.get("Ports", {})
        key = f"{port}/tcp"
        if key in ports and ports[key]:
            host_port = ports[key][0].get("HostPort", port)
            return f"http://{self._host_address}:{host_port}"
        # If port not explicitly mapped, return internal address
        ip = network_settings.get("IPAddress", self._host_address)
        return f"http://{ip}:{port}"

    # ---- file operations --------------------------------------------------

    @docker_exception_handler
    async def read_file(self, file_path: str) -> str:
        self._ensure_sandbox()
        exec_result = await self._exec(f"cat '{file_path}'")
        return exec_result

    @docker_exception_handler
    async def write_file(self, file_content: str | bytes | IO, file_path: str) -> bool:
        self._ensure_sandbox()
        if isinstance(file_content, str):
            data = file_content.encode("utf-8")
        elif isinstance(file_content, bytes):
            data = file_content
        else:
            data = file_content.read()
            if isinstance(data, str):
                data = data.encode("utf-8")

        # Ensure parent directory exists
        parent = os.path.dirname(file_path)
        if parent:
            await self._exec(f"mkdir -p '{parent}'")

        # Use tar to write file into container
        tar_data = _make_tar(file_path, data)
        await self._container.put_archive(parent or "/", tar_data)
        return True

    @docker_exception_handler
    async def upload_file(self, file_content: str | bytes | IO, remote_file_path: str) -> bool:
        self._ensure_sandbox()
        # Check if file exists
        try:
            result = await self._exec(f"test -f '{remote_file_path}' && echo exists")
            if "exists" in result:
                logger.error(f"File {remote_file_path} already exists")
                return False
        except Exception:
            pass  # file doesn't exist, proceed
        return await self.write_file(file_content, remote_file_path)

    @docker_exception_handler
    async def download_file(
        self, remote_file_path: str, format: Literal["text", "bytes"] = "text"
    ) -> Optional[str | bytes]:
        self._ensure_sandbox()
        tar_stream = await self._container.get_archive(remote_file_path)
        # get_archive returns (tar_data_iterator, stat)
        if isinstance(tar_stream, tuple):
            tar_data_chunks, _ = tar_stream
        else:
            tar_data_chunks = tar_stream

        # Collect all chunks
        all_data = b""
        if hasattr(tar_data_chunks, "__aiter__"):
            async for chunk in tar_data_chunks:
                all_data += chunk
        else:
            all_data = tar_data_chunks

        filename = os.path.basename(remote_file_path)
        content = _extract_tar(all_data, filename)

        if format == "text":
            return content.decode("utf-8")
        return content

    async def download_file_stream(self, remote_file_path: str) -> AsyncIterator[bytes]:
        """Download a file as an async byte stream."""
        self._ensure_sandbox()
        content = await self.download_file(remote_file_path, format="bytes")
        if content:
            yield content  # type: ignore[misc]

    @docker_exception_handler
    async def delete_file(self, file_path: str) -> bool:
        self._ensure_sandbox()
        await self._exec(f"rm -f '{file_path}'")
        return True

    # ---- command execution ------------------------------------------------

    @docker_exception_handler
    async def run_cmd(self, command: str, background: bool = False) -> str:
        """Execute a command inside the sandbox container."""
        self._ensure_sandbox()
        if background:
            # Run in background using nohup
            await self._exec(f"nohup sh -c '{command}' > /dev/null 2>&1 &")
            return ""
        return await self._exec(command)

    @docker_exception_handler
    async def create_directory(self, directory_path: str, exist_ok: bool = False) -> bool:
        self._ensure_sandbox()
        flag = "-p" if exist_ok else ""
        await self._exec(f"mkdir {flag} '{directory_path}'")
        return True

    @docker_exception_handler
    async def cancel_timeout(self):
        """Cancel any scheduled timeout for this sandbox."""
        if self._queue and self._sandbox_id:
            await self._queue.cancel_message(self._sandbox_id)

    # ---- is_paused --------------------------------------------------------

    @classmethod
    @docker_exception_handler
    async def is_paused(cls, config: SandboxConfig, sandbox_id: str) -> bool:
        """Check if a sandbox container is currently paused."""
        docker = aiodocker.Docker()
        try:
            containers = await docker.containers.list(
                all=True,
                filters={
                    "label": [f"{LABEL_PREFIX}.sandbox-id={sandbox_id}"],
                    "status": ["paused"],
                },
            )
            return len(containers) > 0
        finally:
            await docker.close()

    # ---- internal helpers -------------------------------------------------

    async def _exec(self, command: str, user: str = "root") -> str:
        """Run a command via ``docker exec`` and return combined stdout."""
        exec_obj = await self._container.exec(
            cmd=["sh", "-c", command],
            user=user,
        )
        # Collect output
        output_parts: list[str] = []
        async for msg in exec_obj:
            if isinstance(msg, bytes):
                output_parts.append(msg.decode("utf-8", errors="replace"))
            elif isinstance(msg, str):
                output_parts.append(msg)
        result = "".join(output_parts)

        # Check exit code
        inspect = await exec_obj.inspect()
        exit_code = inspect.get("ExitCode", -1)
        if exit_code != 0:
            raise Exception(f"Command failed (exit {exit_code}): {command}\n{result}")

        return result
