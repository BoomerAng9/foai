"""POST /check — verdict on a proposed action."""
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from policy import evaluate
from storage import append_event

router = APIRouter()


class CheckRequest(BaseModel):
    action_type: str
    risk_tags: list[str] = Field(default_factory=list)
    approval_id: Optional[str] = None
    actor: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class CheckResponse(BaseModel):
    check_id: str
    verdict: str
    reason: str
    basis: str
    decided_at: str


@router.post("/check", response_model=CheckResponse)
async def check(req: CheckRequest) -> CheckResponse:
    result = evaluate(
        action_type=req.action_type,
        risk_tags=req.risk_tags,
        approval_id=req.approval_id,
        actor=req.actor,
        metadata=req.metadata,
    )
    response = CheckResponse(
        check_id=f"chk_{uuid.uuid4().hex[:16]}",
        verdict=result["verdict"],
        reason=result["reason"],
        basis=result["basis"],
        decided_at=datetime.now(timezone.utc).isoformat(),
    )

    if response.verdict == "deny":
        append_event({
            "event_id": f"risk_{uuid.uuid4().hex[:16]}",
            "severity": "high",
            "category": "blocked_action_attempt",
            "description": f"NemoClaw denied '{req.action_type}': {response.reason}",
            "task_id": req.metadata.get("task_id"),
            "actor": req.actor,
            "metadata": {
                "action_type": req.action_type,
                "risk_tags": req.risk_tags,
                "check_id": response.check_id,
            },
            "recorded_at": response.decided_at,
        })

    return response
