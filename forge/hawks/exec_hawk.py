"""Lil_Exec_Hawk — step execution via MoEx adapter (Claw-Code/Codex/Gemini).

Takes a task from the DAG and executes it via the appropriate adapter,
with support for iterative re-execution when gates fail.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Optional

from forge.adapters.base import ExecutionResult, ExecutorAdapter
from forge.core.runtime import AdapterRegistry

logger = logging.getLogger("forge.hawks.exec")


@dataclass
class ExecutionContext:
    """Context passed to an adapter during task execution."""

    run_id: str
    workflow_id: str
    step_id: str
    task_description: str = ""
    gate_feedback: Optional[str] = None
    iteration: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)


class ExecHawk:
    """Lil_Exec_Hawk: executes steps via the MoEx adapter registry.

    Resolves the adapter by name from the registry, builds a prompt from
    the task context, and supports iterative re-execution with gate feedback.
    """

    name: str = "Lil_Exec_Hawk"
    role: str = "EXEC"

    def __init__(self, adapter_registry: Optional[AdapterRegistry] = None) -> None:
        self._registry = adapter_registry or AdapterRegistry()

    async def execute_task(
        self,
        task: dict[str, Any],
        adapter_name: str,
        cwd: str,
        gate_feedback: Optional[str] = None,
        iteration: int = 0,
    ) -> ExecutionResult:
        """Execute a task via the named adapter.

        Args:
            task: Task dict with at least 'description' and 'id' keys.
            adapter_name: Name of the adapter to use (e.g., 'claw_code').
            cwd: Working directory for execution.
            gate_feedback: Feedback from a previous gate failure (for retry).
            iteration: Current iteration number (0-based).

        Returns:
            ExecutionResult from the adapter.

        Raises:
            ValueError: If the adapter is not found in the registry.
        """
        adapter: Optional[ExecutorAdapter] = self._resolve_adapter(adapter_name)
        if adapter is None:
            msg = (
                f"Adapter '{adapter_name}' not found in registry. "
                f"Available: {self._registry.list_adapters()}"
            )
            raise ValueError(msg)

        prompt = self._build_prompt(task, gate_feedback, iteration)
        context = {
            "run_id": task.get("run_id", ""),
            "workflow_id": task.get("workflow_id", ""),
            "step_id": task.get("id", ""),
            "iteration": iteration,
        }

        logger.info(
            "Executing task '%s' via adapter '%s' (iteration %d, cwd=%s)",
            task.get("id", "unknown"),
            adapter_name,
            iteration,
            cwd,
        )

        result = await adapter.execute(prompt, context, cwd)

        logger.info(
            "Task '%s' completed: exit_code=%d, duration=%dms",
            task.get("id", "unknown"),
            result.exit_code,
            result.duration_ms,
        )

        return result

    def _resolve_adapter(self, adapter_name: str) -> Optional[ExecutorAdapter]:
        """Resolve an adapter from the registry by name.

        Also handles ${ENV_VAR} resolution.

        Args:
            adapter_name: Adapter name or env var reference.

        Returns:
            The adapter instance, or None if not found.
        """
        if adapter_name.startswith("${") and adapter_name.endswith("}"):
            import os
            env_var = adapter_name[2:-1]
            adapter_name = os.environ.get(env_var, "")
        elif adapter_name.startswith("$"):
            import os
            adapter_name = os.environ.get(adapter_name[1:], "")

        if not adapter_name:
            return None

        return self._registry.get(adapter_name)

    @staticmethod
    def _build_prompt(
        task: dict[str, Any],
        gate_feedback: Optional[str],
        iteration: int,
    ) -> str:
        """Build an execution prompt from the task and optional gate feedback.

        Args:
            task: Task dict with description and metadata.
            gate_feedback: Previous gate failure output (if retrying).
            iteration: Current iteration number.

        Returns:
            Formatted prompt string.
        """
        description = task.get("description", "Execute the requested task")
        prompt_parts: list[str] = [f"Task: {description}"]

        if iteration > 0 and gate_feedback:
            prompt_parts.append(
                f"\n--- Gate Feedback (iteration {iteration}) ---\n"
                f"The previous attempt failed gate validation. Fix the following issues:\n"
                f"{gate_feedback}"
            )

        action = task.get("action", "")
        if action:
            prompt_parts.append(f"\nAction: {action}")

        return "\n".join(prompt_parts)
