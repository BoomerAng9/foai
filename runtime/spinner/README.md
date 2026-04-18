# runtime/spinner — Python service (partial migration)

> **Partial migration in progress.** This PR commits `rate_limit.py` +
> `requirements.txt` + this README as the Gate 1b scope — the Redis
> upgrade for the rate-limit backend. The rest of the Spinner runtime
> (main.py / auth.py / auth_verify.py / mesh_auth.py / policy.py /
> audit.py / classifier.py / Dockerfile / setup.sh / tests/) lives on
> myclaw-vps today and in a local stash; it will land in a follow-up
> PR under the same discipline pattern that `runtime/ttd-dr/` used at
> PR #195.

## What this PR delivers (Gate 1b)

`rate_limit.py` now dual-backs the token bucket:

- **Redis (authoritative when `REDIS_URL` is set).** Single Lua
  script handles the consume + refill atomically in one round trip,
  so horizontally-scaled replicas share one source of truth per
  `(tier, identifier)` and per `ip` key. Refunds the tier bucket
  when the IP bucket denies — caller isn't double-charged.
- **In-process dict (fallback when `REDIS_URL` absent).** Preserves
  the original single-replica behavior. Logs a warning when the
  Redis module is missing but `REDIS_URL` is set.

**Pre-2026-04-18 risk resolved:** the prior implementation silently
used the in-process dict even when the service scaled out, so each
replica had its own bucket. This module now refuses to silently ignore
horizontal-scale risk; backend selection is explicit + observable.

## Key scheme

- Tier bucket: `spinner:rate:tier:{tier_value}:{identifier}`
- IP bucket: `spinner:rate:ip:{ip}`
- TTL: 1 hour of inactivity

## Public API

```python
from rate_limit import check, backend_info, close

allowed, reason = await check(caller, ip=request.client.host)
info = await backend_info()                 # for /health probes
await close()                               # on shutdown
```

## Env

| Var | Required | Notes |
|---|---|---|
| `REDIS_URL` | no | Upstash / self-hosted Redis connection URL. Absent → in-process fallback. |

## Canon references

- Gate 1b of `project_deploy_docs_arbitration_2026_04_17.md`
- `project_session_delta_2026_04_17_18_20pr_wave.md` — full context
- `runtime/ttd-dr/` — the migration pattern the rest of this service will follow
