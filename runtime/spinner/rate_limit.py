"""Rate limiting — token bucket per (tier, identifier) with Redis + in-process fallback.

Backed by Redis when ``REDIS_URL`` is set (horizontally consistent across
replicas via a single Lua CAS script). Falls back to an in-process
``dict`` when Redis is absent — documented as the single-replica
Cloud Run (min=1) path only. The pre-2026-04-18 behavior used the
in-process map even when the service scaled out; this module now refuses
to silently ignore horizontal-scale risk.

Owner is exempt by ``Caller.rate_limit_bypass``. Other tiers get
tier-specific buckets. Two buckets enforced simultaneously: per
(tier, identifier) and per-IP. An IP-bucket deny refunds the tier bucket
so the caller isn't double-charged.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass
from typing import Any

import structlog

try:
    # redis>=4.5 exposes redis.asyncio
    from redis import asyncio as redis_asyncio  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover — Redis is optional
    redis_asyncio = None

from auth import Caller, Tier

logger = structlog.get_logger("spinner.rate_limit")


# Per-tier bucket config: (capacity, refill_per_minute)
# Owner bypass — never hits the bucket.
BUCKETS: dict[Tier, tuple[int, int]] = {
    Tier.TENANT: (300, 300),    # 5 rps sustained, burst to 300
    Tier.FREE:   (30, 30),       # 0.5 rps sustained, burst to 30
    Tier.DEMO:   (15, 15),       # 0.25 rps sustained, burst to 15
    Tier.PUBLIC: (10, 10),       # very tight — anonymous traffic
}

IP_BUCKET_CAP = 60
IP_BUCKET_REFILL_PER_MIN = 60
KEY_TTL_SECONDS = 3600  # bucket keys TTL out after an hour of inactivity


# ── In-process fallback (single-replica only) ──────────────────────

@dataclass
class _Bucket:
    tokens: float
    last_refill: float


_local: dict[str, _Bucket] = {}
_lock = asyncio.Lock()
MAX_BUCKETS = 10000  # hard cap to prevent identifier-flood DoS


def _key(caller: Caller) -> str:
    return f"spinner:rate:tier:{caller.tier.value}:{caller.identifier}"


def _ip_key(ip: str) -> str:
    return f"spinner:rate:ip:{ip}"


def _evict_if_full() -> None:
    """LRU-ish eviction — drop the 10% oldest entries when cap exceeded."""
    if len(_local) <= MAX_BUCKETS:
        return
    victims = sorted(_local.items(), key=lambda kv: kv[1].last_refill)[: MAX_BUCKETS // 10]
    for k, _ in victims:
        _local.pop(k, None)


async def _consume_local(key: str, cap: int, refill_per_min: int, now: float) -> tuple[bool, float]:
    bucket = _local.get(key)
    if bucket is None:
        _evict_if_full()
        bucket = _Bucket(tokens=float(cap), last_refill=now)
        _local[key] = bucket

    elapsed = now - bucket.last_refill
    added = elapsed * (refill_per_min / 60.0)
    bucket.tokens = min(float(cap), bucket.tokens + added)
    bucket.last_refill = now

    if bucket.tokens < 1.0:
        wait = (1.0 - bucket.tokens) / (refill_per_min / 60.0)
        return False, wait

    bucket.tokens -= 1.0
    return True, 0.0


async def _refund_local(key: str, cap: int) -> None:
    bucket = _local.get(key)
    if bucket is None:
        return
    bucket.tokens = min(float(cap), bucket.tokens + 1.0)


# ── Redis backend (horizontally consistent) ────────────────────────

# Lua script: token-bucket CAS in a single round trip. Redis guarantees
# atomic execution of the script, so replicas share one authoritative
# bucket state per key.
#
# KEYS[1] = bucket key
# ARGV[1] = capacity (int)
# ARGV[2] = refill_per_minute (int)
# ARGV[3] = now (float seconds)
# ARGV[4] = ttl (int seconds)
#
# Returns: {allowed (0|1), wait_seconds (float)}
_CONSUME_LUA = """
local key = KEYS[1]
local cap = tonumber(ARGV[1])
local refill = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1])
local last_refill = tonumber(data[2])

if tokens == nil then
  tokens = cap
  last_refill = now
end

local elapsed = now - last_refill
if elapsed < 0 then elapsed = 0 end
local added = elapsed * (refill / 60.0)
tokens = math.min(cap, tokens + added)

local allowed
local wait
if tokens < 1.0 then
  allowed = 0
  wait = (1.0 - tokens) / (refill / 60.0)
else
  tokens = tokens - 1.0
  allowed = 1
  wait = 0.0
end

redis.call('HSET', key, 'tokens', tokens, 'last_refill', now)
redis.call('EXPIRE', key, ttl)

return {allowed, tostring(wait)}
"""

# Lua script: refund one token to the bucket. Used when the outer (tier)
# bucket consumed but the inner (IP) bucket then denied, so the caller
# shouldn't be double-charged.
_REFUND_LUA = """
local key = KEYS[1]
local cap = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local cur = tonumber(redis.call('HGET', key, 'tokens'))
if cur == nil then return 0 end

local refunded = math.min(cap, cur + 1.0)
redis.call('HSET', key, 'tokens', refunded)
redis.call('EXPIRE', key, ttl)
return 1
"""


_redis_client: Any | None = None
_consume_script: Any | None = None
_refund_script: Any | None = None
_redis_init_lock = asyncio.Lock()
_redis_init_attempted = False


async def _init_redis() -> None:
    """Lazy-initialize the Redis client on first call. Safe to call repeatedly."""
    global _redis_client, _consume_script, _refund_script, _redis_init_attempted

    url = os.getenv("REDIS_URL")
    if not url:
        _redis_init_attempted = True
        return
    if redis_asyncio is None:
        logger.warning(
            "redis_module_missing",
            detail="REDIS_URL set but `redis` Python package not installed — falling back to in-process bucket",
        )
        _redis_init_attempted = True
        return

    async with _redis_init_lock:
        if _redis_init_attempted:
            return
        try:
            client = redis_asyncio.from_url(
                url,
                decode_responses=True,
                socket_connect_timeout=2.0,
                socket_timeout=2.0,
            )
            await client.ping()
            _consume_script = client.register_script(_CONSUME_LUA)
            _refund_script = client.register_script(_REFUND_LUA)
            _redis_client = client
            logger.info("rate_limit_redis_connected", url_host=url.split("@")[-1].split("/")[0])
        except Exception as exc:  # pragma: no cover — operational degradation path
            logger.warning(
                "rate_limit_redis_init_failed",
                error=str(exc),
                detail="falling back to in-process bucket for this process",
            )
        finally:
            _redis_init_attempted = True


async def _consume_redis(key: str, cap: int, refill_per_min: int, now: float) -> tuple[bool, float]:
    assert _consume_script is not None
    result = await _consume_script(keys=[key], args=[cap, refill_per_min, now, KEY_TTL_SECONDS])
    allowed = int(result[0]) == 1
    try:
        wait = float(result[1])
    except (TypeError, ValueError):
        wait = 0.0
    return allowed, wait


async def _refund_redis(key: str, cap: int) -> None:
    assert _refund_script is not None
    try:
        await _refund_script(keys=[key], args=[cap, KEY_TTL_SECONDS])
    except Exception as exc:  # pragma: no cover
        logger.warning("rate_limit_refund_failed", error=str(exc), key=key)


# ── Public API ─────────────────────────────────────────────────────

async def check(caller: Caller, ip: str | None = None) -> tuple[bool, str]:
    """Returns (allowed, reason). Reason populated only on denial.

    Dual bucket enforcement:
      • Per (tier, identifier)
      • Per-IP (prevents identifier rotation within one IP to multiply rate)

    Owner bypass honored via ``caller.rate_limit_bypass``.
    Redis is the authoritative backend when ``REDIS_URL`` is set; the
    in-process dict is used only as a single-replica fallback.
    """
    if caller.rate_limit_bypass:
        return True, ""

    await _init_redis()
    cap, refill = BUCKETS.get(caller.tier, BUCKETS[Tier.PUBLIC])
    now = time.time()
    tier_key = _key(caller)
    ip_bucket_key = _ip_key(ip) if ip else None

    if _redis_client is not None:
        # Redis path — no outer asyncio lock needed; Lua script is atomic.
        ok_tier, wait_tier = await _consume_redis(tier_key, cap, refill, now)
        if not ok_tier:
            return False, f"rate limit (tier); retry in {wait_tier:.1f}s"

        if ip_bucket_key:
            ok_ip, wait_ip = await _consume_redis(ip_bucket_key, IP_BUCKET_CAP, IP_BUCKET_REFILL_PER_MIN, now)
            if not ok_ip:
                await _refund_redis(tier_key, cap)
                return False, f"rate limit (ip); retry in {wait_ip:.1f}s"

        return True, ""

    # In-process fallback
    async with _lock:
        ok_tier, wait_tier = await _consume_local(tier_key, cap, refill, now)
        if not ok_tier:
            return False, f"rate limit (tier); retry in {wait_tier:.1f}s"

        if ip_bucket_key:
            ok_ip, wait_ip = await _consume_local(ip_bucket_key, IP_BUCKET_CAP, IP_BUCKET_REFILL_PER_MIN, now)
            if not ok_ip:
                await _refund_local(tier_key, cap)
                return False, f"rate limit (ip); retry in {wait_ip:.1f}s"

        return True, ""


async def backend_info() -> dict[str, Any]:
    """Introspection for /health endpoints — reports the active backend."""
    await _init_redis()
    return {
        "backend": "redis" if _redis_client is not None else "in_process",
        "redis_url_configured": bool(os.getenv("REDIS_URL")),
        "local_bucket_count": len(_local),
    }


async def close() -> None:
    """Graceful shutdown — closes the Redis connection if open."""
    global _redis_client, _consume_script, _refund_script, _redis_init_attempted
    if _redis_client is not None:
        try:
            await _redis_client.close()
        except Exception:  # pragma: no cover
            pass
    _redis_client = None
    _consume_script = None
    _refund_script = None
    _redis_init_attempted = False
