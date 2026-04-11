"""
ReMe Memory Client — thin public interface.
Exposes ONLY the four required functions:
  - summarize_memory
  - compact_context
  - search_memory
  - store_memory
"""

from __future__ import annotations

from typing import Optional

from .compactor import summarize_memory as _summarize, compact_context as _compact
from .search import HybridSearchEngine, embed_text
from .storage import InMemoryStore, NeonStore, MemoryStore
from .tokenizer import count_tokens


class ReMemoryClient:
    """
    ReMe Memory Client with per-tenant isolation.

    Usage:
        client = ReMemoryClient(tenant_id="org-123")
        mid = client.store_memory("The user prefers dark mode.", {"source": "chat"})
        results = client.search_memory("user preferences", top_k=5)
        compressed = client.summarize_memory(long_context, max_tokens=500)
    """

    def __init__(
        self,
        tenant_id: str,
        store: Optional[MemoryStore] = None,
        connection_string: Optional[str] = None,
        embedding_dim: int = 128,
    ):
        self.tenant_id = tenant_id
        self.embedding_dim = embedding_dim

        if store is not None:
            self._store = store
        elif connection_string is not None:
            neon = NeonStore(connection_string, embedding_dim)
            neon.initialize()
            self._store = neon
        else:
            self._store = InMemoryStore()

        self._search_engine = HybridSearchEngine(
            embedding_dim=embedding_dim
        )

    def summarize_memory(self, context: str, max_tokens: int) -> str:
        """
        Compress context while preserving key information.
        Uses extractive summarization with TF-IDF sentence scoring.
        Returns compressed text fitting within max_tokens.
        """
        return _summarize(context, max_tokens)

    def compact_context(
        self, messages: list[dict], target_ratio: float
    ) -> list[dict]:
        """
        Reduce message list to target token ratio.
        target_ratio: fraction to keep (e.g. 0.15 = keep 15%).
        Preserves system messages and recent turns; compresses older history.
        """
        return _compact(messages, target_ratio)

    def search_memory(self, query: str, top_k: int = 5) -> list[dict]:
        """
        Hybrid search (BM25 keyword + vector cosine similarity) over stored memories.
        Returns list of dicts with id, content, metadata, score.
        """
        # Get all memories for this tenant
        all_memories = self._store.list_memories(self.tenant_id, limit=10000)
        if not all_memories:
            return []

        # Build search index
        docs = [
            {
                "id": m["id"],
                "content": m["content"],
                "metadata": m.get("metadata", {}),
            }
            for m in all_memories
        ]
        self._search_engine.index_documents(docs)

        # Perform hybrid search
        results = self._search_engine.search(query, top_k=top_k)
        return results

    def store_memory(self, content: str, metadata: Optional[dict] = None) -> str:
        """
        Store content with metadata. Returns memory ID.
        Automatically generates embedding for vector search.
        """
        if metadata is None:
            metadata = {}

        embedding = embed_text(content, self.embedding_dim)
        memory_id = self._store.store(
            self.tenant_id, content, metadata, embedding
        )
        return memory_id

    def retrieve_memory(self, memory_id: str) -> Optional[dict]:
        """Retrieve a specific memory by ID."""
        return self._store.retrieve(self.tenant_id, memory_id)

    def delete_memory(self, memory_id: str) -> bool:
        """Delete a specific memory by ID."""
        return self._store.delete(self.tenant_id, memory_id)


# --- Module-level convenience functions ---

_default_client: Optional[ReMemoryClient] = None


def _get_default_client() -> ReMemoryClient:
    global _default_client
    if _default_client is None:
        _default_client = ReMemoryClient(tenant_id="default")
    return _default_client


def summarize_memory(context: str, max_tokens: int) -> str:
    """Compress context while preserving key information."""
    return _get_default_client().summarize_memory(context, max_tokens)


def compact_context(messages: list[dict], target_ratio: float) -> list[dict]:
    """Reduce message list to target token ratio."""
    return _get_default_client().compact_context(messages, target_ratio)


def search_memory(query: str, top_k: int = 5) -> list[dict]:
    """Hybrid search over stored memories."""
    return _get_default_client().search_memory(query, top_k)


def store_memory(content: str, metadata: Optional[dict] = None) -> str:
    """Store content with metadata, returns memory ID."""
    return _get_default_client().store_memory(content, metadata)
