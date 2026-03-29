"""Memory routes — query and manage Hermes RAG memory."""

from fastapi import APIRouter, Query
from google.cloud import firestore
from pydantic import BaseModel

from config import DEFAULT_TENANT, GCP_PROJECT
from memory import MEMORY_COLLECTION, recall_relevant_evaluations

router = APIRouter(prefix="/memory", tags=["Memory"])


class MemoryEntry(BaseModel):
    evaluation_id: str
    text: str
    ecosystem_score: int | None
    eval_type: str | None
    created_at: str
    similarity: float | None = None


class MemoryRecallResult(BaseModel):
    tenant_id: str
    query: str
    results: list[MemoryEntry]
    total_stored: int


class MemoryStats(BaseModel):
    tenant_id: str
    total_memories: int
    eval_types: dict[str, int]
    oldest: str | None
    newest: str | None


@router.get("/recall", response_model=MemoryRecallResult)
async def recall_memories(
    query: str = Query(..., description="Natural language query to search memory"),
    tenant_id: str = Query(default=DEFAULT_TENANT),
    top_k: int = Query(default=5, le=20),
):
    """Semantically search Hermes evaluation memory."""
    results = await recall_relevant_evaluations(tenant_id, query, top_k=top_k)

    # Count total stored
    db = firestore.Client(project=GCP_PROJECT)
    all_docs = (
        db.collection(MEMORY_COLLECTION)
        .document(tenant_id)
        .collection("vectors")
        .stream()
    )
    total = sum(1 for _ in all_docs)

    return MemoryRecallResult(
        tenant_id=tenant_id,
        query=query,
        results=[MemoryEntry(**r) for r in results],
        total_stored=total,
    )


@router.get("/stats", response_model=MemoryStats)
async def memory_stats(
    tenant_id: str = Query(default=DEFAULT_TENANT),
):
    """Return statistics about stored evaluation memories."""
    db = firestore.Client(project=GCP_PROJECT)
    docs = (
        db.collection(MEMORY_COLLECTION)
        .document(tenant_id)
        .collection("vectors")
        .stream()
    )

    total = 0
    eval_types: dict[str, int] = {}
    oldest = None
    newest = None

    for doc in docs:
        data = doc.to_dict()
        total += 1
        et = data.get("eval_type", "unknown")
        eval_types[et] = eval_types.get(et, 0) + 1
        created = data.get("created_at", "")
        if created:
            if oldest is None or created < oldest:
                oldest = created
            if newest is None or created > newest:
                newest = created

    return MemoryStats(
        tenant_id=tenant_id,
        total_memories=total,
        eval_types=eval_types,
        oldest=oldest,
        newest=newest,
    )
