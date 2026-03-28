---
name: hawk-dispatch
description: Lil_Hawk selection, health checking, retry logic, and execution lifecycle.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# Hawk Dispatch — Execution Lifecycle

Use this skill when building or modifying how Chicken Hawk dispatches tasks
to Lil_Hawks, handles failures, and manages the execution lifecycle.

## Dispatch Lifecycle

```
Classification Complete (hawk selected)
    │
    ▼
┌──────────────────┐
│ Health Check      │ ── GET {hawk}/health
│ (pre-flight)      │
└────────┬─────────┘
         │
    healthy? ───── no ──→ Fallback Hawk
         │
         ▼
┌──────────────────┐
│ POST {hawk}/run  │ ── Send task payload
│ (with timeout)    │
└────────┬─────────┘
         │
    success? ───── no ──→ Retry (2 attempts, exponential backoff)
         │                        │
         ▼                   still failing?
┌──────────────────┐              │
│ Review Gate      │         Escalate to
│ (validate output)│         Lil_Deep_Hawk
└────────┬─────────┘
         │
         ▼
    Return to user / ACHEEVY
```

## Hawk Endpoint Contract

Every Lil_Hawk exposes two endpoints:

### Health Check
```
GET /health
Response 200: { "status": "ok", "hawk": "Lil_TRAE_Hawk" }
Response 503: { "status": "degraded", "reason": "..." }
```

### Task Execution
```
POST /run
Content-Type: application/json

Request:
{
  "message": "User's task description",
  "context": { ... },       // optional prior context
  "trace_id": "trace-abc",
  "pcp_id": "PCP-2f8k1a"   // if dispatched from ACHEEVY
}

Response 200:
{
  "content": "Result text or structured output",
  "hawk": "Lil_TRAE_Hawk",
  "trace_id": "trace-abc",
  "elapsed_ms": 4523,
  "metadata": { ... }
}
```

## Hawk Configuration

Each hawk's config in `config/lil_hawks.yml`:

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | What this hawk does |
| `internal_port` | int | Docker network port |
| `health_path` | string | Health check endpoint path |
| `run_path` | string | Task execution endpoint path |
| `timeout_seconds` | int | Max wait before timeout |
| `requires_approval` | bool | Needs user confirmation before executing (Lil_Coding_Hawk) |
| `sandboxed` | bool | Runs in isolated container (Lil_Sand_Hawk) |
| `is_super_agent` | bool | Can orchestrate other hawks (Lil_Deep_Hawk) |

## Timeout Configuration

| Hawk | Timeout | Reason |
|------|---------|--------|
| Lil_TRAE_Hawk | 120s | Large refactors take time |
| Lil_Coding_Hawk | 120s | Plan + approval + execution |
| Lil_Agent_Hawk | 90s | OS/browser tasks |
| Lil_Flow_Hawk | 60s | Webhook-based, fast turnaround |
| Lil_Sand_Hawk | 60s | Sandboxed, capped execution |
| Lil_Memory_Hawk | 30s | RAG retrieval is fast |
| Lil_Graph_Hawk | 120s | Multi-step stateful workflows |
| Lil_Back_Hawk | 90s | Scaffolding + schema generation |
| Lil_Viz_Hawk | 30s | Dashboard queries |
| Lil_Blend_Hawk | 180s | 3D rendering can be slow |
| Lil_Deep_Hawk | 300s | SuperAgent — orchestrates squads |

## Retry Policy

```python
# Classification retries
@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def _classify_intent(message: str) -> RoutingDecision

# Dispatch retries
@retry(stop=stop_after_attempt(2), wait=wait_exponential(min=1, max=5))
async def _dispatch_to_hawk(hawk: HawkRole, message: str) -> HawkResponse
```

If all retries fail:
1. Log the failure with trace ID and error details
2. Attempt dispatch to Lil_Deep_Hawk as fallback (it can handle anything)
3. If Deep_Hawk also fails, return error to caller with explanation

## Approval Gate (Lil_Coding_Hawk)

When `requires_approval: true`:
1. Lil_Coding_Hawk generates a **plan** first (not code)
2. Plan is returned to the user for review
3. User approves or requests changes
4. Only after approval does execution proceed
5. This prevents unreviewed code from being committed

## Sandbox Isolation (Lil_Sand_Hawk)

When `sandboxed: true`:
- Code runs inside a Docker container with dropped capabilities
- Max 60-second execution time
- Read-only filesystem (except workspace volume)
- Supports: Python, JavaScript, TypeScript, Bash, Go, Rust
- No network access from sandbox by default

## Fleet Health Monitoring

`GET /health` aggregates all hawk statuses:

```json
{
  "status": "ok",           // "ok" or "degraded"
  "hawks": {
    "Lil_TRAE_Hawk": "ok",
    "Lil_Coding_Hawk": "ok",
    "Lil_Sand_Hawk": "degraded",
    ...
  },
  "healthy_count": 10,
  "total_count": 11
}
```

If any hawk is unhealthy, gateway status is "degraded" (not "down" — remaining hawks still work).

## Reference Files

- `gateway/main.py` — FastAPI endpoints including `/health`
- `gateway/router.py` — Dispatch logic with retry policies
- `config/lil_hawks.yml` — Hawk endpoint registry
- `docker-compose.yml` — Fleet service definitions
