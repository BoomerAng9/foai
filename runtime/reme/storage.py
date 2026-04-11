"""
Storage backend for ReMe memory.
Supports Neon PostgreSQL with per-tenant isolation via the `reme` schema.
Falls back to in-memory storage for testing/offline use.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Protocol

import numpy as np

from .search import embed_text


# --- Storage Protocol ---


class MemoryStore(Protocol):
    """Protocol for memory storage backends."""

    def store(self, tenant_id: str, content: str, metadata: dict,
              embedding: np.ndarray) -> str: ...

    def retrieve(self, tenant_id: str, memory_id: str) -> Optional[dict]: ...

    def search_by_embedding(self, tenant_id: str, query_embedding: np.ndarray,
                            top_k: int) -> list[dict]: ...

    def search_by_keyword(self, tenant_id: str, query: str,
                          top_k: int) -> list[dict]: ...

    def list_memories(self, tenant_id: str, limit: int = 100) -> list[dict]: ...

    def delete(self, tenant_id: str, memory_id: str) -> bool: ...


# --- In-Memory Storage ---


class InMemoryStore:
    """In-memory storage for testing and offline use."""

    def __init__(self):
        self._store: dict[str, dict[str, dict]] = {}  # tenant -> id -> record

    def store(self, tenant_id: str, content: str, metadata: dict,
              embedding: np.ndarray) -> str:
        if tenant_id not in self._store:
            self._store[tenant_id] = {}

        memory_id = str(uuid.uuid4())
        self._store[tenant_id][memory_id] = {
            "id": memory_id,
            "content": content,
            "metadata": metadata,
            "embedding": embedding,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        return memory_id

    def retrieve(self, tenant_id: str, memory_id: str) -> Optional[dict]:
        tenant_data = self._store.get(tenant_id, {})
        record = tenant_data.get(memory_id)
        if record is None:
            return None
        return {
            "id": record["id"],
            "content": record["content"],
            "metadata": record["metadata"],
            "created_at": record["created_at"],
        }

    def search_by_embedding(self, tenant_id: str, query_embedding: np.ndarray,
                            top_k: int) -> list[dict]:
        from .search import cosine_similarity

        tenant_data = self._store.get(tenant_id, {})
        scored = []
        for record in tenant_data.values():
            score = cosine_similarity(query_embedding, record["embedding"])
            scored.append({
                "id": record["id"],
                "content": record["content"],
                "metadata": record["metadata"],
                "score": float(score),
            })
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    def search_by_keyword(self, tenant_id: str, query: str,
                          top_k: int) -> list[dict]:
        from .search import BM25

        tenant_data = self._store.get(tenant_id, {})
        if not tenant_data:
            return []

        records = list(tenant_data.values())
        texts = [r["content"] for r in records]

        bm25 = BM25()
        bm25.index(texts)
        scores = bm25.score(query)

        scored = []
        for i, record in enumerate(records):
            scored.append({
                "id": record["id"],
                "content": record["content"],
                "metadata": record["metadata"],
                "score": scores[i],
            })
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    def list_memories(self, tenant_id: str, limit: int = 100) -> list[dict]:
        tenant_data = self._store.get(tenant_id, {})
        results = []
        for record in list(tenant_data.values())[:limit]:
            results.append({
                "id": record["id"],
                "content": record["content"],
                "metadata": record["metadata"],
                "created_at": record["created_at"],
            })
        return results

    def delete(self, tenant_id: str, memory_id: str) -> bool:
        tenant_data = self._store.get(tenant_id, {})
        if memory_id in tenant_data:
            del tenant_data[memory_id]
            return True
        return False


# --- Neon PostgreSQL Storage ---


SCHEMA_SQL = """
CREATE SCHEMA IF NOT EXISTS reme;

CREATE TABLE IF NOT EXISTS reme.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    embedding FLOAT8[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_tenant
    ON reme.memories (tenant_id);

CREATE INDEX IF NOT EXISTS idx_memories_tenant_created
    ON reme.memories (tenant_id, created_at DESC);

-- Full-text search index for BM25-style keyword search
CREATE INDEX IF NOT EXISTS idx_memories_content_fts
    ON reme.memories USING gin(to_tsvector('english', content));
"""


class NeonStore:
    """
    Neon PostgreSQL storage with per-tenant isolation.
    Uses the `reme` schema. Requires psycopg or asyncpg.
    """

    def __init__(self, connection_string: str, embedding_dim: int = 128):
        self.connection_string = connection_string
        self.embedding_dim = embedding_dim
        self._conn = None

    def _get_conn(self):
        if self._conn is None:
            try:
                import psycopg
                self._conn = psycopg.connect(self.connection_string)
                self._conn.autocommit = True
            except ImportError:
                raise ImportError(
                    "psycopg is required for NeonStore. "
                    "Install with: pip install psycopg[binary]"
                )
        return self._conn

    def initialize(self) -> None:
        """Create schema and tables if they don't exist."""
        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)

    def store(self, tenant_id: str, content: str, metadata: dict,
              embedding: np.ndarray) -> str:
        conn = self._get_conn()
        memory_id = str(uuid.uuid4())
        embedding_list = embedding.tolist()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO reme.memories (id, tenant_id, content, metadata, embedding)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (memory_id, tenant_id, content,
                 json.dumps(metadata), embedding_list)
            )
        return memory_id

    def retrieve(self, tenant_id: str, memory_id: str) -> Optional[dict]:
        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, content, metadata, created_at
                FROM reme.memories
                WHERE tenant_id = %s AND id = %s
                """,
                (tenant_id, memory_id)
            )
            row = cur.fetchone()
            if row is None:
                return None
            return {
                "id": str(row[0]),
                "content": row[1],
                "metadata": row[2] if isinstance(row[2], dict) else json.loads(row[2]),
                "created_at": row[3].isoformat() if row[3] else None,
            }

    def search_by_embedding(self, tenant_id: str, query_embedding: np.ndarray,
                            top_k: int) -> list[dict]:
        """
        Vector similarity search using cosine similarity computed in Python.
        For production, consider pgvector extension.
        """
        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, content, metadata, embedding
                FROM reme.memories
                WHERE tenant_id = %s
                ORDER BY created_at DESC
                LIMIT 1000
                """,
                (tenant_id,)
            )
            rows = cur.fetchall()

        from .search import cosine_similarity

        scored = []
        for row in rows:
            emb = np.array(row[3], dtype=np.float32)
            score = cosine_similarity(query_embedding, emb)
            scored.append({
                "id": str(row[0]),
                "content": row[1],
                "metadata": row[2] if isinstance(row[2], dict) else json.loads(row[2]),
                "score": float(score),
            })
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    def search_by_keyword(self, tenant_id: str, query: str,
                          top_k: int) -> list[dict]:
        """Full-text search using PostgreSQL tsvector."""
        conn = self._get_conn()
        # Convert query to tsquery-safe format
        words = query.strip().split()
        tsquery = " & ".join(w for w in words if w)
        if not tsquery:
            return []

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, content, metadata,
                       ts_rank(to_tsvector('english', content),
                               to_tsquery('english', %s)) as rank
                FROM reme.memories
                WHERE tenant_id = %s
                  AND to_tsvector('english', content) @@ to_tsquery('english', %s)
                ORDER BY rank DESC
                LIMIT %s
                """,
                (tsquery, tenant_id, tsquery, top_k)
            )
            rows = cur.fetchall()

        return [
            {
                "id": str(row[0]),
                "content": row[1],
                "metadata": row[2] if isinstance(row[2], dict) else json.loads(row[2]),
                "score": float(row[3]),
            }
            for row in rows
        ]

    def list_memories(self, tenant_id: str, limit: int = 100) -> list[dict]:
        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, content, metadata, created_at
                FROM reme.memories
                WHERE tenant_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (tenant_id, limit)
            )
            rows = cur.fetchall()

        return [
            {
                "id": str(row[0]),
                "content": row[1],
                "metadata": row[2] if isinstance(row[2], dict) else json.loads(row[2]),
                "created_at": row[3].isoformat() if row[3] else None,
            }
            for row in rows
        ]

    def delete(self, tenant_id: str, memory_id: str) -> bool:
        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM reme.memories
                WHERE tenant_id = %s AND id = %s
                """,
                (tenant_id, memory_id)
            )
            return cur.rowcount > 0

    def close(self) -> None:
        if self._conn is not None:
            self._conn.close()
            self._conn = None
