"""Multi-item cart store for Coastal Brewing Co.

Neon-backed (`coastal.user_cart`), keyed by `coastal_uid` cookie. The
runner had no multi-item cart prior to Spinner — each SKU went through
a single-shot `/order/intake` Stripe Checkout. Spinner needs to add
multiple items over time, so this layer materializes a real session-cart
the agent can write to and the customer can review before checkout.

Item shape:
    {
        "sku": "TCR-COASTAL-BLEND-12OZ",
        "quantity": 2,
        "variant": null | "decaf" | "ground" | ...,
        "added_at": "2026-05-06T13:22:00+00:00",
        "added_by": "user" | "spinner" | "agent",
        "spinner_task_id": null | "spin_<hex>"
    }

Schema is bootstrapped on first call (CREATE TABLE IF NOT EXISTS) so
there's no separate migration step. Atomicity guarantees: every mutation
runs in a single SQL statement (JSONB ops) — no read-modify-write race.
"""
from __future__ import annotations

import json
import logging
import os
import threading
from contextlib import contextmanager
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from typing import Any, Iterator, List, Optional

try:
    import psycopg2
    import psycopg2.extras
    from psycopg2 import pool as _pg_pool
    _HAS_PSYCOPG2 = True
except ImportError:
    _HAS_PSYCOPG2 = False

log = logging.getLogger("coastal.cart_store")

NEON_DATABASE_URL = os.environ.get("NEON_DATABASE_URL", "").strip()


# ─── Connection pool ──────────────────────────────────────────────────────


_pool = None
_pool_lock = threading.Lock()
_schema_ready = False


def _get_pool():
    global _pool
    if not NEON_DATABASE_URL or not _HAS_PSYCOPG2:
        return None
    with _pool_lock:
        if _pool is None:
            _pool = _pg_pool.SimpleConnectionPool(
                minconn=1,
                maxconn=4,
                dsn=NEON_DATABASE_URL,
                connect_timeout=10,
            )
            log.info("cart_store: Neon pool initialized (1-4)")
    return _pool


@contextmanager
def _conn() -> Iterator[Any]:
    p = _get_pool()
    if p is None:
        raise RuntimeError("cart_store: Neon DSN not configured")
    c = p.getconn()
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        p.putconn(c)


def _ensure_schema() -> None:
    """Create the cart table on first use. Idempotent."""
    global _schema_ready
    if _schema_ready:
        return
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS coastal.user_cart (
                coastal_uid TEXT PRIMARY KEY,
                items       JSONB NOT NULL DEFAULT '[]'::jsonb,
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)
    _schema_ready = True


def is_configured() -> bool:
    return bool(NEON_DATABASE_URL) and _HAS_PSYCOPG2


# ─── Public API ──────────────────────────────────────────────────────────


@dataclass
class CartItem:
    sku: str
    quantity: int = 1
    variant: Optional[str] = None
    added_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    added_by: str = "user"
    spinner_task_id: Optional[str] = None


def get_cart(coastal_uid: str) -> List[dict]:
    """Return the cart's items as a plain list of dicts. Empty list if
    no row exists."""
    if not coastal_uid or not is_configured():
        return []
    _ensure_schema()
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "SELECT items FROM coastal.user_cart WHERE coastal_uid = %s",
            (coastal_uid,),
        )
        row = cur.fetchone()
    if not row:
        return []
    items = row[0]
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except json.JSONDecodeError:
            items = []
    return items or []


def add_item(
    coastal_uid: str,
    sku: str,
    quantity: int = 1,
    variant: Optional[str] = None,
    added_by: str = "user",
    spinner_task_id: Optional[str] = None,
) -> List[dict]:
    """Add or increment an item. If the (sku, variant) pair already
    exists, quantity is incremented — otherwise a new entry is appended.
    Returns the post-mutation cart."""
    if not coastal_uid or not sku:
        raise ValueError("coastal_uid + sku required")
    if quantity < 1:
        raise ValueError("quantity must be >= 1")
    if not is_configured():
        raise RuntimeError("cart_store not configured")
    _ensure_schema()

    items = get_cart(coastal_uid)
    matched = False
    for it in items:
        if it.get("sku") == sku and (it.get("variant") or None) == variant:
            it["quantity"] = int(it.get("quantity", 0)) + int(quantity)
            matched = True
            break
    if not matched:
        items.append(asdict(CartItem(
            sku=sku,
            quantity=int(quantity),
            variant=variant,
            added_by=added_by,
            spinner_task_id=spinner_task_id,
        )))

    with _conn() as c, c.cursor() as cur:
        cur.execute(
            """
            INSERT INTO coastal.user_cart (coastal_uid, items, updated_at)
            VALUES (%s, %s::jsonb, now())
            ON CONFLICT (coastal_uid)
            DO UPDATE SET items = EXCLUDED.items, updated_at = now()
            """,
            (coastal_uid, json.dumps(items)),
        )
    return items


def set_quantity(coastal_uid: str, sku: str, quantity: int, variant: Optional[str] = None) -> List[dict]:
    """Set absolute quantity. quantity == 0 removes the item."""
    if not coastal_uid or not sku:
        raise ValueError("coastal_uid + sku required")
    if quantity < 0:
        raise ValueError("quantity must be >= 0")
    items = get_cart(coastal_uid)
    new_items: List[dict] = []
    for it in items:
        if it.get("sku") == sku and (it.get("variant") or None) == variant:
            if quantity == 0:
                continue
            it["quantity"] = int(quantity)
        new_items.append(it)
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            """
            INSERT INTO coastal.user_cart (coastal_uid, items, updated_at)
            VALUES (%s, %s::jsonb, now())
            ON CONFLICT (coastal_uid)
            DO UPDATE SET items = EXCLUDED.items, updated_at = now()
            """,
            (coastal_uid, json.dumps(new_items)),
        )
    return new_items


def remove_item(coastal_uid: str, sku: str, variant: Optional[str] = None) -> List[dict]:
    return set_quantity(coastal_uid, sku, 0, variant)


def clear(coastal_uid: str) -> None:
    if not coastal_uid or not is_configured():
        return
    _ensure_schema()
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "DELETE FROM coastal.user_cart WHERE coastal_uid = %s",
            (coastal_uid,),
        )


def cart_summary(coastal_uid: str) -> dict:
    """Lightweight summary — total line-items, total quantity, last update."""
    items = get_cart(coastal_uid)
    total_qty = sum(int(it.get("quantity", 0)) for it in items)
    return {
        "coastal_uid": coastal_uid,
        "line_items": len(items),
        "total_quantity": total_qty,
        "items": items,
    }
