"""POST /risk-event and GET /risk-events — risk event ledger."""
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from storage import append_event, list_events

router = APIRouter()

_VALID_SEVERITY = {"low", "medium", "high", "critical"}


class RiskEventCreate(BaseModel):
    severity: str
    category: str
    description: str
    task_id: Optional[str] = None
    actor: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RiskEvent(BaseModel):
    event_id: str
    severity: str
    category: str
    description: str
    task_id: Optional[str] = None
    actor: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    recorded_at: str


@router.post("/risk-event", response_model=RiskEvent)
async def create_risk_event(req: RiskEventCreate) -> RiskEvent:
    if req.severity not in _VALID_SEVERITY:
        raise HTTPException(status_code=400, detail=f"severity must be one of {sorted(_VALID_SEVERITY)}")
    event = RiskEvent(
        event_id=f"risk_{uuid.uuid4().hex[:16]}",
        severity=req.severity,
        category=req.category,
        description=req.description,
        task_id=req.task_id,
        actor=req.actor,
        metadata=req.metadata,
        recorded_at=datetime.now(timezone.utc).isoformat(),
    )
    append_event(event.model_dump())
    return event


@router.get("/risk-events", response_model=list[RiskEvent])
async def get_risk_events(
    limit: int = Query(default=100, le=1000),
    severity: Optional[str] = Query(default=None),
) -> list[RiskEvent]:
    events = list_events(limit=limit, severity=severity)
    return [RiskEvent(**e) for e in events]
