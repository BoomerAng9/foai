"""Shared memory hooks for Boomer_Angs — wraps aims-memory AgentMemoryMixin.

Integrates with the state_emitter lifecycle so every task gets:
1. A project plan drafted before execution
2. Relevant memories recalled for context
3. Task results stored in org memory after completion

Drop-in for any Boomer_Ang:

    from memory_hooks import MemoryHooks
    hooks = MemoryHooks("Edu_Ang", "boomer_ang", "PMO-LAUNCH")

    # Before task:
    plan_id, context = await hooks.before_task(task_id, title, ...)

    # After task:
    await hooks.after_task(plan_id, task_id, score, grade, duration_ms, summary)
"""

import logging
import os
import sys

# Add aims-memory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "aims-memory"))

from aims_memory.agent_mixin import AgentMemoryMixin

logger = logging.getLogger("memory_hooks")

DEFAULT_TENANT = os.getenv("DEFAULT_TENANT", "cti")


class MemoryHooks:
    """Memory + planning hooks for Boomer_Ang agents."""

    def __init__(
        self,
        agent_name: str,
        agent_tier: str = "boomer_ang",
        dept: str | None = None,
        tenant_id: str | None = None,
    ):
        self.mixin = AgentMemoryMixin(
            agent_name=agent_name,
            agent_tier=agent_tier,
            dept=dept,
            tenant_id=tenant_id or DEFAULT_TENANT,
        )
        self.agent_name = agent_name

    async def before_task(
        self,
        task_id: str,
        title: str,
        role: str,
        mission: str,
        vision: str,
        objective: str,
        steps: list[str],
        estimated_duration_ms: int | None = None,
    ) -> tuple[str, str]:
        """Draft a project plan and recall context. Returns (plan_id, memory_context)."""
        try:
            plan_id = await self.mixin.pre_task(
                task_id=task_id,
                title=title,
                role=role,
                mission=mission,
                vision=vision,
                objective=objective,
                steps=steps,
                estimated_duration_ms=estimated_duration_ms,
            )
            context = await self.mixin.recall_for_task(f"{title}: {objective}")
            return plan_id, context
        except Exception:
            logger.warning("%s: memory before_task failed, continuing without memory", self.agent_name)
            return "", ""

    async def after_task(
        self,
        plan_id: str,
        task_id: str,
        score: int,
        grade: str,
        duration_ms: int,
        summary: str,
        success: bool = True,
    ) -> None:
        """Complete plan and store task memory."""
        if not plan_id:
            return
        try:
            await self.mixin.post_task(
                plan_id=plan_id,
                task_id=task_id,
                score=score,
                grade=grade,
                duration_ms=duration_ms,
                summary=summary,
                success=success,
            )
        except Exception:
            logger.warning("%s: memory after_task failed", self.agent_name)

    async def recall(self, query: str, top_k: int = 3) -> str:
        """Quick memory recall, returns formatted context."""
        try:
            return await self.mixin.recall_for_task(query, top_k)
        except Exception:
            return ""
