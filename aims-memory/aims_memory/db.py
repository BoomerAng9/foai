"""Database connection pool for aims-memory.

Uses asyncpg for async Postgres access with pgvector support.
Connection string from AIMS_MEMORY_DATABASE_URL env var.
"""

import os

import asyncpg

_pool: asyncpg.Pool | None = None

DATABASE_URL = os.getenv(
    "AIMS_MEMORY_DATABASE_URL",
    os.getenv("DATABASE_URL", ""),
)


async def get_pool() -> asyncpg.Pool:
    """Get or create the connection pool."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=2,
            max_size=10,
        )
    return _pool


async def close_pool():
    """Close the connection pool."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
