"""Agent Status Writer API.

Any agent writes its status to Firestore: agents/{tenant_id}/{agent_name}
"""

from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from config import DEFAULT_TENANT
from firestore_client import get_db

router = APIRouter(prefix="/agent", tags=["Agent Status"])


# ── Models ──────────────────────────────────────────────────────────

class AgentStatus(BaseModel):
    name: str
    status: str
    current_task: str
    tenant_id: str = DEFAULT_TENANT


class AgentStatusResponse(BaseModel):
    name: str
    status: str
    current_task: str
    tenant_id: str
    last_updated: str


# ── Routes ──────────────────────────────────────────────────────────

@router.post("/status", response_model=AgentStatusResponse, status_code=200)
async def write_agent_status(agent: AgentStatus):
    """Write agent status to Firestore: agents/{tenant_id}/{agent_name}."""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()

    doc_ref = (
        db.collection("agents")
        .document(agent.tenant_id)
        .collection(agent.name)
        .document("status")
    )

    doc_data = {
        "name": agent.name,
        "status": agent.status,
        "currentTask": agent.current_task,
        "lastUpdated": now,
    }

    doc_ref.set(doc_data)

    return AgentStatusResponse(
        name=agent.name,
        status=agent.status,
        current_task=agent.current_task,
        tenant_id=agent.tenant_id,
        last_updated=now,
    )
