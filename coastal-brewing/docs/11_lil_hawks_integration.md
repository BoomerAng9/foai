# 11 — Lil_Hawks Integration (owner-driven activation)

## Architecture

Coastal-runner does not embed model providers directly. Instead it dispatches to canonical FOAI Lil_Hawks via two adapters at `scripts/adapters/lil_hawks.py`:

| Lane | Surface | Used for | Auth |
|---|---|---|---|
| Chicken Hawk gateway | `https://hawk.foai.cloud/chat` | Natural-language work — caption drafts, email drafts, product copy, daily summaries, FAQ, support classification, blog outlines | none currently (chicken-hawk `/chat` is open) |
| Sqwaadrun | `https://sqwaadrun.foai.cloud/api/mission` | Web recon — supplier due diligence, claim verification, competitor research, market watch | Bearer `SQWAADRUN_API_KEY` (`sqr_live_*` customer key) |

The Meet-the-Team roster (`lil-hawk-coder` 🦅, `lil-hawk-writer` 🪶, `lil-hawk-analyst` 📊) is exposed THROUGH chicken-hawk's `/chat` — internally routed to the appropriate dev-tier Lil_Hawk via DeerFlow 2.0. Coastal doesn't need to know which Lil_Hawk runs the work; chicken-hawk picks.

## Current state

| Item | Status |
|---|---|
| `scripts/adapters/lil_hawks.py` | ✅ shipped — adapter exists with both dispatch helpers |
| `HAWK_GATEWAY_URL` env | Default `https://hawk.foai.cloud` (already reachable, public chat endpoint) |
| `SQWAADRUN_BASE_URL` env | Default `https://sqwaadrun.foai.cloud` |
| `SQWAADRUN_API_KEY` env | NOT SET — owner needs to provision a `sqr_live_*` key |
| Wiring into `/run` flow | NOT WIRED — runner still uses filesystem placeholder for nvidia/feynman routes. Activation is a one-line swap once keys are in. |

## Activation steps (owner)

### Step 1 — provision Sqwaadrun customer key

Either:
- Visit `https://sqwaadrun.foai.cloud` → subscribe to a tier (Lil_Hawk Solo $19, Sqwaad $79, or Sqwaadrun Commander $299)
- OR (if owner) generate an admin/comp key directly via the cti-hub admin path
- Capture the `sqr_live_<hex32>` key

### Step 2 — drop into Coastal `.env`

```bash
ssh aims-vps
cd /docker/coastal-brewing

cat >> .env <<'EOF'
SQWAADRUN_API_KEY=sqr_live_...
HAWK_GATEWAY_URL=https://hawk.foai.cloud
SQWAADRUN_BASE_URL=https://sqwaadrun.foai.cloud
EOF
chmod 600 .env

docker compose up -d --force-recreate
```

### Step 3 — wire dispatch into `/run` (one-line activation)

In `scripts/api_server.py`, the existing branches in `/run`:

```python
if decision["route"] == "feynman":
    # write placeholder ticket markdown
elif decision["route"] == "nvidia":
    # write placeholder draft markdown
```

Replace with conditional dispatch:

```python
from adapters.lil_hawks import (
    dispatch_chicken_hawk, dispatch_sqwaadrun_recon,
    chicken_hawk_configured, sqwaadrun_configured,
)

if decision["route"] == "feynman":
    if sqwaadrun_configured():
        result = dispatch_sqwaadrun_recon(packet.objective or packet.task_type, depth="shallow")
        # save result.payload.markdown to research/notes/<task_id>.md
        # update audit_ledger.insert_research_receipt with real source_count + confidence
    else:
        # current filesystem placeholder behavior
        ...

elif decision["route"] == "nvidia":
    if chicken_hawk_configured():
        msg = f"{packet.task_type}: {packet.desired_output or packet.objective or '(no detail)'}"
        result = dispatch_chicken_hawk(msg)
        # save result.content to drafts/<task_id>_draft.md
        # update audit_ledger.insert_model_call_receipt with real provider + output_summary
    else:
        # current filesystem placeholder behavior
        ...
```

### Step 4 — verify

```bash
TOKEN=$(grep "^COASTAL_GATEWAY_TOKEN=" /docker/coastal-brewing/.env | cut -d= -f2)

# /run with nvidia-route packet — chicken-hawk should now produce a real draft
curl -sS -X POST https://brewing.foai.cloud/run \
  -H "Content-Type: application/json" -H "X-Coastal-Token: $TOKEN" \
  -d '{"task_id":"hawk_test_001","task_type":"draft_caption","risk_tags":[]}'

# /run with feynman-route packet — sqwaadrun should now produce a real research note
curl -sS -X POST https://brewing.foai.cloud/run \
  -H "Content-Type: application/json" -H "X-Coastal-Token: $TOKEN" \
  -d '{"task_id":"recon_test_001","task_type":"competitor_research","risk_tags":["market_watch"],"objective":"Survey direct competitor pricing for monthly coffee subscriptions in the $15-30 range"}'
```

Both should return AuditLedger rows with `provider != "placeholder"` and `confidence != "pending"` in the audit trail.

### Step 5 — `/healthz` will report

```json
{
  "lil_hawks": {
    "chicken_hawk": true,
    "chicken_hawk_url": "https://hawk.foai.cloud",
    "sqwaadrun": true,
    "sqwaadrun_url": "https://sqwaadrun.foai.cloud"
  }
}
```

(After wiring `lil_hawks.configured_summary()` into the `/healthz` handler.)

## Why NOT fix chicken-hawk's localhost dev-hawks

Chicken-hawk's compose lists `*_HAWK_URL=http://localhost:7001-7011` for 11 dev-tier services (TRAE, Coding, Agent, Flow, Sand, Memory, Graph, Back, Viz, Deep, Blend). None of those services are currently running, hence chicken-hawk's `/health` reports them all "unreachable."

Standing those up is **platform-level infrastructure work** (each is its own container), separate from Coastal's commercial readiness. Coastal doesn't need them directly — it only needs `/chat` (which chicken-hawk handles via DeerFlow 2.0 even when individual hawks are down) and `sqwaadrun.foai.cloud` (which is up and bearer-gated).

When the owner stands up the dev-hawk fleet, chicken-hawk's `/health` flips to green automatically. No Coastal-side change required.

## Cyber Squads v1.6 alignment

Per `project_cyber_squads_v1_6.md`:

- Black Squad (6 hawks) — parented by Sqwaadrun, security/pen-test, SAT-gated. Coastal won't dispatch to these.
- Blue Squad (6 hawks) — parented by Chicken Hawk, defensive/detection. Coastal won't dispatch to these directly.
- Purple/White/Gold&Platinum (20 hawks) — Crypt_Ang scope, security ops. Out of Coastal's scope.

Coastal's relationship with the Cyber Squads is INDIRECT: NemoClaw (embedded in chicken-hawk) is the policy gate; Lil_Doubt_Hawk (Paranoia) audits the platform; the rest operate on infrastructure Coastal benefits from but doesn't call.

## Operating contract

- Coastal **never** calls a specific dev-tier Lil_Hawk by name from its own code.
- All natural-language work goes through `/chat` on chicken-hawk.
- All web recon goes through Sqwaadrun's bearer-gated mission API.
- Failures fall back gracefully to filesystem placeholders so a chicken-hawk or Sqwaadrun outage doesn't take Coastal down.
