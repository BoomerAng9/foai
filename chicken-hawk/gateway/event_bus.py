"""
Chicken Hawk — In-memory event bus for Live Task Plan SSE streaming.

Uses asyncio queues to fan-out task plan events to all connected SSE clients.
No Redis dependency — suitable for single-node VPS deployment.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, AsyncIterator


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class TaskEvent:
    """A single task plan event emitted by the orchestrator."""

    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    trace_id: str = ""
    task_name: str = ""
    status: TaskStatus = TaskStatus.PENDING
    hawk: str = ""
    detail: str = ""
    timestamp: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_sse(self) -> str:
        """Format as an SSE data line."""
        import json

        payload = asdict(self)
        payload["status"] = self.status.value
        return f"data: {json.dumps(payload)}\n\n"


class EventBus:
    """In-memory fan-out event bus for SSE streaming."""

    def __init__(self) -> None:
        self._subscribers: list[asyncio.Queue[TaskEvent | None]] = []
        self._lock = asyncio.Lock()
        self._recent: list[TaskEvent] = []  # Last 50 events for replay
        self._max_recent = 50

    async def publish(self, event: TaskEvent) -> None:
        """Publish an event to all connected subscribers."""
        async with self._lock:
            self._recent.append(event)
            if len(self._recent) > self._max_recent:
                self._recent = self._recent[-self._max_recent:]
            for q in self._subscribers:
                try:
                    q.put_nowait(event)
                except asyncio.QueueFull:
                    pass  # Drop if subscriber is slow

    async def subscribe(self) -> AsyncIterator[TaskEvent]:
        """Subscribe to the event stream. Yields events as they arrive."""
        q: asyncio.Queue[TaskEvent | None] = asyncio.Queue(maxsize=256)
        async with self._lock:
            self._subscribers.append(q)
            # Replay recent events
            for evt in self._recent:
                q.put_nowait(evt)
        try:
            while True:
                event = await q.get()
                if event is None:
                    break
                yield event
        finally:
            async with self._lock:
                self._subscribers.remove(q)

    async def close(self) -> None:
        """Signal all subscribers to disconnect."""
        async with self._lock:
            for q in self._subscribers:
                try:
                    q.put_nowait(None)
                except asyncio.QueueFull:
                    pass


# Singleton event bus
_bus: EventBus | None = None


def get_event_bus() -> EventBus:
    global _bus
    if _bus is None:
        _bus = EventBus()
    return _bus
