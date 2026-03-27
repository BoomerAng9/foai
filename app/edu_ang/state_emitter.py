"""Live Look In State Emitter — WebSocket event SDK for Boomer_Angs.

Emits structured events to the Live Look In State Engine:
  agent.online, task.assigned, task.started, task.progress,
  task.completed, agent.break
"""

import asyncio
import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone

import websockets

STATE_ENGINE_WS = os.getenv(
    "STATE_ENGINE_WS",
    "wss://live-look-in-state-939270059361.us-central1.run.app/ws",
)

logger = logging.getLogger("state_emitter")

_ws = None
_ws_lock = asyncio.Lock()


async def _get_ws():
    """Get or create a persistent WebSocket connection."""
    global _ws
    async with _ws_lock:
        if _ws is None or _ws.closed:
            try:
                _ws = await websockets.connect(STATE_ENGINE_WS, close_timeout=5)
            except Exception:
                logger.warning("Could not connect to State Engine WS")
                _ws = None
        return _ws


async def emit(event_type: str, agent_name: str, dept: str, payload: dict):
    """Send a structured event to the State Engine."""
    message = {
        "event": event_type,
        "agent": agent_name,
        "dept": dept,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    try:
        ws = await _get_ws()
        if ws:
            await ws.send(json.dumps(message))
    except Exception:
        logger.warning("Failed to emit %s for %s", event_type, agent_name)
        # Reset connection on failure
        global _ws
        _ws = None


async def agent_online(agent_name: str, dept: str, specialty: str):
    await emit("agent.online", agent_name, dept, {
        "specialty": specialty,
    })


async def task_assigned(agent_name: str, dept: str, title: str, complexity: str = "medium"):
    task_id = str(uuid.uuid4())[:8]
    await emit("task.assigned", agent_name, dept, {
        "task_id": task_id,
        "title": title,
        "complexity": complexity,
    })
    return task_id


async def task_started(agent_name: str, dept: str, task_id: str, pcp: dict):
    await emit("task.started", agent_name, dept, {
        "task_id": task_id,
        "pcp": pcp,
    })


async def task_progress(agent_name: str, dept: str, task_id: str, progress: int, step: str):
    await emit("task.progress", agent_name, dept, {
        "task_id": task_id,
        "progress": min(max(progress, 0), 100),
        "step_description": step,
    })


async def task_completed(agent_name: str, dept: str, task_id: str, score: int, grade: str, duration_ms: int):
    await emit("task.completed", agent_name, dept, {
        "task_id": task_id,
        "score": score,
        "grade": grade,
        "duration_ms": duration_ms,
    })


async def agent_break(agent_name: str, dept: str, last_task_id: str | None = None):
    await emit("agent.break", agent_name, dept, {
        "last_task_id": last_task_id,
    })


async def close():
    """Cleanly close the WebSocket connection."""
    global _ws
    if _ws and not _ws.closed:
        await _ws.close()
    _ws = None
