# Claude Code Build Prompt: Coastal Brewing One Direction Setup

You are creating the Coastal Brewing virtual coffee and tea company operating system from zero.

Do not inspect for audit first. Create the system.

## Source package

Use this package as the single source of direction. It merges the NVIDIA model-router path and the Feynman research path into one architecture.

## Build objective

Create a working virtual-company repo where:

1. ACHEEVY receives owner goals and creates task packets.
2. The route engine sends evidence tasks to Feynman.
3. The route engine sends low-risk generation/classification tasks to NVIDIA.
4. High-risk tasks require Chicken_Hawk review and owner approval.
5. Hermes logs receipts for model calls, research outputs, approvals, and actions.
6. OpenClaw executes only approved low-risk or owner-approved actions.
7. Boomer_Ang departments handle ops, CX, marketing, growth, finance, and quality.
8. The company launches with supplier fulfillment first, no roaster purchase, and no brick-and-mortar overhead.

## Build in this order

### 1. Repo foundation

Create or update these folders:

```text
agents/
automations/n8n/
configs/
docs/
examples/task_packets/
hermes/
memory/
openclaw/
prompts/
receipts/
scripts/
shopify/
storefront/
templates/
```

### 2. Environment

Copy `configs/env.example` to `.env.local` and leave secrets blank.

Do not invent API keys.

### 3. Model router

Implement the route logic from:

```text
configs/model_router.yaml
scripts/model_router.py
```

NVIDIA is the default for low-risk, high-volume work:

- caption drafts
- support classification
- content variants
- daily summaries
- review clustering
- FAQ drafts
- outreach drafts

Premium/owner lane is required for:

- final public claims
- organic/fair-trade claims
- health or FDA claims
- supplier changes
- refunds above threshold
- money movement
- legal filings
- contracts

### 4. Feynman lane

Install or wire Feynman as a local CLI or sidecar. Use:

```text
research/feynman/ONE_DIRECTION_FEYNMAN_SETUP.md
scripts/create_feynman_ticket.py
```

Feynman handles:

- supplier due diligence
- claim verification
- market watch
- competitor research
- product evidence packets
- public-copy research review

### 5. Hermes memory

Apply:

```text
memory/hermes_one_direction_schema.sql
```

Every task should produce a receipt row or receipt file.

### 6. OpenClaw execution

Wire OpenClaw to execute only approved actions from:

```text
openclaw/action_policy.yaml
```

### 7. n8n workflows

Create workflows from:

```text
automations/n8n/*.json
```

Start in manual/test mode.

### 8. Shopify/commerce

Use the starter product CSV and policy templates. Do not publish claims until Feynman produces proof and Chicken_Hawk approves the wording.

### 9. Dry-run tasks

Run:

```bash
python scripts/one_direction_smoke_test.py
python scripts/run_task_packet.py examples/task_packets/verify_organic_claim.json --dry-run
python scripts/run_task_packet.py examples/task_packets/bulk_caption_drafts.json --dry-run
python scripts/run_task_packet.py examples/task_packets/supplier_due_diligence.json --dry-run
```

### 10. Build receipt

Create:

```text
receipts/BUILD_RECEIPT.md
```

Include what was created, what is still manual, which credentials are missing, and which workflows are ready for test mode.

## Required output back to owner

Return:

1. Created file tree.
2. Environment variables still needed.
3. Workflows imported.
4. First three test task-packet results.
5. Any owner actions required.
6. Anything blocked by missing credentials.
