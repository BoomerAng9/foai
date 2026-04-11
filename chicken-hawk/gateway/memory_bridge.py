"""Chicken Hawk memory bridge — org-wide memory for the gateway and Lil_Hawks.

Every routed request:
1. Gets a project plan drafted (task, role, mission, vision, objective)
2. Recalls relevant past routing decisions and outcomes
3. Stores the result for future recall

The gateway tracks itself (Chicken_Hawk, tier=2ic) and each Lil_Hawk
that handles a request gets a memory entry too.
"""

from __future__ import annotations

import os
import sys

import structlog

# Add aims-memory to path (optional — not available in standalone Docker deploys)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "aims-memory"))

try:
    from aims_memory.agent_mixin import AgentMemoryMixin
except ImportError:
    AgentMemoryMixin = None  # type: ignore[misc,assignment]

logger = structlog.get_logger("chicken_hawk.memory")

DEFAULT_TENANT = os.getenv("DEFAULT_TENANT", "cti")

# Gateway-level mixin
_gateway_mixin: AgentMemoryMixin | None = None
# Per-hawk mixins
_hawk_mixins: dict[str, AgentMemoryMixin] = {}


def get_gateway_mixin(tenant_id: str = DEFAULT_TENANT) -> "AgentMemoryMixin | None":
    if AgentMemoryMixin is None:
        return None
    global _gateway_mixin
    if _gateway_mixin is None or _gateway_mixin.tenant_id != tenant_id:
        _gateway_mixin = AgentMemoryMixin(
            agent_name="Chicken_Hawk",
            agent_tier="2ic",
            dept=None,
            tenant_id=tenant_id,
        )
    return _gateway_mixin


def get_hawk_mixin(hawk_name: str, tenant_id: str = DEFAULT_TENANT) -> "AgentMemoryMixin | None":
    key = f"{hawk_name}:{tenant_id}"
    if key not in _hawk_mixins:
        _hawk_mixins[key] = AgentMemoryMixin(
            agent_name=hawk_name,
            agent_tier="lil_hawk",
            dept=None,
            tenant_id=tenant_id,
        )
    return _hawk_mixins[key]


async def before_route(
    trace_id: str, message: str, hawk_name: str
) -> tuple[str, str]:
    """Draft a routing project plan and recall context. Returns (plan_id, memory_context)."""
    try:
        gw = get_gateway_mixin()
        if gw is None:
            return "", ""
        plan_id = await gw.plans.draft(
            task_id=trace_id,
            title=f"Route request to {hawk_name}",
            role="Tactical execution gateway — intent classification and dispatch",
            mission=f"Classify and route user request to {hawk_name}",
            vision="Every request reaches the right specialist with full context",
            objective=f"Dispatch to {hawk_name} with review gate pass",
            steps=["classify_intent", "dispatch_to_hawk", "review_gate", "deliver"],
        )
        await gw.plans.start(plan_id)

        context = await gw.memory.recall(message, top_k=3)
        formatted = gw.memory.format_context(context)
        return plan_id, formatted
    except Exception:
        logger.warning("memory_before_route_failed", trace_id=trace_id)
        return "", ""


async def after_route(
    plan_id: str,
    trace_id: str,
    hawk_name: str,
    message: str,
    elapsed_ms: float,
    reviewed: bool,
    confidence: float,
) -> None:
    """Complete the routing plan and store memories for both gateway and hawk."""
    if not plan_id:
        return
    try:
        gw = get_gateway_mixin()
        if gw is None:
            return
        score = int(confidence * 100)
        grade = "A" if score >= 90 else "B" if score >= 70 else "C" if score >= 50 else "F"

        await gw.plans.complete(plan_id, int(elapsed_ms), score, grade)

        # Store routing memory for the gateway
        await gw.memory.store(
            content=f"Routed to {hawk_name}: {message[:500]}",
            memory_type="task",
            summary=f"Routed to {hawk_name} (confidence: {confidence:.2f})",
            source_id=trace_id,
            metadata={
                "hawk": hawk_name,
                "confidence": confidence,
                "elapsed_ms": elapsed_ms,
                "reviewed": reviewed,
            },
        )

        # Store a memory for the Lil_Hawk that handled it
        hawk_mixin = get_hawk_mixin(hawk_name)
        await hawk_mixin.memory.store(
            content=f"Handled request: {message[:500]}",
            memory_type="task",
            summary=f"Request handled (score: {score}, {int(elapsed_ms)}ms)",
            source_id=trace_id,
            metadata={
                "elapsed_ms": elapsed_ms,
                "score": score,
                "grade": grade,
            },
        )
    except Exception:
        logger.warning("memory_after_route_failed", trace_id=trace_id)
