"""Trend routes — historical performance tracking over time."""

from fastapi import APIRouter, Query
from google.cloud import firestore
from pydantic import BaseModel

from config import DEFAULT_TENANT, GCP_PROJECT

router = APIRouter(prefix="/trends", tags=["Trends"])


class TrendPoint(BaseModel):
    ecosystem_score: int | None
    agent_scores: dict[str, int]
    eval_type: str
    models_used: int
    timestamp: str


class TrendSummary(BaseModel):
    tenant_id: str
    data_points: int
    trends: list[TrendPoint]
    score_direction: str
    avg_ecosystem_score: float | None


@router.get("/", response_model=TrendSummary)
async def get_trends(
    tenant_id: str = Query(default=DEFAULT_TENANT),
    limit: int = Query(default=30, le=100),
    eval_type: str | None = Query(default=None),
):
    """Return trend data for ecosystem and agent scores over time."""
    db = firestore.Client(project=GCP_PROJECT)
    query = (
        db.collection("hermes")
        .document(tenant_id)
        .collection("trends")
        .order_by("timestamp", direction=firestore.Query.DESCENDING)
        .limit(limit)
    )

    if eval_type:
        query = query.where(filter=firestore.FieldFilter("eval_type", "==", eval_type))

    docs = query.stream()

    points = []
    for doc in docs:
        data = doc.to_dict()
        points.append(TrendPoint(
            ecosystem_score=data.get("ecosystem_score"),
            agent_scores=data.get("agent_scores", {}),
            eval_type=data.get("eval_type", "unknown"),
            models_used=data.get("models_used", 1),
            timestamp=data.get("timestamp", ""),
        ))

    # Determine score direction from oldest to newest
    scores = [p.ecosystem_score for p in reversed(points) if p.ecosystem_score is not None]
    if len(scores) >= 2:
        if scores[-1] > scores[0]:
            direction = "improving"
        elif scores[-1] < scores[0]:
            direction = "declining"
        else:
            direction = "stable"
    else:
        direction = "insufficient_data"

    avg_score = sum(scores) / len(scores) if scores else None

    return TrendSummary(
        tenant_id=tenant_id,
        data_points=len(points),
        trends=points,
        score_direction=direction,
        avg_ecosystem_score=round(avg_score, 1) if avg_score is not None else None,
    )
