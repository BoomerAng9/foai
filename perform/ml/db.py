"""
Database connection helper for the ML pipeline.
Reads DATABASE_URL from perform/.env.local (Neon PostgreSQL).
"""
import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# Load .env.local from the perform directory
_env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(_env_path)

DATABASE_URL = os.environ.get("DATABASE_URL", "")

def get_conn():
    """Return a psycopg2 connection to the Neon database."""
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL not set — check perform/.env.local")
    return psycopg2.connect(DATABASE_URL)


def execute_sql(sql: str, params=None, fetch: bool = False):
    """Execute SQL and optionally fetch results."""
    conn = get_conn()
    conn.autocommit = True
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        if fetch:
            cols = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
            return cols, rows
        return None
    finally:
        cur.close()
        conn.close()


def execute_many(sql: str, data: list):
    """Execute SQL with many rows of data."""
    conn = get_conn()
    conn.autocommit = False
    cur = conn.cursor()
    try:
        cur.executemany(sql, data)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def batch_insert(sql: str, data: list, batch_size: int = 500):
    """Insert data in batches for performance."""
    conn = get_conn()
    conn.autocommit = False
    cur = conn.cursor()
    try:
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            cur.executemany(sql, batch)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
