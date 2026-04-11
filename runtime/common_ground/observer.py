"""
CommonGround Observer — Agent observation protocol and event bus.

Provides the backend event bus for Live Look In. Records agent actions,
supports queries, and pushes real-time subscriptions.

Based on observation protocol concepts from Intelligent-Internet/CommonGround (Apache 2.0).
"""

from __future__ import annotations

import asyncio
import threading
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Sequence


@dataclass(frozen=True)
class Observation:
    """A single recorded agent action."""

    id: str
    agent_name: str
    action: str
    payload: Dict[str, Any]
    timestamp: float
    iso_time: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @property
    def summary(self) -> str:
        """One-line summary for SSE streaming."""
        detail = self.payload.get("summary", self.payload.get("detail", ""))
        if detail:
            return f"[{self.agent_name}] {self.action}: {detail}"
        return f"[{self.agent_name}] {self.action}"


class ObserverStore:
    """Thread-safe in-memory store for agent observations.

    Designed for single-process use. For distributed deployments,
    swap with a NATS/Redis-backed store.
    """

    def __init__(self, max_size: int = 10_000) -> None:
        self._observations: List[Observation] = []
        self._lock = threading.Lock()
        self._max_size = max_size
        self._subscribers: Dict[str, Callable[[Observation], Any]] = {}
        self._async_subscribers: Dict[str, Callable[[Observation], Any]] = {}

    # -------------------------------------------------------------------
    # Core API
    # -------------------------------------------------------------------

    def observe(
        self,
        agent_name: str,
        action: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Observation:
        """Record an agent action and notify subscribers.

        Args:
            agent_name: Name of the agent (e.g. 'ACHEEVY', 'Chicken_Hawk').
            action: Action type (e.g. 'task_start', 'search', 'delegate').
            payload: Arbitrary metadata about the action.

        Returns:
            The recorded Observation.
        """
        now = time.time()
        obs = Observation(
            id=uuid.uuid4().hex[:12],
            agent_name=agent_name,
            action=action,
            payload=payload or {},
            timestamp=now,
            iso_time=datetime.fromtimestamp(now, tz=timezone.utc).isoformat(),
        )

        with self._lock:
            self._observations.append(obs)
            # Trim if over max
            if len(self._observations) > self._max_size:
                self._observations = self._observations[-self._max_size:]

        # Fire sync subscribers
        for cb in list(self._subscribers.values()):
            try:
                cb(obs)
            except Exception:
                pass

        # Fire async subscribers (best-effort, non-blocking)
        for cb in list(self._async_subscribers.values()):
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(cb(obs))
            except RuntimeError:
                pass

        return obs

    def get_observations(
        self,
        since: Optional[float] = None,
        agent_filter: Optional[str] = None,
        limit: int = 100,
    ) -> List[Observation]:
        """Retrieve recent observations.

        Args:
            since: Unix timestamp — only return observations after this time.
            agent_filter: If set, only return observations from this agent.
            limit: Maximum number of observations to return.

        Returns:
            List of Observation objects, newest first.
        """
        with self._lock:
            results = list(self._observations)

        if since is not None:
            results = [o for o in results if o.timestamp > since]

        if agent_filter is not None:
            results = [o for o in results if o.agent_name == agent_filter]

        # Newest first, capped
        return list(reversed(results[-limit:]))

    def subscribe(self, callback: Callable[[Observation], Any]) -> str:
        """Register a real-time subscription to new observations.

        Args:
            callback: Function called with each new Observation.
                      Can be sync or async.

        Returns:
            Subscription ID (use to unsubscribe).
        """
        sub_id = uuid.uuid4().hex[:8]
        if asyncio.iscoroutinefunction(callback):
            self._async_subscribers[sub_id] = callback
        else:
            self._subscribers[sub_id] = callback
        return sub_id

    def unsubscribe(self, sub_id: str) -> bool:
        """Remove a subscription by ID."""
        removed = self._subscribers.pop(sub_id, None) or self._async_subscribers.pop(sub_id, None)
        return removed is not None

    def clear(self) -> None:
        """Clear all observations (useful for testing)."""
        with self._lock:
            self._observations.clear()

    @property
    def count(self) -> int:
        with self._lock:
            return len(self._observations)


# -------------------------------------------------------------------
# Module-level singleton for convenience
# -------------------------------------------------------------------

_default_store: Optional[ObserverStore] = None
_store_lock = threading.Lock()


def get_observer() -> ObserverStore:
    """Get or create the default global observer store."""
    global _default_store
    with _store_lock:
        if _default_store is None:
            _default_store = ObserverStore()
        return _default_store


def observe(agent_name: str, action: str, payload: Optional[Dict[str, Any]] = None) -> Observation:
    """Record an agent action on the default store."""
    return get_observer().observe(agent_name, action, payload)


def get_observations(
    since: Optional[float] = None,
    agent_filter: Optional[str] = None,
    limit: int = 100,
) -> List[Observation]:
    """Retrieve recent observations from the default store."""
    return get_observer().get_observations(since, agent_filter, limit)


def subscribe(callback: Callable[[Observation], Any]) -> str:
    """Subscribe to observations on the default store."""
    return get_observer().subscribe(callback)
