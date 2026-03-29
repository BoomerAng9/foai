"""ProjectPlanManager — every task requires a plan before execution.

Agents draft: task, role, mission, vision, objective, steps.
Plans are embedded for semantic recall and measured on completion.
This is the foundation for running a real org agentically.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from aims_memory.db import get_pool
from aims_memory.embeddings import generate_embedding


class ProjectPlanManager:
    """Project plan lifecycle for any FOAI agent."""

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

    async def draft(
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
        """Draft a project plan. Returns the plan ID.

        Every agent must draft a plan before executing a task.
        The plan captures role, mission, vision, objective — like
        a real employee's project brief.
        """
        plan_text = (
            f"Task: {title}\n"
            f"Agent: {self.agent_name} ({self.agent_tier})\n"
            f"Role: {role}\n"
            f"Mission: {mission}\n"
            f"Vision: {vision}\n"
            f"Objective: {objective}\n"
            f"Steps: {', '.join(steps)}"
        )
        embedding = await generate_embedding(plan_text)
        vector_str = f"[{','.join(str(v) for v in embedding)}]"

        pool = await get_pool()
        row = await pool.fetchrow(
            """
            INSERT INTO project_plans
                (tenant_id, agent_name, agent_tier, dept, task_id, title,
                 role, mission, vision, objective, steps,
                 estimated_duration_ms, embedding)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::vector)
            RETURNING id
            """,
            self.tenant_id,
            self.agent_name,
            self.agent_tier,
            self.dept,
            task_id,
            title,
            role,
            mission,
            vision,
            objective,
            json.dumps(steps),
            estimated_duration_ms,
            vector_str,
        )
        return str(row["id"])

    async def start(self, plan_id: str) -> None:
        """Mark a plan as in_progress."""
        pool = await get_pool()
        await pool.execute(
            "UPDATE project_plans SET status = 'in_progress' WHERE id = $1",
            plan_id,
        )

    async def complete(
        self,
        plan_id: str,
        actual_duration_ms: int,
        score: int,
        grade: str,
    ) -> None:
        """Mark a plan as completed with performance metrics."""
        pool = await get_pool()
        await pool.execute(
            """
            UPDATE project_plans
            SET status = 'completed',
                actual_duration_ms = $2,
                score = $3,
                grade = $4,
                completed_at = NOW()
            WHERE id = $1
            """,
            plan_id,
            actual_duration_ms,
            score,
            grade,
        )

    async def fail(self, plan_id: str, actual_duration_ms: int) -> None:
        """Mark a plan as failed."""
        pool = await get_pool()
        await pool.execute(
            """
            UPDATE project_plans
            SET status = 'failed', actual_duration_ms = $2, completed_at = NOW()
            WHERE id = $1
            """,
            plan_id,
            actual_duration_ms,
        )

    async def recall_similar_plans(
        self, query: str, top_k: int = 5
    ) -> list[dict]:
        """Find semantically similar past plans for reference."""
        embedding = await generate_embedding(query)
        vector_str = f"[{','.join(str(v) for v in embedding)}]"

        pool = await get_pool()
        rows = await pool.fetch(
            """
            SELECT id, task_id, title, role, mission, vision, objective,
                   steps, status, score, grade, actual_duration_ms,
                   created_at, completed_at,
                   1 - (embedding <=> $2::vector) AS similarity
            FROM project_plans
            WHERE tenant_id = $1 AND agent_name = $3
            ORDER BY embedding <=> $2::vector
            LIMIT $4
            """,
            self.tenant_id,
            vector_str,
            self.agent_name,
            top_k,
        )

        return [
            {
                "id": str(r["id"]),
                "task_id": r["task_id"],
                "title": r["title"],
                "role": r["role"],
                "mission": r["mission"],
                "objective": r["objective"],
                "steps": json.loads(r["steps"]),
                "status": r["status"],
                "score": r["score"],
                "grade": r["grade"],
                "duration_ms": r["actual_duration_ms"],
                "similarity": round(float(r["similarity"]), 4),
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ]

    async def get_agent_stats(self) -> dict:
        """Get aggregate plan statistics for this agent."""
        pool = await get_pool()
        row = await pool.fetchrow(
            """
            SELECT
                COUNT(*) AS total_plans,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed,
                COUNT(*) FILTER (WHERE status = 'failed') AS failed,
                AVG(score) FILTER (WHERE status = 'completed') AS avg_score,
                AVG(actual_duration_ms) FILTER (WHERE status = 'completed') AS avg_duration_ms
            FROM project_plans
            WHERE tenant_id = $1 AND agent_name = $2
            """,
            self.tenant_id,
            self.agent_name,
        )
        return {
            "agent_name": self.agent_name,
            "total_plans": row["total_plans"],
            "completed": row["completed"],
            "failed": row["failed"],
            "avg_score": round(float(row["avg_score"]), 1) if row["avg_score"] else None,
            "avg_duration_ms": int(row["avg_duration_ms"]) if row["avg_duration_ms"] else None,
        }
