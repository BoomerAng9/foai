"""HR PMO evaluation routes — agent performance reviews via aims-memory.

Hermes acts as the evaluation engine for the entire org's HR PMO.
Measures agents against KPIs and OKRs, stores evaluations in pgvector,
and provides org-wide scorecards for ACHEEVY.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "aims-memory"))

from fastapi import APIRouter, Query
from pydantic import BaseModel

from config import DEFAULT_TENANT
from aims_memory.hr_pmo import HRPMOManager
from aims_memory.plans import ProjectPlanManager
from aims_memory.kpi_definitions import AGENT_KPIS, register_all_kpis

router = APIRouter(prefix="/hr-pmo", tags=["HR PMO"])


def _get_hr(agent_name: str, tenant_id: str) -> HRPMOManager:
    tier = "boss" if agent_name == "ACHEEVY" else \
           "2ic" if agent_name == "Chicken_Hawk" else \
           "engine" if agent_name == "Hermes" else "boomer_ang"
    return HRPMOManager(agent_name, tier, tenant_id=tenant_id)


def _get_plans(agent_name: str, tenant_id: str) -> ProjectPlanManager:
    tier = "boss" if agent_name == "ACHEEVY" else \
           "2ic" if agent_name == "Chicken_Hawk" else \
           "engine" if agent_name == "Hermes" else "boomer_ang"
    return ProjectPlanManager(agent_name, tier, tenant_id=tenant_id)


# ─── Scorecard ──────────────────────────────────────────────

class ScorecardEntry(BaseModel):
    agent_name: str
    agent_tier: str
    dept: str | None
    score: int
    grade: str
    period: str
    directive: str | None
    last_eval: str


@router.get("/scorecard", response_model=list[ScorecardEntry])
async def org_scorecard(tenant_id: str = Query(default=DEFAULT_TENANT)):
    """Get the latest HR PMO evaluation for every agent in the org."""
    hr = _get_hr("ACHEEVY", tenant_id)
    rows = await hr.get_org_scorecard()
    return [ScorecardEntry(**r) for r in rows]


# ─── Agent Performance ──────────────────────────────────────

class AgentPerformance(BaseModel):
    agent_name: str
    plan_stats: dict
    recent_evaluations: list[dict]
    kpi_names: list[str]


@router.get("/agent/{agent_name}", response_model=AgentPerformance)
async def agent_performance(
    agent_name: str,
    tenant_id: str = Query(default=DEFAULT_TENANT),
):
    """Get comprehensive performance data for a specific agent."""
    plans = _get_plans(agent_name, tenant_id)
    hr = _get_hr(agent_name, tenant_id)

    plan_stats = await plans.get_agent_stats()
    evals = await hr.get_evaluation_history(limit=10)

    kpi_names = [k[0] for k in AGENT_KPIS.get(agent_name, [])]

    return AgentPerformance(
        agent_name=agent_name,
        plan_stats=plan_stats,
        recent_evaluations=evals,
        kpi_names=kpi_names,
    )


# ─── KPI Registration ──────────────────────────────────────

@router.post("/kpis/register")
async def register_kpis(tenant_id: str = Query(default=DEFAULT_TENANT)):
    """Register default KPIs for all agents. Idempotent (upserts)."""
    managers = {}
    for agent_name in AGENT_KPIS:
        managers[agent_name] = _get_hr(agent_name, tenant_id)
    count = await register_all_kpis(managers)
    return {"registered": count, "agents": list(AGENT_KPIS.keys())}


# ─── KPI History ────────────────────────────────────────────

@router.get("/kpis/{agent_name}/{kpi_name}")
async def kpi_history(
    agent_name: str,
    kpi_name: str,
    tenant_id: str = Query(default=DEFAULT_TENANT),
    limit: int = Query(default=20, le=100),
):
    """Get measurement history for a specific agent KPI."""
    hr = _get_hr(agent_name, tenant_id)
    history = await hr.get_kpi_history(kpi_name, limit)
    return {"agent_name": agent_name, "kpi_name": kpi_name, "measurements": history}


# ─── Evaluation History ─────────────────────────────────────

@router.get("/evaluations/{agent_name}")
async def evaluation_history(
    agent_name: str,
    tenant_id: str = Query(default=DEFAULT_TENANT),
    limit: int = Query(default=10, le=50),
):
    """Get HR PMO evaluation history for an agent."""
    hr = _get_hr(agent_name, tenant_id)
    evals = await hr.get_evaluation_history(limit)
    return {"agent_name": agent_name, "evaluations": evals}
