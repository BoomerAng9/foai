"""MemoryClient — semantic memory for any FOAI agent.

Store and recall memories using pgvector cosine similarity.
Every agent in the hierarchy uses the same memory backbone.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from aims_memory.db import get_pool
from aims_memory.embeddings import generate_embedding


class MemoryClient:
    """Shared memory client for all FOAI agents."""

    def __init__(
        self,
        agent_name: str,
        agent_tier: str,
        dept: str | None = None,
        tenant_id: str = "cti",
    ):
        self.agent_name = agent_name
        self.agent_tier = agent_tier
        self.dept = dept
        self.tenant_id = tenant_id

    async def store(
        self,
        content: str,
        memory_type: str = "task",
        summary: str | None = None,
        source_id: str | None = None,
        metadata: dict | None = None,
    ) -> str:
        """Embed and store a memory. Returns the memory ID."""
        embedding = await generate_embedding(content)
        vector_str = f"[{','.join(str(v) for v in embedding)}]"

        pool = await get_pool()
        row = await pool.fetchrow(
            """
            INSERT INTO agent_memory
                (tenant_id, agent_name, agent_tier, dept, content, summary,
                 embedding, memory_type, source_id, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, $9, $10)
            RETURNING id
            """,
            self.tenant_id,
            self.agent_name,
            self.agent_tier,
            self.dept,
            content,
            summary,
            vector_str,
            memory_type,
            source_id,
            json.dumps(metadata or {}),
        )
        return str(row["id"])

    async def recall(
        self,
        query: str,
        top_k: int = 5,
        memory_type: str | None = None,
        include_all_agents: bool = False,
    ) -> list[dict]:
        """Semantically search memory. Returns top-K similar memories.

        By default searches only this agent's memories.
        Set include_all_agents=True to search across the whole org
        (useful for ACHEEVY and Hermes evaluations).
        """
        embedding = await generate_embedding(query)
        vector_str = f"[{','.join(str(v) for v in embedding)}]"

        pool = await get_pool()

        if include_all_agents:
            agent_filter = ""
            params = [self.tenant_id, vector_str, top_k]
        else:
            agent_filter = "AND agent_name = $4"
            params = [self.tenant_id, vector_str, top_k, self.agent_name]

        type_filter = ""
        if memory_type:
            idx = len(params) + 1
            type_filter = f"AND memory_type = ${idx}"
            params.append(memory_type)

        rows = await pool.fetch(
            f"""
            SELECT id, agent_name, agent_tier, dept, content, summary,
                   memory_type, source_id, metadata, created_at,
                   1 - (embedding <=> $2::vector) AS similarity
            FROM agent_memory
            WHERE tenant_id = $1 {agent_filter} {type_filter}
            ORDER BY embedding <=> $2::vector
            LIMIT $3
            """,
            *params,
        )

        return [
            {
                "id": str(r["id"]),
                "agent_name": r["agent_name"],
                "agent_tier": r["agent_tier"],
                "dept": r["dept"],
                "content": r["content"],
                "summary": r["summary"],
                "memory_type": r["memory_type"],
                "source_id": r["source_id"],
                "metadata": json.loads(r["metadata"]) if r["metadata"] else {},
                "similarity": round(float(r["similarity"]), 4),
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ]

    async def recall_recent(self, limit: int = 10) -> list[dict]:
        """Fetch the most recent memories for this agent (non-semantic)."""
        pool = await get_pool()
        rows = await pool.fetch(
            """
            SELECT id, content, summary, memory_type, source_id, metadata, created_at
            FROM agent_memory
            WHERE tenant_id = $1 AND agent_name = $2
            ORDER BY created_at DESC
            LIMIT $3
            """,
            self.tenant_id,
            self.agent_name,
            limit,
        )
        return [
            {
                "id": str(r["id"]),
                "content": r["content"],
                "summary": r["summary"],
                "memory_type": r["memory_type"],
                "source_id": r["source_id"],
                "metadata": json.loads(r["metadata"]) if r["metadata"] else {},
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ]

    def format_context(self, memories: list[dict]) -> str:
        """Format recalled memories into a prompt-injectable context block."""
        if not memories:
            return ""
        lines = [f"## Relevant Memories for {self.agent_name}\n"]
        for i, mem in enumerate(memories, 1):
            lines.append(
                f"### Memory {i} (type: {mem['memory_type']}, "
                f"similarity: {mem.get('similarity', 'N/A')}, "
                f"date: {mem['created_at']})"
            )
            if mem.get("summary"):
                lines.append(f"**Summary:** {mem['summary']}")
            lines.append(mem["content"])
            lines.append("")
        lines.append(
            "Use these memories to inform your current task. "
            "Reference past outcomes, follow up on previous directives, "
            "and avoid repeating mistakes.\n"
        )
        return "\n".join(lines)
