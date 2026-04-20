"""Sqwaadrun customer API-key authentication + quota enforcement.

Replaces the shared-key `auth_middleware` in `service.py` for customer
traffic. Admin callers (with `SQWAADRUN_API_KEY` env) keep working via
the same Authorization header — admin path is checked first.

Customer keys are plaintext `sqr_live_<hex32>` strings. The server
stores only `HMAC-SHA256(pepper, plaintext)` in `sqwaadrun_api_keys.
key_hash`. Pepper is `SQWAADRUN_KEY_PEPPER` env var.

Quota: each successful `/mission` or `/scrape` call increments
`usage_this_period`. When it reaches `monthly_quota` we return 429.
Stripe webhook resets the counter on subscription renewal.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
from typing import Any, Optional

from aiohttp import web
import psycopg
from psycopg_pool import AsyncConnectionPool

logger = logging.getLogger("Sqwaadrun.Billing")

PEPPER_ENV = "SQWAADRUN_KEY_PEPPER"
ADMIN_KEY_ENV = "SQWAADRUN_API_KEY"
DATABASE_URL_ENV = "DATABASE_URL"
KEY_PREFIX = "sqr_live_"

OPEN_PATHS = frozenset({"/", "/health"})
METERED_PATH_PREFIXES = ("/mission", "/scrape")


class BillingConfigError(RuntimeError):
    """Raised when SQWAADRUN_KEY_PEPPER / DATABASE_URL are unset."""


_pool: Optional[AsyncConnectionPool] = None


def _pepper() -> str:
    value = os.environ.get(PEPPER_ENV, "")
    if len(value) < 32:
        raise BillingConfigError(
            f"{PEPPER_ENV} must be set to a >=32-char secret value"
        )
    return value


def _hash_customer_key(plaintext: str) -> str:
    return hmac.new(
        _pepper().encode("utf-8"),
        plaintext.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


async def get_pool() -> AsyncConnectionPool:
    """Lazily open a shared pool to Neon."""
    global _pool
    if _pool is None:
        dsn = os.environ.get(DATABASE_URL_ENV)
        if not dsn:
            raise BillingConfigError(f"{DATABASE_URL_ENV} not set")
        _pool = AsyncConnectionPool(
            conninfo=dsn,
            min_size=1,
            max_size=8,
            kwargs={"autocommit": True},
            open=False,
        )
        await _pool.open()
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def resolve_customer_key(plaintext: str) -> Optional[dict[str, Any]]:
    """Look up an active customer key by HMAC hash. None if missing/revoked."""
    key_hash = _hash_customer_key(plaintext)
    pool = await get_pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, user_id, tier, monthly_quota, usage_this_period,
                       period_start, period_end
                FROM sqwaadrun_api_keys
                WHERE key_hash = %s AND revoked_at IS NULL
                LIMIT 1
                """,
                (key_hash,),
            )
            row = await cur.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "user_id": row[1],
                "tier": row[2],
                "monthly_quota": row[3],
                "usage_this_period": row[4],
                "period_start": row[5],
                "period_end": row[6],
            }


async def increment_usage(api_key_row_id: Any) -> None:
    """Atomically add one to usage_this_period."""
    pool = await get_pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE sqwaadrun_api_keys
                SET usage_this_period = usage_this_period + 1
                WHERE id = %s
                """,
                (api_key_row_id,),
            )


def _is_admin_key(presented: str) -> bool:
    expected = os.environ.get(ADMIN_KEY_ENV, "")
    if not expected:
        return False
    return hmac.compare_digest(presented, expected)


@web.middleware
async def customer_auth_middleware(request: web.Request, handler):
    """Auth + quota middleware. Replaces the old shared-key middleware."""
    if request.path in OPEN_PATHS:
        return await handler(request)

    presented = (
        request.headers.get("Authorization", "")
        .removeprefix("Bearer ")
        .strip()
    )
    if not presented:
        return web.json_response({"error": "unauthorized"}, status=401)

    # Admin path — exact match against gateway shared key
    if _is_admin_key(presented):
        request["sqwaadrun_actor"] = "admin"
        request["sqwaadrun_tier"] = "admin"
        return await handler(request)

    # Customer path — recognizable prefix + Neon lookup
    if presented.startswith(KEY_PREFIX):
        try:
            record = await resolve_customer_key(presented)
        except BillingConfigError as exc:
            logger.error("billing_config_error: %s", exc)
            return web.json_response(
                {"error": "billing subsystem not configured"},
                status=503,
            )
        except psycopg.Error as exc:
            logger.exception("customer_key_lookup_db_error")
            return web.json_response(
                {"error": "billing lookup failed"},
                status=503,
            )

        if not record:
            return web.json_response({"error": "invalid key"}, status=401)

        if record["usage_this_period"] >= record["monthly_quota"]:
            return web.json_response(
                {
                    "error": "quota exceeded",
                    "tier": record["tier"],
                    "quota": record["monthly_quota"],
                    "period_end": record["period_end"].isoformat()
                    if record["period_end"]
                    else None,
                },
                status=429,
            )

        request["sqwaadrun_actor"] = "customer"
        request["sqwaadrun_tier"] = record["tier"]
        request["sqwaadrun_user_id"] = record["user_id"]
        request["sqwaadrun_api_key_row_id"] = record["id"]

        response = await handler(request)

        # Meter successful mission/scrape calls
        is_metered = any(
            request.path.startswith(prefix) for prefix in METERED_PATH_PREFIXES
        )
        if is_metered and 200 <= response.status < 300:
            try:
                await increment_usage(record["id"])
            except psycopg.Error:
                logger.exception("usage_increment_failed")

        return response

    return web.json_response({"error": "unauthorized"}, status=401)
