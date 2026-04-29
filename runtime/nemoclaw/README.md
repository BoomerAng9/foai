# NemoClaw — GuardAng v0.1

Risk-review and policy-enforcement layer for FOAI runtime.

Composite role per `reference_chicken_hawk_composition_2026_04_25.md`:
**Chicken Hawk = NemoClaw + autoresearch + Hermes**.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | none | liveness probe |
| `POST` | `/check` | bearer | evaluate an action proposal — verdict allow / deny / escalate |
| `POST` | `/risk-event` | bearer | record a risk event |
| `GET` | `/risk-events?limit=100&severity=high` | bearer | list recent risk events |

Bearer auth: `Authorization: Bearer $NEMOCLAW_API_KEY`.

## Verdict logic (`policy.py`)

1. `BLOCKED_ACTIONS` → **deny** (also auto-files a risk_event with severity=high)
2. `REQUIRES_OWNER_APPROVAL` without approval_id → **escalate**; with approval_id → **allow**
3. Risk tags in `ESCALATING_RISK_TAGS` and no approval_id → **escalate**
4. `ALLOWED_WITHOUT_APPROVAL` → **allow**
5. Default → **escalate** (conservative — unknown action types are not silently allowed)

## Run locally

```bash
NEMOCLAW_API_KEY=dev-key pip install -r requirements.txt
python -m uvicorn main:app --port 8081
curl -s http://localhost:8081/health
curl -sX POST http://localhost:8081/check \
  -H "Authorization: Bearer dev-key" -H "Content-Type: application/json" \
  -d '{"action_type":"create_draft","risk_tags":[]}'
```

## Deploy on aims-vps

```bash
# Create the shared internal network once
docker network create foai-internal 2>/dev/null || true

# Deploy
cd /docker/nemoclaw
docker compose up -d
docker logs nemoclaw -f
```

## How callers integrate

Coastal runner, chicken-hawk service, or any FOAI executor sends:

```http
POST /check
Authorization: Bearer $NEMOCLAW_API_KEY
Content-Type: application/json

{
  "action_type": "submit_supplier_order",
  "risk_tags": ["money", "supplier_change"],
  "approval_id": "appr_2026_001",     // optional
  "actor": "coastal-runner",
  "metadata": {"task_id": "task_001"}
}
```

Receives:

```json
{
  "check_id": "chk_<hex>",
  "verdict": "allow",
  "reason": "...",
  "basis": "REQUIRES_OWNER_APPROVAL_satisfied",
  "decided_at": "..."
}
```

Caller MUST refuse the action when verdict ≠ "allow".

## Future (not in v0)

- Hermes integration: validate `approval_id` against Hermes `approval_receipts` table
- Per-actor rate limiting
- Policy versioning (capture which policy-version made the verdict)
- Cloud Run deploy alongside Hermes / TTD-DR / chicken-hawk
- Cyber Squads v1.6 components (Tri-Factor Identity, SNR Throttling, ZKP-TS, Phoenix Protocol)
