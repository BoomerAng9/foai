"""ACHEEVY Bridge — connects an external AIMS gateway to the ii-agent runtime.

Architecture
------------
POST /bridge/dispatch                → AIMS sends a task; creates session + background run
GET  /bridge/session/{id}/status     → AIMS polls for completion / output
GET  /bridge/tasks                   → Admin list of all registered tasks
GET  /bridge/health                  → Liveness / feature-flag check
POST /bridge/handshake               → Legacy auth handshake (kept for back-compat)

The background runner creates a real agent session using the same service layer
as the WebSocket path, but collects output via a capture event-stream instead
of emitting to a browser socket, then POSTs the result back to the AIMS gateway.
"""

from __future__ import annotations

import logging
import secrets
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from pydantic import BaseModel

from ii_agent.core.config.ii_agent_config import config
from ii_agent.core.event import EventType, RealtimeEvent
from ii_agent.core.event_stream import AsyncEventStream
from ii_agent.db.agent import AgentRunTask, RunStatus
from ii_agent.db.manager import Events, get_db_session_local
from ii_agent.server.models.messages import QueryContentInternal
from ii_agent.server.services.agent_run_service import AgentRunService
from ii_agent.server.services.execution_lane_service import ExecutionLaneService
from ii_agent.server.services.routing_service import resolve_agent_type_for_routing
from ii_agent.server.shared import (
    agent_service,
    sandbox_service,
    session_service,
    storage,
)
from ii_agent.server.socket.chat_session import ChatSessionContext
from ii_agent.utils.workspace_manager import WorkspaceManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bridge", tags=["ACHEEVY Bridge"])

# ─── ACHEEVY Persona Prompt ───────────────────────────────────────────────────

ACHEEVY_BRIDGE_SYSTEM_PROMPT = """You are ACHEEVY — the autonomous AI task agent for the A.I.M.S. (Autonomous Intelligent Management System) platform.

You are dispatched by the AIMS gateway to complete specific tasks on behalf of users. Your personality is:
- Decisive and action-oriented — you ship, you don't just plan
- Clear and direct in your output — structured, scannable results
- Brand-aware — you produce work that fits the A.I.M.S. gold/black/amber aesthetic when generating UI

When you complete a task, close with a concise summary block:
---
ACHEEVY COMPLETE
Task: <original task one-liner>
Output: <brief description of what was produced>
Time: <timestamp>
---
"""

# ─── In-Memory Task Registry ──────────────────────────────────────────────────

@dataclass
class BridgeTask:
    task_id: str
    session_id: str
    task_text: str
    status: str = "queued"              # queued | running | completed | failed
    output: Optional[str] = None
    error: Optional[str] = None
    callback_url: Optional[str] = None
    source: Optional[str] = None
    metadata: dict = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def touch(self) -> None:
        self.updated_at = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "session_id": self.session_id,
            "task_text": self.task_text,
            "status": self.status,
            "output": self.output,
            "error": self.error,
            "callback_url": self.callback_url,
            "source": self.source,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


# task_id → BridgeTask
_BRIDGE_REGISTRY: dict[str, BridgeTask] = {}
# session_id → task_id  (for status polling by session)
_SESSION_TO_TASK: dict[str, str] = {}


# ─── Capture Event Stream ─────────────────────────────────────────────────────

class BridgeCaptureEventStream(AsyncEventStream):
    """AsyncEventStream that silently buffers AGENT_RESPONSE text.

    Used by bridge-dispatched runs so output can be collected and returned
    to the AIMS gateway without needing a socket connection.
    """

    def __init__(self):
        super().__init__(logger=logging.getLogger(__name__ + ".capture"))
        self._captured: list[str] = []

    async def publish(self, event: RealtimeEvent) -> None:
        if event.type == EventType.AGENT_RESPONSE:
            content = event.content or {}
            text = content.get("text") or content.get("message") or ""
            if text:
                self._captured.append(str(text))
        await super().publish(event)

    @property
    def captured_text(self) -> str:
        return "\n".join(self._captured)


# ─── Request / Response Models ────────────────────────────────────────────────

class BridgeDispatchRequest(BaseModel):
    task: str
    source: Optional[str] = "aims-gateway"
    callback_url: Optional[str] = None
    model_id: Optional[str] = None
    agent_type: Optional[str] = "general"
    metadata: Optional[dict[str, Any]] = None


class BridgeDispatchResponse(BaseModel):
    session_id: str
    task_id: str
    status: str
    poll_url: str
    message: str


class BridgeHandshakeRequest(BaseModel):
    source: str | None = None
    metadata: dict[str, Any] | None = None


# ─── Auth Helpers ──────────────────────────────────────────────────────────────

def _require_bridge_enabled() -> None:
    if not config.aims_bridge_enabled:
        raise HTTPException(status_code=409, detail="ACHEEVY bridge is disabled on this server")


def _verify_bridge_key(x_ii_bridge_key: Optional[str]) -> None:
    secret = config.aims_bridge_shared_secret
    if not secret:
        return
    if not x_ii_bridge_key or not secrets.compare_digest(x_ii_bridge_key, secret):
        raise HTTPException(status_code=401, detail="Invalid or missing bridge key")


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/health")
async def bridge_health() -> dict[str, Any]:
    """Liveness check — returns bridge feature-flag state."""
    return {
        "status": "ok",
        "agent": "ACHEEVY-009",
        "bridge_enabled": config.aims_bridge_enabled,
        "aims_gateway_url": config.aims_gateway_url,
        "active_tasks": len(_BRIDGE_REGISTRY),
        "time": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/handshake")
async def bridge_handshake(
    payload: BridgeHandshakeRequest,
    x_ii_bridge_key: str | None = Header(default=None),
) -> dict[str, Any]:
    """Legacy auth handshake — kept for back-compatibility."""
    _require_bridge_enabled()
    _verify_bridge_key(x_ii_bridge_key)
    return {
        "accepted": True,
        "agent": "ACHEEVY-009",
        "source": payload.source,
        "gateway": config.aims_gateway_url,
        "time": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/dispatch", response_model=BridgeDispatchResponse)
async def bridge_dispatch(
    payload: BridgeDispatchRequest,
    background_tasks: BackgroundTasks,
    x_ii_bridge_key: Optional[str] = Header(default=None),
) -> BridgeDispatchResponse:
    """Dispatch a task from AIMS to ACHEEVY.

    AIMS sends a signed task payload; this endpoint:
    1. Validates the bridge key
    2. Generates session + task IDs
    3. Registers the task in the in-memory registry
    4. Kicks off the background agent run (non-blocking)
    5. Returns IDs for AIMS to poll status
    """
    _require_bridge_enabled()
    _verify_bridge_key(x_ii_bridge_key)

    task_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())

    bridge_task = BridgeTask(
        task_id=task_id,
        session_id=session_id,
        task_text=payload.task,
        callback_url=payload.callback_url or config.aims_gateway_url,
        source=payload.source,
        metadata=payload.metadata or {},
    )
    _BRIDGE_REGISTRY[task_id] = bridge_task
    _SESSION_TO_TASK[session_id] = task_id

    logger.info(
        "[ACHEEVY Bridge] Dispatched task=%s source=%r task=%r",
        task_id, payload.source, payload.task[:80],
    )

    background_tasks.add_task(
        _execute_bridge_task,
        task_id=task_id,
        model_id=payload.model_id,
        agent_type_str=payload.agent_type or "general",
    )

    return BridgeDispatchResponse(
        session_id=session_id,
        task_id=task_id,
        status="queued",
        poll_url=f"/bridge/session/{session_id}/status",
        message="Task queued. ACHEEVY is on it.",
    )


@router.get("/session/{session_id}/status")
async def bridge_session_status(
    session_id: str,
    x_ii_bridge_key: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """Poll the status of a bridge-dispatched agent session."""
    _require_bridge_enabled()
    _verify_bridge_key(x_ii_bridge_key)

    task_id = _SESSION_TO_TASK.get(session_id)
    if not task_id:
        raise HTTPException(status_code=404, detail=f"No bridge task for session {session_id!r}")

    task = _BRIDGE_REGISTRY.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Bridge task {task_id!r} not found")

    return task.to_dict()


@router.get("/tasks")
async def bridge_list_tasks(
    x_ii_bridge_key: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """Admin view: list all registered bridge tasks."""
    _require_bridge_enabled()
    _verify_bridge_key(x_ii_bridge_key)
    tasks = [t.to_dict() for t in _BRIDGE_REGISTRY.values()]
    return {"tasks": tasks, "count": len(tasks)}


# ─── Background Task Executor ──────────────────────────────────────────────────

async def _execute_bridge_task(
    task_id: str,
    model_id: Optional[str] = None,
    agent_type_str: str = "general",
) -> None:
    """Run an agent task on behalf of an AIMS bridge dispatch.

    Steps:
      1. Create DB session with bridge bot user
      2. Resolve LLM config
      3. Provision sandbox
      4. Build workspace manager + capture event stream
      5. Create AgentRunTask DB record
      6. Create AgentController via agent_service
      7. Build ChatSessionContext and run arun()
      8. Collect output, update registry status
      9. POST callback to AIMS gateway
    """
    task = _BRIDGE_REGISTRY.get(task_id)
    if not task:
        logger.error("[ACHEEVY Bridge] Task %s not found in registry", task_id)
        return

    task.status = "running"
    task.touch()

    bot_user_id: str = getattr(config, "aims_bridge_bot_user_id", None) or "aims-bridge-bot"
    session_uuid = uuid.UUID(task.session_id)

    try:
        # 1. Create session
        session_info = await session_service.create_new_session(session_uuid, bot_user_id)
        logger.info("[ACHEEVY Bridge] Session created: %s for task %s", session_info.id, task_id)

        # 2. LLM config
        llm_config = _resolve_llm_config(model_id)
        if not llm_config:
            raise ValueError("No LLM config available. Configure llm_configs in ii-agent settings.")

        # 3. Sandbox
        sandbox = await sandbox_service.get_sandbox_by_session(session_uuid)
        logger.info("[ACHEEVY Bridge] Sandbox ready for session %s", session_info.id)

        # 4. Workspace manager
        workspace_path = Path(config.workspace_path).resolve()
        workspace_manager = WorkspaceManager(
            root=workspace_path,
            container_workspace=config.use_container_workspace,
        )

        # 5. Capture stream
        capture_stream = BridgeCaptureEventStream()

        # 6. DB records
        async with get_db_session_local() as db:
            user_event_obj = await Events.save_event_db_session(
                db=db,
                session_id=str(session_uuid),
                event=RealtimeEvent(
                    session_id=str(session_uuid),
                    type=EventType.USER_MESSAGE,
                    content={"text": task.task_text, "files": []},
                ),
            )
            agent_run_task = await AgentRunTask.create(
                db=db,
                session_id=str(session_uuid),
                user_message_id=user_event_obj.id,
                routing_decision=(
                    session_info.settings.get("routing_decision")
                    if isinstance(session_info.settings, dict)
                    else None
                ),
            )
            await db.commit()

        # 7. Agent type
        try:
            from ii_agent.config.agent_types import AgentType
            resolved_agent_type = resolve_agent_type_for_routing(
                requested_agent_type=agent_type_str,
                routing_decision=AgentRunService.get_routing_decision(agent_run_task),
                user_text=task.task_text,
            )
        except Exception:
            from ii_agent.config.agent_types import AgentType
            resolved_agent_type = AgentType.GENERAL

        # 8. Agent controller
        lane_plan = ExecutionLaneService.build_plan(
            AgentRunService.get_routing_decision(agent_run_task)
        )
        if not lane_plan.runtime_execution_allowed:
            async with get_db_session_local() as db:
                await AgentRunService.update_task_status(
                    db=db,
                    task_id=agent_run_task.id,
                    status=RunStatus.FAILED,
                )
                await db.commit()

            task.status = "failed"
            task.error = (
                lane_plan.policy_reason
                or "Requested execution lane is not supported by the runtime."
            )
            task.touch()
            logger.error(
                "[ACHEEVY Bridge] run %s blocked: requested lane=%s reason=%s",
                agent_run_task.id,
                lane_plan.requested_execution_lane,
                task.error,
            )
            return

        runtime_metadata = AgentRunService.build_runtime_metadata(
            task=agent_run_task,
            base_metadata=task.metadata,
        )
        runtime_metadata["resolved_agent_type"] = resolved_agent_type.value
        if lane_plan.fallback_reason:
            logger.info(
                "[ACHEEVY Bridge] run %s requested lane=%s; %s",
                agent_run_task.id,
                lane_plan.requested_execution_lane,
                lane_plan.fallback_reason,
            )
        agent_controller = await agent_service.create_agent(
            llm_config=llm_config,
            sandbox=sandbox,
            workspace_manager=workspace_manager,
            event_stream=capture_stream,
            agent_task=agent_run_task,
            system_prompt=ACHEEVY_BRIDGE_SYSTEM_PROMPT,
            agent_type=resolved_agent_type,
            metadata=runtime_metadata,
        )

        # 9. ChatSessionContext + run
        chat_ctx = ChatSessionContext(
            workspace_manager=workspace_manager,
            file_store=storage,
            config=config,
            session_info=session_info,
            llm_config=llm_config,
            agent_controller=agent_controller,
            event_stream=capture_stream,
            sandbox=sandbox,
        )

        query_content = QueryContentInternal(
            text=task.task_text,
            resume=False,
            file_upload_paths=[],
            images_data=[],
        )

        logger.info("[ACHEEVY Bridge] Running agent for task %s ...", task_id)
        result = await chat_ctx.arun(query_content=query_content)

        # 10. Collect output and update status
        captured = capture_stream.captured_text
        is_error = getattr(result, "is_error", False)
        run_status = RunStatus.FAILED if is_error else RunStatus.COMPLETED

        async with get_db_session_local() as db:
            await AgentRunService.update_task_status(db=db, task_id=agent_run_task.id, status=run_status)
            await db.commit()

        task.status = "failed" if is_error else "completed"
        task.output = captured or _extract_llm_text(result)
        task.touch()

        logger.info(
            "[ACHEEVY Bridge] Task %s done: status=%s output_chars=%d",
            task_id, task.status, len(task.output or ""),
        )

    except Exception as exc:
        logger.exception("[ACHEEVY Bridge] Task %s raised: %s", task_id, exc)
        task.status = "failed"
        task.error = str(exc)
        task.touch()

    finally:
        await _send_aims_callback(task)


def _resolve_llm_config(model_id: Optional[str] = None):
    """Return an LLMConfig for bridge tasks (first configured if no match)."""
    if not config.llm_configs:
        return None
    if model_id and model_id in config.llm_configs:
        return config.llm_configs[model_id]
    return next(iter(config.llm_configs.values()))


def _extract_llm_text(result: Any) -> str:
    """Extract plain text from a ToolResult returned by arun()."""
    if not result or not getattr(result, "llm_content", None):
        return ""
    parts: list[str] = []
    for block in result.llm_content:
        if hasattr(block, "text"):
            parts.append(block.text)
        elif isinstance(block, dict) and "text" in block:
            parts.append(block["text"])
    return "\n".join(parts)


async def _send_aims_callback(task: BridgeTask) -> None:
    """POST the completed task result back to the AIMS gateway."""
    callback_url = task.callback_url
    if not callback_url:
        logger.debug("[ACHEEVY Bridge] No callback URL for task %s, skipping.", task.task_id)
        return

    if not callback_url.startswith("http"):
        base = (config.aims_gateway_url or "").rstrip("/")
        callback_url = f"{base}{callback_url}"

    payload: dict[str, Any] = {
        "task_id": task.task_id,
        "session_id": task.session_id,
        "source": task.source,
        "status": task.status,
        "output": task.output,
        "error": task.error,
        "metadata": task.metadata,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "agent": "ACHEEVY-009",
    }

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if config.aims_bridge_shared_secret:
        headers["X-II-BRIDGE-KEY"] = config.aims_bridge_shared_secret

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(callback_url, json=payload, headers=headers)
            resp.raise_for_status()
            logger.info("[ACHEEVY Bridge] Callback → %s  status=%d", callback_url, resp.status_code)
    except Exception as exc:
        logger.error("[ACHEEVY Bridge] Callback failed → %s: %s", callback_url, exc)
