# Coastal Brewing — virtual coffee & tea company OS

A 100% virtual, AI-managed coffee and tea company. Local-first scaffolding plus a containerized FastAPI runner deployable behind nginx on the AIMS VPS at `brewing.foai.cloud`.

## What this is

- One-direction architecture: owner intent → ACHEEVY → task packet → route → Boomer_Ang → Chicken_Hawk review → AuditLedger receipt → OpenClaw execution.
- Three model lanes: NVIDIA (low-cost drafts), Feynman (verification + research), premium/owner (high-judgment).
- Paperclip control plane: org chart, agent budgets, governance, issue threads, and workforce audit for the AI company.
- Fulfillment via Stepper (Taskade-backed workflows) with owner approval on every customer-visible action.
- Storefront strategy: hold for **Hostinger Ecommerce** (planned). Until then, intake + checkout flow through Stepper forms with manual supplier fulfillment.
- No Shopify. No third-party storefront platform.

## What this is not

- Not a SaaS platform.
- Not an audit tool.
- Not a Shopify build.
- Not a live integration with NVIDIA, Feynman, Taskade, supplier, or Hostinger Ecommerce until the owner provisions keys and approves go-live.

## Architecture

```
owner intent
  → ACHEEVY (sole router)
    → task packet
      → route engine (configs/model_router.yaml)
        → feynman   (verification, research, public-claim substantiation)
        → nvidia    (drafts, classification, summaries)
        → owner     (final approvals, money, supplier, public claims)
        → premium_review (high-judgment fallback)
    → Boomer_Ang department output
    → Chicken_Hawk risk review
    → AuditLedger receipt (memory/audit_ledger_schema.sql)
    → OpenClaw execution (openclaw/action_policy.yaml)
```

See `docs/01_unified_architecture.md`.

## Deployment posture

| Layer | Where | How |
|---|---|---|
| Runner | aims-vps Docker container | `coastal-runner` on `127.0.0.1:8080` |
| TLS termination | aims-vps nginx | server block `brewing.foai.cloud` + certbot |
| Routing engine | inside container | FastAPI shim wrapping kit scripts |
| Workforce control plane | aims-vps Docker container | Paperclip `v2026.427.0` on `127.0.0.1:3100`, backed by Paperclip-owned Postgres |
| Fulfillment workflows | Taskade (Stepper) | webhooks into runner `/run` and `/approve` |
| Billing (future) | cti-hub Stripe via stepper-billing-proxy | extend `product` discriminator with `'coastal-brewing'` |
| Storefront (future) | Hostinger Ecommerce | placeholder env vars wired |
| Secrets vault | myclaw-vps openclaw | relayed to aims-vps `.env` at deploy time |

Paperclip is intentionally separate from Coastal AuditLedger in this pass. It gets its own Postgres database for control-plane state; `coastal-runner` continues using `sqlite:///audit_ledger/coastal_brewing.db` until the AuditLedger adapter is explicitly migrated.

## Setup (local Phase 0)

```bash
cd ~/foai/coastal-brewing
python3 -m pip install --user pyyaml requests
cp configs/env.example .env.local        # leave secrets blank for local
python3 scripts/one_direction_smoke_test.py
python3 scripts/run_task_packet.py examples/task_packets/verify_organic_claim.json --dry-run
```

For the Paperclip control-plane deployment, see `docs/13_paperclip_control_plane.md`.

## Runner endpoints (when deployed)

All POST endpoints require `X-Coastal-Token: $COASTAL_GATEWAY_TOKEN`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/healthz` | liveness probe (no auth) |
| `POST` | `/route` | return routing decision for a task packet |
| `POST` | `/run` | route + write receipt + write route placeholder |
| `POST` | `/approve` | record owner approval decision |

## How to run smoke tests

```bash
python3 scripts/one_direction_smoke_test.py
```

## How to run a task packet (dry-run)

```bash
python3 scripts/run_task_packet.py examples/task_packets/verify_organic_claim.json --dry-run
```

## How fulfillment works (Phase 0 / pre-Hostinger Ecommerce)

See `docs/05_fulfillment_setup.md` and `fulfillment/README.md`. Short version:

1. Customer fills a Taskade-hosted intake form (Stepper).
2. Stepper webhooks into `https://brewing.foai.cloud/run` with a fulfillment task packet.
3. Router decides: low-risk → nvidia draft for confirmation copy; high-risk → owner approval.
4. Owner approves the supplier order (drafted from `templates/supplier_certification_request.md`).
5. Manual supplier email until owner authorizes a live send.
6. Customer confirmation routed back through Stepper.
7. Every step lands in AuditLedger as a receipt.

When Hostinger Ecommerce launches, the storefront layer migrates per `docs/08_hostinger_ecommerce_path.md`. The runner and Stepper backbone stay.

## Owner approval boundaries

See `docs/04_owner_approval_boundaries.md`. Short version: anything that publishes, sends, orders, refunds, claims, spends, or signs requires an `approval_required=true` row in AuditLedger with `decision='approved'` before OpenClaw executes.

## Layout

```
coastal-brewing/
├── README.md
├── PROJECT_BRIEF.md
├── CREATE_WITH_CLAUDE_CODE.md
├── docker-compose.yml
├── requirements.txt
├── configs/
│   ├── agent_roster.yaml
│   ├── env.example
│   └── model_router.yaml
├── scripts/
│   ├── api_server.py
│   ├── model_router.py
│   ├── run_task_packet.py
│   ├── create_feynman_ticket.py
│   └── one_direction_smoke_test.py
├── examples/task_packets/      # 4 packets
├── agents/prompts/             # 10 role prompts
├── memory/audit_ledger_schema.sql
├── openclaw/action_policy.yaml
├── automations/n8n/            # 6 workflow skeletons (topology reference; actual workflows live in Taskade)
├── fulfillment/                # Stepper-based fulfillment specs
│   ├── README.md
│   └── stepper_workflows/
├── storefront/                 # placeholder for Hostinger Ecommerce migration
├── research/feynman/           # research lane setup
├── docs/                       # system docs and deployment runbooks
├── templates/                  # 7 templates
├── receipts/                   # runtime — AuditLedger receipts
├── drafts/                     # runtime — NVIDIA drafts
├── owner_approvals/            # runtime — approval requests
└── audit_ledger/               # runtime — SQLite
```

## Operating contract

This system does not publish, send, order, refund, or spend without an owner-approval row in AuditLedger. If any agent appears to bypass that, file a `risk_events` row with severity `critical` immediately.
