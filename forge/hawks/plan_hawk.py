"""Lil_Plan_Hawk — RFP fragment decomposition into workflow plans and task DAGs.

Takes an RFP fragment (text) and decomposes it into a task DAG using
the configured LLM adapter for structured plan generation.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Optional, Protocol

logger = logging.getLogger("forge.hawks.plan")


class LLMAdapter(Protocol):
    """Protocol for LLM adapters used by PlanHawk."""

    async def execute(
        self, prompt: str, context: dict[str, Any], cwd: str
    ) -> Any: ...


@dataclass
class TaskNode:
    """A single task in the decomposed plan."""

    id: str
    description: str
    dependencies: list[str] = field(default_factory=list)
    complexity: str = "medium"  # low, medium, high
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class TaskDAG:
    """Directed acyclic graph of tasks produced by plan decomposition."""

    tasks: list[TaskNode] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def task_ids(self) -> list[str]:
        """Return all task IDs in order."""
        return [t.id for t in self.tasks]

    def get_task(self, task_id: str) -> Optional[TaskNode]:
        """Look up a task by ID."""
        for t in self.tasks:
            if t.id == task_id:
                return t
        return None


_DECOMPOSE_PROMPT_TEMPLATE = """You are a technical project planner. Given the following RFP fragment,
decompose it into a sequence of implementation tasks.

RFP Fragment:
{rfp_text}

Context:
{context_json}

Return a JSON array of tasks, each with:
- "id": short kebab-case identifier
- "description": what to implement
- "dependencies": list of task IDs this depends on (empty for first tasks)
- "complexity": "low", "medium", or "high"

Return ONLY valid JSON, no markdown fences."""


class PlanHawk:
    """Lil_Plan_Hawk: decomposes RFP fragments into task DAGs.

    Uses an LLM adapter to generate structured plans from natural-language
    RFP fragments. Falls back to a single-task plan if LLM is unavailable.
    """

    name: str = "Lil_Plan_Hawk"
    role: str = "PLAN"

    def __init__(self, llm_adapter: Optional[LLMAdapter] = None) -> None:
        self._llm = llm_adapter

    async def decompose_rfp(self, rfp_text: str, context: dict[str, Any]) -> TaskDAG:
        """Decompose an RFP fragment into a task DAG.

        Args:
            rfp_text: The RFP fragment to decompose.
            context: Additional context (workflow inputs, run metadata).

        Returns:
            TaskDAG with ordered tasks and dependencies.
        """
        if self._llm is None:
            logger.info("No LLM adapter configured, returning single-task fallback plan")
            return self._fallback_plan(rfp_text)

        prompt = _DECOMPOSE_PROMPT_TEMPLATE.format(
            rfp_text=rfp_text,
            context_json=json.dumps(context, default=str),
        )

        try:
            result = await self._llm.execute(prompt, context, cwd=".")
            raw_output = result.stdout if hasattr(result, "stdout") else str(result)
            return self._parse_llm_output(raw_output, rfp_text)
        except Exception as exc:
            logger.warning("LLM decomposition failed (%s), using fallback plan", exc)
            return self._fallback_plan(rfp_text)

    def _parse_llm_output(self, raw_output: str, rfp_text: str) -> TaskDAG:
        """Parse LLM JSON output into a TaskDAG.

        Args:
            raw_output: Raw LLM response (expected JSON array).
            rfp_text: Original RFP for fallback context.

        Returns:
            Parsed TaskDAG.
        """
        try:
            # Strip markdown fences if present
            cleaned = raw_output.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                lines = [ln for ln in lines if not ln.strip().startswith("```")]
                cleaned = "\n".join(lines)

            tasks_data: list[dict[str, Any]] = json.loads(cleaned)
            tasks: list[TaskNode] = []
            for item in tasks_data:
                tasks.append(TaskNode(
                    id=item.get("id", f"task-{len(tasks)}"),
                    description=item.get("description", ""),
                    dependencies=item.get("dependencies", []),
                    complexity=item.get("complexity", "medium"),
                ))
            return TaskDAG(tasks=tasks, metadata={"source": "llm"})
        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            logger.warning("Failed to parse LLM output (%s), using fallback", exc)
            return self._fallback_plan(rfp_text)

    @staticmethod
    def _fallback_plan(rfp_text: str) -> TaskDAG:
        """Generate a single-task fallback plan.

        Args:
            rfp_text: The RFP text to use as the task description.

        Returns:
            TaskDAG with one task.
        """
        return TaskDAG(
            tasks=[
                TaskNode(
                    id="task-0",
                    description=rfp_text[:500],
                    dependencies=[],
                    complexity="medium",
                )
            ],
            metadata={"source": "fallback"},
        )
