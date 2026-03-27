"""Evaluation routes — trigger and query Deep Think cycles."""

from fastapi import APIRouter, Query
from pydantic import BaseModel

from config import DEFAULT_TENANT
from deep_think import run_evaluation

router = APIRouter(prefix="/evaluate", tags=["Deep Think"])


class EvaluationResult(BaseModel):
    evaluation_id: str
    ecosystem_score: int | None
    agents_evaluated: int
    directives_posted: int
    tenant_id: str
    timestamp: str


@router.post("/trigger", response_model=EvaluationResult, status_code=200)
async def trigger_evaluation(
    tenant_id: str = Query(default=DEFAULT_TENANT),
):
    """Manually trigger a Deep Think evaluation cycle."""
    result = await run_evaluation(tenant_id)
    return EvaluationResult(**result)
