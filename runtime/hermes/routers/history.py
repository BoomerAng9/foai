"""Evaluation history routes — query past Deep Think results."""

from fastapi import APIRouter, HTTPException, Query
from google.cloud import firestore
from pydantic import BaseModel

from config import DEFAULT_TENANT, GCP_PROJECT

router = APIRouter(prefix="/history", tags=["Evaluation History"])


class EvaluationSummary(BaseModel):
    evaluation_id: str
    ecosystem_score: int | None
    created_at: str
    agents_evaluated: int


@router.get("/recent", response_model=list[EvaluationSummary])
async def recent_evaluations(
    tenant_id: str = Query(default=DEFAULT_TENANT),
    limit: int = Query(default=10, le=50),
):
    """Return the most recent Deep Think evaluations."""
    db = firestore.Client(project=GCP_PROJECT)
    docs = (
        db.collection("hermes")
        .document(tenant_id)
        .collection("evaluations")
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )

    results = []
    for doc in docs:
        data = doc.to_dict()
        ev = data.get("evaluation", {})
        results.append(
            EvaluationSummary(
                evaluation_id=doc.id,
                ecosystem_score=ev.get("ecosystem_score"),
                created_at=data.get("created_at", ""),
                agents_evaluated=len(ev.get("evaluations", [])),
            )
        )
    return results


@router.get("/{evaluation_id}")
async def get_evaluation(
    evaluation_id: str,
    tenant_id: str = Query(default=DEFAULT_TENANT),
):
    """Return full details of a specific evaluation."""
    db = firestore.Client(project=GCP_PROJECT)
    doc = (
        db.collection("hermes")
        .document(tenant_id)
        .collection("evaluations")
        .document(evaluation_id)
        .get()
    )
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return doc.to_dict()
