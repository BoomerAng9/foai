"""AgentMemoryMixin — drop-in memory + planning for any FOAI FastAPI agent.

Provides:
- Memory client (semantic store/recall)
- Project plan manager (draft/start/complete plans per task)
- HR PMO manager (KPIs, OKRs, evaluations)
- Pre-task planning hook (draft plan before every task)
- Post-task logging hook (store result in memory + complete plan)

Usage in any Boomer_Ang, Lil_Hawk, or engine:

    from aims_memory.agent_mixin import AgentMemoryMixin

    mixin = AgentMemoryMixin("Edu_Ang", "boomer_ang", "PMO-LAUNCH")

    # Before a task:
    plan_id = await mixin.pre_task(task_id, title, ...)

    # After a task:
    await mixin.post_task(plan_id, task_id, score, grade, duration_ms, summary)
"""

from __future__ import annotations

from aims_memory.client import MemoryClient
from aims_memory.plans import ProjectPlanManager
from aims_memory.hr_pmo import HRPMOManager


class AgentMemoryMixin:
    """Unified memory, planning, and performance tracking for any agent."""

    def __init__(
        self,
        agent_name: str,
        agent_tier: str,
        dept: str | None = None,
        tenant_id: str = "cti",
    ):
        self.agent_name = agent_name
        self.agent_tier = agent_tier
        self.dept = dept
        self.tenant_id = tenant_id

        self.memory = MemoryClient(agent_name, agent_tier, dept, tenant_id)
        self.plans = ProjectPlanManager(agent_name, agent_tier, dept, tenant_id)
        self.hr = HRPMOManager(agent_name, agent_tier, dept, tenant_id)

    async def pre_task(
        self,
        task_id: str,
        title: str,
        role: str,
        mission: str,
        vision: str,
        objective: str,
        steps: list[str],
        estimated_duration_ms: int | None = None,
    ) -> str:
        """Draft a project plan and recall relevant memories before task execution.

        Every agent must call this before starting work. Returns plan_id.
        """
        # Draft the plan
        plan_id = await self.plans.draft(
            task_id=task_id,
            title=title,
            role=role,
            mission=mission,
            vision=vision,
            objective=objective,
            steps=steps,
            estimated_duration_ms=estimated_duration_ms,
        )

        # Mark plan as in progress
        await self.plans.start(plan_id)

        return plan_id

    async def recall_for_task(self, task_description: str, top_k: int = 3) -> str:
        """Recall relevant memories for the current task. Returns formatted context."""
        memories = await self.memory.recall(task_description, top_k=top_k)
        return self.memory.format_context(memories)

    async def post_task(
        self,
        plan_id: str,
        task_id: str,
        score: int,
        grade: str,
        duration_ms: int,
        summary: str,
        success: bool = True,
    ) -> str:
        """Complete a task: finalize plan, store memory. Returns memory ID."""
        # Complete or fail the plan
        if success:
            await self.plans.complete(plan_id, duration_ms, score, grade)
        else:
            await self.plans.fail(plan_id, duration_ms)

        # Store the task result as a memory
        memory_id = await self.memory.store(
            content=summary,
            memory_type="task",
            summary=f"{self.agent_name}: {summary[:200]}",
            source_id=task_id,
            metadata={
                "plan_id": plan_id,
                "score": score,
                "grade": grade,
                "duration_ms": duration_ms,
                "success": success,
            },
        )

        return memory_id
