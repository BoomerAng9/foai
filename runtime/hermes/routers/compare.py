"""Compare routes — diff two evaluations side by side."""

from fastapi import APIRouter, HTTPException, Query
from google.cloud import firestore
from pydantic import BaseModel

from config import DEFAULT_TENANT, GCP_PROJECT

router = APIRouter(prefix="/compare", tags=["Compare"])


class AgentDiff(BaseModel):
    agent_name: str
    score_a: int | None
    score_b: int | None
    score_delta: int | None
    directive_a: str
    directive_b: str


class ComparisonResult(BaseModel):
    evaluation_id_a: str
    evaluation_id_b: str
    ecosystem_score_a: int | None
    ecosystem_score_b: int | None
    ecosystem_delta: int | None
    agent_diffs: list[AgentDiff]
    summary: str


def _fetch_eval(db: firestore.Client, tenant_id: str, eval_id: str) -> dict:
    doc = (
        db.collection("hermes")
        .document(tenant_id)
        .collection("evaluations")
        .document(eval_id)
        .get()
    )
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Evaluation {eval_id} not found")
    return doc.to_dict()


@router.get("/", response_model=ComparisonResult)
async def compare_evaluations(
    eval_a: str = Query(..., description="First evaluation ID (older)"),
    eval_b: str = Query(..., description="Second evaluation ID (newer)"),
    tenant_id: str = Query(default=DEFAULT_TENANT),
):
    """Compare two evaluations and return per-agent score deltas."""
    db = firestore.Client(project=GCP_PROJECT)
    data_a = _fetch_eval(db, tenant_id, eval_a)
    data_b = _fetch_eval(db, tenant_id, eval_b)

    ev_a = data_a.get("evaluation", {})
    ev_b = data_b.get("evaluation", {})

    score_a = ev_a.get("ecosystem_score")
    score_b = ev_b.get("ecosystem_score")
    eco_delta = (score_b - score_a) if score_a is not None and score_b is not None else None

    # Build agent lookup maps
    agents_a = {e["agent_name"]: e for e in ev_a.get("evaluations", [])}
    agents_b = {e["agent_name"]: e for e in ev_b.get("evaluations", [])}
    all_agents = sorted(set(agents_a.keys()) | set(agents_b.keys()))

    diffs = []
    for name in all_agents:
        a = agents_a.get(name, {})
        b = agents_b.get(name, {})
        sa = a.get("score")
        sb = b.get("score")
        delta = (sb - sa) if sa is not None and sb is not None else None
        diffs.append(AgentDiff(
            agent_name=name,
            score_a=sa,
            score_b=sb,
            score_delta=delta,
            directive_a=a.get("directive", "—"),
            directive_b=b.get("directive", "—"),
        ))

    if eco_delta is not None and eco_delta > 0:
        summary = f"Ecosystem improved by {eco_delta} points."
    elif eco_delta is not None and eco_delta < 0:
        summary = f"Ecosystem declined by {abs(eco_delta)} points."
    elif eco_delta == 0:
        summary = "Ecosystem score unchanged."
    else:
        summary = "Unable to compute delta — missing scores."

    return ComparisonResult(
        evaluation_id_a=eval_a,
        evaluation_id_b=eval_b,
        ecosystem_score_a=score_a,
        ecosystem_score_b=score_b,
        ecosystem_delta=eco_delta,
        agent_diffs=diffs,
        summary=summary,
    )
