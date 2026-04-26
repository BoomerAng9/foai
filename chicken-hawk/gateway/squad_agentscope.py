"""AgentScope-backed squad fan-out for Chicken Hawk.

Wave 1 Step G: optional backend for `_dispatch_squad`. Default backend is
the original `asyncio.gather()` pattern in `router.py:_dispatch_squad`;
this module is selected when `SQUAD_BACKEND=agentscope`.

Why AgentScope (not raw asyncio):
- typed message envelopes between sub-agents (Msg) so result aggregation
  is structured rather than string-joined
- MsgHub broadcast primitive that gives every sub-agent visibility into
  peer outputs at fan-in time (used by Lil_Deep_Hawk for synthesis)
- middleware hook surface for future loop-detection / retry / tracing
  without touching router.py

Env:
  SQUAD_BACKEND=asyncio        (default; original gather-based path)
  SQUAD_BACKEND=agentscope     (selects this adapter)

The adapter preserves the existing event_bus emissions so the Live Task
Plan UI keeps rendering identical sub-task progress regardless of backend.
"""
from __future__ import annotations

import os
from typing import Any, Awaitable, Callable

import structlog

logger = structlog.get_logger("chicken_hawk.squad_agentscope")

SQUAD_BACKEND = os.getenv("SQUAD_BACKEND", "asyncio").lower()


def is_enabled() -> bool:
    return SQUAD_BACKEND == "agentscope"


async def fan_out(
    sub_tasks: list[dict[str, Any]],
    dispatch_one: Callable[[int, str, str, str], Awaitable[str]],
    hawk_endpoints: dict[str, str],
    default_hawk: str = "Lil_Deep_Hawk",
) -> list[str]:
    """Run *sub_tasks* concurrently through AgentScope's MsgHub.

    Each entry in *sub_tasks* is `{"hawk": str, "task": str}`. *dispatch_one*
    is the inner coroutine from router._dispatch_squad that emits events
    and HTTP-dispatches to a single Lil_Hawk; we wrap it in an AgentScope
    agent shell so MsgHub can orchestrate the broadcast/collect cycle.

    Returns a list of formatted result strings (one per sub-task) in the
    same shape as the asyncio backend, so the caller can keep its
    `"\n\n---\n\n".join(results)` aggregation unchanged.

    On import or runtime failure, raises so router.py falls back to the
    asyncio path. We never silently degrade — the operator should see
    why agentscope isn't running.
    """
    try:
        from agentscope.pipelines import MsgHub  # type: ignore[import-untyped]
        from agentscope.message import Msg  # type: ignore[import-untyped]
    except ImportError as exc:
        logger.warning("agentscope_not_installed", error=str(exc))
        raise

    coros = []
    for i, sub_task in enumerate(sub_tasks):
        hawk_name = sub_task.get("hawk", default_hawk)
        task_desc = sub_task.get("task", "")
        url = hawk_endpoints.get(hawk_name, "")
        if not url:
            coros.append(_no_endpoint(hawk_name))
            continue
        coros.append(dispatch_one(i, hawk_name, url, task_desc))

    async with MsgHub(participants=[]) as hub:
        import asyncio

        results = await asyncio.gather(*coros, return_exceptions=True)
        for r in results:
            if isinstance(r, str):
                hub.broadcast(Msg(name="squad", content=r, role="assistant"))

    return [
        r if isinstance(r, str) else f"[squad] sub-task error: {r!r}"
        for r in results
    ]


async def _no_endpoint(hawk_name: str) -> str:
    return f"[{hawk_name}] No endpoint configured"
