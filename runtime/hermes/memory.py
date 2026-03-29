"""Hermes memory bridge — delegates to shared aims-memory (pgvector).

Wraps the org-wide MemoryClient for Hermes-specific evaluation storage
and recall. Falls back to standalone mode if aims-memory DB is unavailable.
"""

import sys
import os

# Add aims-memory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "aims-memory"))

import structlog

from aims_memory.agent_mixin import AgentMemoryMixin

logger = structlog.get_logger("hermes.memory")

# Hermes mixin — engine tier, no dept
_mixin: AgentMemoryMixin | None = None


def get_mixin(tenant_id: str = "cti") -> AgentMemoryMixin:
    global _mixin
    if _mixin is None or _mixin.tenant_id != tenant_id:
        _mixin = AgentMemoryMixin(
            agent_name="Hermes",
            agent_tier="engine",
            dept=None,
            tenant_id=tenant_id,
        )
    return _mixin


async def store_evaluation_memory(
    tenant_id: str,
    evaluation_id: str,
    evaluation: dict,
    input_data: dict,
    eval_type: str,
    created_at: str,
) -> None:
    """Embed and store an evaluation in org-wide memory."""
    mixin = get_mixin(tenant_id)
    content = _build_memory_text(evaluation, input_data)
    try:
        await mixin.memory.store(
            content=content,
            memory_type="evaluation",
            summary=f"Ecosystem score: {evaluation.get('ecosystem_score')} ({eval_type})",
            source_id=evaluation_id,
            metadata={
                "ecosystem_score": evaluation.get("ecosystem_score"),
                "eval_type": eval_type,
                "models_used": evaluation.get("models_used", 1),
                "created_at": created_at,
            },
        )
        logger.info("memory_stored", evaluation_id=evaluation_id)
    except Exception:
        logger.exception("memory_store_failed", evaluation_id=evaluation_id)


async def recall_relevant_evaluations(
    tenant_id: str, query_text: str, top_k: int = 5
) -> list[dict]:
    """Retrieve semantically relevant past evaluations from org memory."""
    mixin = get_mixin(tenant_id)
    try:
        results = await mixin.memory.recall(
            query_text, top_k=top_k, memory_type="evaluation"
        )
        logger.info("memory_recalled", count=len(results))
        return results
    except Exception:
        logger.exception("memory_recall_failed")
        return []


def format_memory_context(memories: list[dict]) -> str:
    """Format recalled memories into a prompt-ready context block."""
    if not memories:
        return ""
    mixin = get_mixin()
    return mixin.memory.format_context(memories)


def _build_memory_text(evaluation: dict, input_data: dict) -> str:
    """Build a text summary of an evaluation for embedding."""
    parts = [f"Ecosystem score: {evaluation.get('ecosystem_score', 'N/A')}"]

    for ev in evaluation.get("evaluations", []):
        parts.append(
            f"{ev['agent_name']}: score={ev.get('score', 'N/A')}, "
            f"directive={ev.get('directive', 'N/A')}, "
            f"reasoning={ev.get('reasoning', 'N/A')}"
        )

    summary = evaluation.get("summary", "")
    if summary:
        parts.append(f"Summary: {summary}")

    enrollments = input_data.get("enrollments", {})
    parts.append(
        f"Enrollments: {enrollments.get('recent_enrollments', 0)}, "
        f"Revenue: ${enrollments.get('recent_revenue', 0.0):.2f}"
    )

    costs = input_data.get("costs", {})
    if costs.get("total_cost_usd", 0) > 0:
        parts.append(f"Total cost: ${costs['total_cost_usd']:.2f}")

    return "\n".join(parts)
