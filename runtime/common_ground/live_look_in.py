"""
Live Look In — SSE endpoint adapter for agent activity visualization.

Subscribes to the CommonGround observer and formats events as Server-Sent Events
for consumption by React frontend components (stylized 2D/3D character rendering).

This is NOT pixel screen capture — it provides structured agent activity events.
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any, AsyncGenerator, Dict, Optional

from .observer import Observation, ObserverStore, get_observer


def format_sse(observation: Observation, event_type: str = "agent_activity") -> str:
    """Format an Observation as a Server-Sent Event string.

    Args:
        observation: The agent observation to format.
        event_type: SSE event type field.

    Returns:
        SSE-formatted string ready for HTTP streaming.
    """
    data = {
        "id": observation.id,
        "agent": observation.agent_name,
        "action": observation.action,
        "timestamp": observation.iso_time,
        "summary": observation.summary,
        "payload": observation.payload,
    }
    lines = [
        f"event: {event_type}",
        f"id: {observation.id}",
        f"data: {json.dumps(data)}",
        "",  # blank line terminates the event
    ]
    return "\n".join(lines) + "\n"


async def sse_stream(
    store: Optional[ObserverStore] = None,
    agent_filter: Optional[str] = None,
    heartbeat_interval: float = 15.0,
) -> AsyncGenerator[str, None]:
    """Async generator that yields SSE-formatted agent activity events.

    Usage with FastAPI/Starlette:
        from starlette.responses import StreamingResponse
        return StreamingResponse(
            sse_stream(),
            media_type="text/event-stream",
        )

    Args:
        store: ObserverStore to subscribe to (uses global default if None).
        agent_filter: If set, only emit events for this agent.
        heartbeat_interval: Seconds between heartbeat comments.

    Yields:
        SSE-formatted strings.
    """
    obs_store = store or get_observer()
    queue: asyncio.Queue[Observation] = asyncio.Queue()

    async def _enqueue(obs: Observation) -> None:
        await queue.put(obs)

    sub_id = obs_store.subscribe(_enqueue)

    try:
        # Send initial connection event
        yield _connection_event()

        last_heartbeat = time.time()

        while True:
            try:
                obs = await asyncio.wait_for(queue.get(), timeout=heartbeat_interval)
                if agent_filter and obs.agent_name != agent_filter:
                    continue
                yield format_sse(obs)
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                now = time.time()
                if now - last_heartbeat >= heartbeat_interval:
                    yield f": heartbeat {int(now)}\n\n"
                    last_heartbeat = now
    except (asyncio.CancelledError, GeneratorExit):
        pass
    finally:
        obs_store.unsubscribe(sub_id)


def _connection_event() -> str:
    """SSE event sent when client first connects."""
    data = {
        "status": "connected",
        "timestamp": time.time(),
        "message": "Live Look In stream active",
    }
    return f"event: connection\ndata: {json.dumps(data)}\n\n"


# -------------------------------------------------------------------
# Convenience: replay recent history then stream live
# -------------------------------------------------------------------

async def sse_stream_with_history(
    store: Optional[ObserverStore] = None,
    agent_filter: Optional[str] = None,
    history_limit: int = 50,
    heartbeat_interval: float = 15.0,
) -> AsyncGenerator[str, None]:
    """Like sse_stream but first replays recent observations.

    Useful when a client reconnects and wants to catch up.
    Subscribes BEFORE replaying history to avoid missing events.
    """
    obs_store = store or get_observer()
    queue: asyncio.Queue[Observation] = asyncio.Queue()

    async def _enqueue(obs: Observation) -> None:
        await queue.put(obs)

    sub_id = obs_store.subscribe(_enqueue)

    try:
        yield _connection_event()

        # Replay history
        history = obs_store.get_observations(agent_filter=agent_filter, limit=history_limit)
        for obs in reversed(history):  # oldest first
            yield format_sse(obs, event_type="agent_activity_replay")

        # Stream live events
        last_heartbeat = time.time()
        while True:
            try:
                obs = await asyncio.wait_for(queue.get(), timeout=heartbeat_interval)
                if agent_filter and obs.agent_name != agent_filter:
                    continue
                yield format_sse(obs)
            except asyncio.TimeoutError:
                now = time.time()
                if now - last_heartbeat >= heartbeat_interval:
                    yield f": heartbeat {int(now)}\n\n"
                    last_heartbeat = now
    except (asyncio.CancelledError, GeneratorExit):
        pass
    finally:
        obs_store.unsubscribe(sub_id)
