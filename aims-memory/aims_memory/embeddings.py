"""Embedding service — Gemini text-embedding-004 via OpenRouter.

768-dimension vectors stored in pgvector for cosine similarity search.
Shared across all agents in the FOAI-AIMS ecosystem.
"""

import os

import httpx

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "google/text-embedding-004")
_OPENROUTER_URL = "https://openrouter.ai/api/v1/embeddings"


async def generate_embedding(text: str) -> list[float]:
    """Generate a 768-dim embedding vector via OpenRouter."""
    api_key = os.environ["OPENROUTER_API_KEY"]
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            _OPENROUTER_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": EMBEDDING_MODEL, "input": text[:10000]},
        )
        resp.raise_for_status()
        return resp.json()["data"][0]["embedding"]


async def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts."""
    results = []
    for text in texts:
        results.append(await generate_embedding(text))
    return results
