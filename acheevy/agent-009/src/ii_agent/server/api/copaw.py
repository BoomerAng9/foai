"""CoPaw sidecar adapter endpoints.

This module provides a thin compatibility layer so CoPaw channel events can be
routed into the existing ACHEEVY bridge flow without changing core orchestration.
"""

from __future__ import annotations

import os
import secrets
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from pydantic import BaseModel, Field

from ii_agent.core.config.ii_agent_config import config
from ii_agent.server.api.bridge import (
    BridgeDispatchRequest,
    bridge_dispatch,
    bridge_session_status,
)

router = APIRouter(prefix="/copaw", tags=["CoPaw Adapter"])


class CoPawDispatchRequest(BaseModel):
    """Inbound payload from CoPaw channel adapters."""

    channel: str = Field(..., description="Origin channel (discord/feishu/etc)")
    user_id: str = Field(..., description="CoPaw-side user identifier")
    message: str = Field(..., description="User message content")
    thread_id: Optional[str] = Field(None, description="Channel thread/conversation id")
    model_id: Optional[str] = Field(None, description="Optional model override")
    metadata: dict[str, Any] = Field(default_factory=dict)


class CoPawDispatchResponse(BaseModel):
    """Normalized dispatch response for CoPaw sidecar callers."""

    task_id: str
    session_id: str
    status: str
    poll_url: str
    message: str


def _verify_copaw_key(x_copaw_key: Optional[str]) -> None:
    """Verify CoPaw adapter key if configured.

    Prefers COPAW_SHARED_SECRET and falls back to AIMS bridge secret for a
    single-secret deployment.
    """

    shared_secret = os.getenv("COPAW_SHARED_SECRET") or config.aims_bridge_shared_secret
    if not shared_secret:
        return

    if not x_copaw_key or not secrets.compare_digest(x_copaw_key, shared_secret):
        raise HTTPException(status_code=401, detail="Invalid or missing CoPaw adapter key")


@router.post("/dispatch", response_model=CoPawDispatchResponse)
async def copaw_dispatch(
    payload: CoPawDispatchRequest,
    background_tasks: BackgroundTasks,
    x_copaw_key: Optional[str] = Header(default=None),
) -> CoPawDispatchResponse:
    """Dispatch a CoPaw channel message into ACHEEVY bridge execution."""

    _verify_copaw_key(x_copaw_key)

    bridge_payload = BridgeDispatchRequest(
        task=payload.message,
        source=f"copaw:{payload.channel}",
        model_id=payload.model_id,
        metadata={
            "copaw": {
                "channel": payload.channel,
                "user_id": payload.user_id,
                "thread_id": payload.thread_id,
            },
            **(payload.metadata or {}),
        },
    )

    bridge_secret = config.aims_bridge_shared_secret
    bridge_response = await bridge_dispatch(
        payload=bridge_payload,
        background_tasks=background_tasks,
        x_ii_bridge_key=bridge_secret,
    )

    return CoPawDispatchResponse(
        task_id=bridge_response.task_id,
        session_id=bridge_response.session_id,
        status=bridge_response.status,
        poll_url=bridge_response.poll_url,
        message=bridge_response.message,
    )


@router.get("/session/{session_id}/status")
async def copaw_session_status(
    session_id: str,
    x_copaw_key: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """Proxy bridge session status for CoPaw sidecar polling."""

    _verify_copaw_key(x_copaw_key)

    bridge_secret = config.aims_bridge_shared_secret
    return await bridge_session_status(
        session_id=session_id,
        x_ii_bridge_key=bridge_secret,
    )
