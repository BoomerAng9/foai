"""
Pre-reasoning hook for the FOAI reasoning spine.
Retrieves relevant memories and compacts context before reasoning.
"""

from __future__ import annotations

from typing import Optional

from .memory_client import ReMemoryClient
from .tokenizer import count_tokens


# Default token budget for context passed to reasoning
DEFAULT_TOKEN_BUDGET = 4096


def pre_reasoning_hook(
    task_id: str,
    context: str,
    *,
    client: Optional[ReMemoryClient] = None,
    tenant_id: str = "default",
    token_budget: int = DEFAULT_TOKEN_BUDGET,
    memory_top_k: int = 5,
    connection_string: Optional[str] = None,
) -> str:
    """
    Pre-reasoning hook that enriches context with relevant memories.

    1. Retrieves relevant memories for the task
    2. Compacts the context if it exceeds token budget
    3. Returns enriched context ready for the reasoning spine

    Args:
        task_id: Identifier for the current task
        context: Raw context string
        client: Optional pre-configured ReMemoryClient
        tenant_id: Tenant namespace for memory isolation
        token_budget: Maximum tokens for output context
        memory_top_k: Number of relevant memories to retrieve
        connection_string: Optional Neon connection string

    Returns:
        Enriched and compacted context string
    """
    if client is None:
        client = ReMemoryClient(
            tenant_id=tenant_id,
            connection_string=connection_string,
        )

    # Step 1: Retrieve relevant memories
    memories = client.search_memory(context[:500], top_k=memory_top_k)

    # Step 2: Build enriched context
    memory_section = ""
    if memories:
        memory_lines = []
        for mem in memories:
            score = mem.get("score", 0)
            if score > 0.1:  # Only include sufficiently relevant memories
                memory_lines.append(
                    f"- [{score:.2f}] {mem['content']}"
                )
        if memory_lines:
            memory_section = (
                "\n[Relevant memories]\n" +
                "\n".join(memory_lines) +
                "\n[End memories]\n\n"
            )

    enriched = memory_section + context

    # Step 3: Compact if over budget
    current_tokens = count_tokens(enriched)
    if current_tokens > token_budget:
        enriched = client.summarize_memory(enriched, token_budget)

    # Step 4: Store this task context as a new memory for future retrieval
    client.store_memory(
        content=context[:2000],  # Store a reasonable portion
        metadata={
            "task_id": task_id,
            "type": "task_context",
        },
    )

    return enriched
