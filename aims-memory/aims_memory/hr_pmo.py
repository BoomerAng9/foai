"""HR PMO Manager — KPI/OKR tracking and performance evaluation.

Every agent is measured like a real employee. HR PMO tracks:
- KPIs: quantitative metrics measured at intervals
- OKRs: quarterly objectives with key results
- Evaluations: periodic reviews combining KPIs + OKRs + plan outcomes

This is what makes FOAI a real agentic organization —
measurable, accountable, improvable.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from aims_memory.db import get_pool
from aims_memory.embeddings import generate_embedding


class HRPMOManager:
    """HR PMO performance tracking for any FOAI agent."""

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

    # ─── KPIs ───────────────────────────────────────────────

    async def define_kpi(
        self,
        kpi_name: str,
        description: str,
        target_value: float,
        unit: str = "percent",
        interval: str = "weekly",
    ) -> None:
        """Define a KPI for this agent. Upserts on (tenant, agent, kpi_name)."""
        pool = await get_pool()
        await pool.execute(
            """
            INSERT INTO agent_kpis
                (tenant_id, agent_name, agent_tier, kpi_name, kpi_description,
                 target_value, unit, measurement_interval)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (tenant_id, agent_name, kpi_name) DO UPDATE SET
                kpi_description = EXCLUDED.kpi_description,
                target_value = EXCLUDED.target_value,
                unit = EXCLUDED.unit,
                measurement_interval = EXCLUDED.measurement_interval
            """,
            self.tenant_id,
            self.agent_name,
            self.agent_tier,
            kpi_name,
            description,
            target_value,
            unit,
            interval,
        )

    async def record_kpi(
        self,
        kpi_name: str,
        actual_value: float,
        period_start: datetime,
        period_end: datetime,
    ) -> dict:
        """Record a KPI measurement. Returns the result with met/delta."""
        pool = await get_pool()

        # Fetch target
        kpi = await pool.fetchrow(
            """
            SELECT target_value FROM agent_kpis
            WHERE tenant_id = $1 AND agent_name = $2 AND kpi_name = $3
            """,
            self.tenant_id,
            self.agent_name,
            kpi_name,
        )
        target = kpi["target_value"] if kpi else 0.0
        met = actual_value >= target
        delta = actual_value - target

        await pool.execute(
            """
            INSERT INTO kpi_measurements
                (tenant_id, agent_name, kpi_name, actual_value, target_value,
                 met, delta, period_start, period_end)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            self.tenant_id,
            self.agent_name,
            kpi_name,
            actual_value,
            target,
            met,
            delta,
            period_start,
            period_end,
        )

        return {
            "kpi_name": kpi_name,
            "actual": actual_value,
            "target": target,
            "met": met,
            "delta": round(delta, 4),
        }

    async def get_kpi_history(
        self, kpi_name: str, limit: int = 20
    ) -> list[dict]:
        """Get measurement history for a specific KPI."""
        pool = await get_pool()
        rows = await pool.fetch(
            """
            SELECT actual_value, target_value, met, delta,
                   period_start, period_end, measured_at
            FROM kpi_measurements
            WHERE tenant_id = $1 AND agent_name = $2 AND kpi_name = $3
            ORDER BY measured_at DESC
            LIMIT $4
            """,
            self.tenant_id,
            self.agent_name,
            kpi_name,
            limit,
        )
        return [
            {
                "actual": float(r["actual_value"]),
                "target": float(r["target_value"]),
                "met": r["met"],
                "delta": round(float(r["delta"]), 4) if r["delta"] else 0,
                "period_start": r["period_start"].isoformat(),
                "period_end": r["period_end"].isoformat(),
                "measured_at": r["measured_at"].isoformat(),
            }
            for r in rows
        ]

    # ─── OKRs ───────────────────────────────────────────────

    async def set_okr(
        self,
        quarter: str,
        objective: str,
        key_results: list[dict],
    ) -> str:
        """Set a quarterly OKR. Returns the OKR ID.

        key_results: [{"key_result": "...", "target_value": 100, "unit": "count"}]
        """
        pool = await get_pool()

        row = await pool.fetchrow(
            """
            INSERT INTO agent_okrs
                (tenant_id, agent_name, agent_tier, quarter, objective)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            """,
            self.tenant_id,
            self.agent_name,
            self.agent_tier,
            quarter,
            objective,
        )
        okr_id = row["id"]

        for kr in key_results:
            await pool.execute(
                """
                INSERT INTO okr_key_results (okr_id, key_result, target_value, unit)
                VALUES ($1, $2, $3, $4)
                """,
                okr_id,
                kr["key_result"],
                kr["target_value"],
                kr.get("unit", "count"),
            )

        return str(okr_id)

    async def update_key_result(
        self, kr_id: str, current_value: float
    ) -> None:
        """Update progress on a key result."""
        pool = await get_pool()
        await pool.execute(
            "UPDATE okr_key_results SET current_value = $2, updated_at = NOW() WHERE id = $1",
            kr_id,
            current_value,
        )

    async def get_okr_progress(self, quarter: str) -> list[dict]:
        """Get OKR progress for a quarter."""
        pool = await get_pool()
        rows = await pool.fetch(
            """
            SELECT o.id, o.objective, o.status,
                   kr.id AS kr_id, kr.key_result, kr.target_value,
                   kr.current_value, kr.progress
            FROM agent_okrs o
            JOIN okr_key_results kr ON kr.okr_id = o.id
            WHERE o.tenant_id = $1 AND o.agent_name = $2 AND o.quarter = $3
            ORDER BY o.id, kr.id
            """,
            self.tenant_id,
            self.agent_name,
            quarter,
        )

        okrs: dict[str, dict] = {}
        for r in rows:
            oid = str(r["id"])
            if oid not in okrs:
                okrs[oid] = {
                    "id": oid,
                    "objective": r["objective"],
                    "status": r["status"],
                    "key_results": [],
                }
            okrs[oid]["key_results"].append({
                "id": str(r["kr_id"]),
                "key_result": r["key_result"],
                "target": float(r["target_value"]),
                "current": float(r["current_value"]),
                "progress": round(float(r["progress"]), 1),
            })

        return list(okrs.values())

    # ─── HR PMO Evaluations ─────────────────────────────────

    async def evaluate(
        self,
        period: str,
        kpi_summary: dict,
        okr_summary: dict,
        overall_score: int,
        grade: str,
        strengths: list[str],
        improvements: list[str],
        directive: str | None = None,
        eval_type: str = "periodic",
        evaluated_by: str = "hermes",
    ) -> str:
        """Record an HR PMO performance evaluation. Returns eval ID."""
        eval_text = (
            f"Agent: {self.agent_name} ({self.agent_tier})\n"
            f"Period: {period}\n"
            f"Score: {overall_score}/100 (Grade: {grade})\n"
            f"Strengths: {', '.join(strengths)}\n"
            f"Improvements: {', '.join(improvements)}\n"
            f"Directive: {directive or 'None'}\n"
            f"KPIs: {json.dumps(kpi_summary)}\n"
            f"OKRs: {json.dumps(okr_summary)}"
        )
        embedding = await generate_embedding(eval_text)
        vector_str = f"[{','.join(str(v) for v in embedding)}]"

        pool = await get_pool()
        row = await pool.fetchrow(
            """
            INSERT INTO hr_pmo_evaluations
                (tenant_id, agent_name, agent_tier, dept, eval_type, period,
                 kpi_summary, okr_summary, overall_score, grade,
                 strengths, improvements, directive, evaluated_by, embedding)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::vector)
            RETURNING id
            """,
            self.tenant_id,
            self.agent_name,
            self.agent_tier,
            self.dept,
            eval_type,
            period,
            json.dumps(kpi_summary),
            json.dumps(okr_summary),
            overall_score,
            grade,
            json.dumps(strengths),
            json.dumps(improvements),
            directive,
            evaluated_by,
            vector_str,
        )
        return str(row["id"])

    async def get_evaluation_history(self, limit: int = 10) -> list[dict]:
        """Get recent HR PMO evaluations for this agent."""
        pool = await get_pool()
        rows = await pool.fetch(
            """
            SELECT id, eval_type, period, overall_score, grade,
                   strengths, improvements, directive, evaluated_by, created_at
            FROM hr_pmo_evaluations
            WHERE tenant_id = $1 AND agent_name = $2
            ORDER BY created_at DESC
            LIMIT $3
            """,
            self.tenant_id,
            self.agent_name,
            limit,
        )
        return [
            {
                "id": str(r["id"]),
                "eval_type": r["eval_type"],
                "period": r["period"],
                "score": r["overall_score"],
                "grade": r["grade"],
                "strengths": json.loads(r["strengths"]),
                "improvements": json.loads(r["improvements"]),
                "directive": r["directive"],
                "evaluated_by": r["evaluated_by"],
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ]

    async def get_org_scorecard(self) -> list[dict]:
        """Get the latest evaluation for ALL agents (org-wide view).

        Used by ACHEEVY and Hermes for org-wide performance dashboards.
        """
        pool = await get_pool()
        rows = await pool.fetch(
            """
            SELECT DISTINCT ON (agent_name)
                agent_name, agent_tier, dept, overall_score, grade,
                period, directive, created_at
            FROM hr_pmo_evaluations
            WHERE tenant_id = $1
            ORDER BY agent_name, created_at DESC
            """,
            self.tenant_id,
        )
        return [
            {
                "agent_name": r["agent_name"],
                "agent_tier": r["agent_tier"],
                "dept": r["dept"],
                "score": r["overall_score"],
                "grade": r["grade"],
                "period": r["period"],
                "directive": r["directive"],
                "last_eval": r["created_at"].isoformat(),
            }
            for r in rows
        ]
