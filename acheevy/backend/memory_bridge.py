"""ACHEEVY Executive Memory Bridge — org-wide memory for the Digital CEO.

ACHEEVY (Boss tier) uses aims-memory for:
1. Strategic decision memory — every dispatch, decision, and outcome is embedded
2. Org-wide recall — searches ALL agent memories (include_all_agents=True)
3. Project plan oversight — drafts executive-level plans for strategic tasks
4. HR PMO evaluations — triggers and reviews agent performance via Hermes
5. KPI/OKR management — defines and tracks org-level objectives

Usage:
    from memory_bridge import AcheevyMemory
    mem = AcheevyMemory()
    await mem.record_decision("Deployed Edu_Ang to handle MindEdge enrollments")
    context = await mem.org_recall("enrollment performance")
"""

import os
import sys

# Add aims-memory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "aims-memory"))

from aims_memory.agent_mixin import AgentMemoryMixin
from aims_memory.hr_pmo import HRPMOManager
from aims_memory.kpi_definitions import AGENT_KPIS, register_all_kpis

DEFAULT_TENANT = os.getenv("DEFAULT_TENANT", "cti")


class AcheevyMemory:
    """Executive memory layer for ACHEEVY — the Digital CEO."""

    def __init__(self, tenant_id: str = DEFAULT_TENANT):
        self.tenant_id = tenant_id
        self.mixin = AgentMemoryMixin(
            agent_name="ACHEEVY",
            agent_tier="boss",
            dept=None,
            tenant_id=tenant_id,
        )
        self._hr_managers: dict[str, HRPMOManager] | None = None

    # ─── Strategic Decisions ────────────────────────────────

    async def record_decision(
        self, decision: str, context: str = "", source_id: str | None = None
    ) -> str:
        """Record a strategic decision in memory."""
        content = f"STRATEGIC DECISION: {decision}"
        if context:
            content += f"\nContext: {context}"
        return await self.mixin.memory.store(
            content=content,
            memory_type="decision",
            summary=f"Decision: {decision[:200]}",
            source_id=source_id,
        )

    async def record_dispatch(
        self, agent_name: str, task: str, reasoning: str = ""
    ) -> str:
        """Record an agent deployment/dispatch decision."""
        content = f"DISPATCH: Deployed {agent_name} for task: {task}"
        if reasoning:
            content += f"\nReasoning: {reasoning}"
        return await self.mixin.memory.store(
            content=content,
            memory_type="task",
            summary=f"Dispatched {agent_name}: {task[:150]}",
        )

    # ─── Org-Wide Recall ────────────────────────────────────

    async def org_recall(self, query: str, top_k: int = 5) -> list[dict]:
        """Search ALL agent memories across the org (boss privilege)."""
        return await self.mixin.memory.recall(
            query, top_k=top_k, include_all_agents=True
        )

    async def org_recall_formatted(self, query: str, top_k: int = 5) -> str:
        """Search org-wide memory and return formatted context."""
        memories = await self.org_recall(query, top_k)
        if not memories:
            return ""
        lines = ["## Org-Wide Memory Recall (ACHEEVY Executive View)\n"]
        for i, mem in enumerate(memories, 1):
            lines.append(
                f"### Memory {i} — {mem['agent_name']} ({mem['agent_tier']})"
            )
            lines.append(
                f"Type: {mem['memory_type']} | "
                f"Similarity: {mem.get('similarity', 'N/A')} | "
                f"Date: {mem['created_at']}"
            )
            if mem.get("summary"):
                lines.append(f"**Summary:** {mem['summary']}")
            lines.append(mem["content"][:500])
            lines.append("")
        return "\n".join(lines)

    # ─── Executive Project Plans ────────────────────────────

    async def executive_plan(
        self,
        task_id: str,
        title: str,
        mission: str,
        vision: str,
        objective: str,
        steps: list[str],
    ) -> str:
        """Draft an executive-level project plan."""
        return await self.mixin.pre_task(
            task_id=task_id,
            title=title,
            role="Digital CEO — strategic oversight and governance",
            mission=mission,
            vision=vision,
            objective=objective,
            steps=steps,
        )

    async def complete_plan(
        self, plan_id: str, task_id: str, score: int, grade: str,
        duration_ms: int, summary: str
    ) -> str:
        """Complete an executive plan and store the outcome."""
        return await self.mixin.post_task(
            plan_id=plan_id,
            task_id=task_id,
            score=score,
            grade=grade,
            duration_ms=duration_ms,
            summary=summary,
        )

    # ─── HR PMO Management ──────────────────────────────────

    def _get_hr_managers(self) -> dict[str, HRPMOManager]:
        """Lazy-initialize HR managers for all known agents."""
        if self._hr_managers is None:
            self._hr_managers = {}
            for agent_name in AGENT_KPIS:
                tier = "boss" if agent_name == "ACHEEVY" else \
                       "2ic" if agent_name == "Chicken_Hawk" else \
                       "engine" if agent_name == "Hermes" else "boomer_ang"
                self._hr_managers[agent_name] = HRPMOManager(
                    agent_name=agent_name,
                    agent_tier=tier,
                    tenant_id=self.tenant_id,
                )
        return self._hr_managers

    async def register_all_kpis(self) -> int:
        """Register KPIs for all agents in the org."""
        return await register_all_kpis(self._get_hr_managers())

    async def get_org_scorecard(self) -> list[dict]:
        """Get the latest HR PMO evaluation for every agent."""
        return await self.mixin.hr.get_org_scorecard()

    async def evaluate_agent(
        self, agent_name: str, period: str,
        kpi_summary: dict, okr_summary: dict,
        overall_score: int, grade: str,
        strengths: list[str], improvements: list[str],
        directive: str | None = None,
    ) -> str:
        """Record an HR PMO evaluation for a specific agent."""
        managers = self._get_hr_managers()
        hr = managers.get(agent_name)
        if hr is None:
            hr = HRPMOManager(agent_name, "boomer_ang", tenant_id=self.tenant_id)
        return await hr.evaluate(
            period=period,
            kpi_summary=kpi_summary,
            okr_summary=okr_summary,
            overall_score=overall_score,
            grade=grade,
            strengths=strengths,
            improvements=improvements,
            directive=directive,
            evaluated_by="acheevy",
        )
