"""Forge adapter base — abstract ExecutorAdapter and ExecutionResult."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ExecutionResult:
    """Result of an adapter execution."""

    stdout: str
    stderr: str
    exit_code: int
    files_changed: list[str] = field(default_factory=list)
    duration_ms: int = 0


class ExecutorAdapter(ABC):
    """Abstract base class for all MoEx execution adapters.

    Each adapter wraps a specific code-generation tool (Claw-Code, Codex, Gemini)
    and normalizes its output into an ExecutionResult.

    Zero outbound network calls are made by the adapter base itself.
    Only concrete adapter implementations call their respective model APIs.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique adapter identifier used in workflow YAML and adapter registry."""
        ...

    @abstractmethod
    async def execute(
        self,
        prompt: str,
        context: dict[str, object],
        cwd: str,
    ) -> ExecutionResult:
        """Execute a prompt and return the result.

        Args:
            prompt: The natural-language prompt or instruction.
            context: Run context (run_id, workflow_id, inputs, step_id, etc.).
            cwd: Working directory for the execution.

        Returns:
            ExecutionResult with stdout, stderr, exit code, and changed files.
        """
        ...
