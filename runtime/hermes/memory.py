"""RAG-based memory for Hermes LearnAng — semantic retrieval of past evaluations.

Embeds evaluation summaries via OpenRouter (Gemini embeddings) and stores
vectors in Firestore. Before each new evaluation, retrieves the most
semantically relevant past evaluations to inform the analysis.
"""

import json
import os

import httpx
import structlog
from google.cloud import firestore

from config import GCP_PROJECT

logger = structlog.get_logger("hermes.memory")

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "google/text-embedding-004")
MEMORY_COLLECTION = "hermes_memory"
TOP_K = int(os.getenv("HERMES_MEMORY_TOP_K", "5"))


def _get_db() -> firestore.Client:
    return firestore.Client(project=GCP_PROJECT)


async def generate_embedding(text: str) -> list[float]:
    """Generate an embedding vector via OpenRouter's embeddings endpoint."""
    api_key = os.environ["OPENROUTER_API_KEY"]
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/embeddings",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": EMBEDDING_MODEL, "input": text},
        )
        resp.raise_for_status()
        data = resp.json()
        return data["data"][0]["embedding"]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


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


async def store_evaluation_memory(
    tenant_id: str,
    evaluation_id: str,
    evaluation: dict,
    input_data: dict,
    eval_type: str,
    created_at: str,
) -> None:
    """Embed and store an evaluation in the memory collection."""
    memory_text = _build_memory_text(evaluation, input_data)

    try:
        embedding = await generate_embedding(memory_text)
    except Exception:
        logger.exception("embedding_generation_failed", evaluation_id=evaluation_id)
        return

    db = _get_db()
    mem_ref = (
        db.collection(MEMORY_COLLECTION)
        .document(tenant_id)
        .collection("vectors")
        .document(evaluation_id)
    )
    mem_ref.set({
        "evaluation_id": evaluation_id,
        "text": memory_text,
        "embedding": embedding,
        "ecosystem_score": evaluation.get("ecosystem_score"),
        "eval_type": eval_type,
        "created_at": created_at,
    })

    logger.info(
        "memory_stored",
        evaluation_id=evaluation_id,
        text_length=len(memory_text),
        vector_dim=len(embedding),
    )


async def recall_relevant_evaluations(
    tenant_id: str, query_text: str, top_k: int = TOP_K
) -> list[dict]:
    """Retrieve the most semantically relevant past evaluations.

    Embeds the query text, then compares against all stored evaluation
    embeddings using cosine similarity. Returns the top-k matches.
    """
    try:
        query_embedding = await generate_embedding(query_text)
    except Exception:
        logger.exception("query_embedding_failed")
        return []

    db = _get_db()
    docs = (
        db.collection(MEMORY_COLLECTION)
        .document(tenant_id)
        .collection("vectors")
        .stream()
    )

    scored = []
    for doc in docs:
        data = doc.to_dict()
        stored_embedding = data.get("embedding", [])
        if not stored_embedding:
            continue
        sim = _cosine_similarity(query_embedding, stored_embedding)
        scored.append({
            "evaluation_id": data.get("evaluation_id", doc.id),
            "text": data.get("text", ""),
            "ecosystem_score": data.get("ecosystem_score"),
            "eval_type": data.get("eval_type"),
            "created_at": data.get("created_at", ""),
            "similarity": round(sim, 4),
        })

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    results = scored[:top_k]

    logger.info(
        "memory_recalled",
        tenant_id=tenant_id,
        candidates=len(scored),
        returned=len(results),
        top_similarity=results[0]["similarity"] if results else 0,
    )

    return results


def format_memory_context(memories: list[dict]) -> str:
    """Format recalled memories into a prompt-ready context block."""
    if not memories:
        return ""

    lines = ["## Relevant Past Evaluations (from memory)\n"]
    for i, mem in enumerate(memories, 1):
        lines.append(
            f"### Memory {i} (similarity: {mem['similarity']}, "
            f"date: {mem['created_at']}, type: {mem['eval_type']})\n"
        )
        lines.append(mem["text"])
        lines.append("")

    lines.append(
        "Use these past evaluations to identify patterns, track improvement "
        "on previous directives, and provide historically-informed analysis.\n"
    )
    return "\n".join(lines)
