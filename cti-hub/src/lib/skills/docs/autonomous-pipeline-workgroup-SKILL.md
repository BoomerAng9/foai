---
name: autonomous-pipeline-workgroup
description: Design and deploy autonomous multi-agent pipeline workgroups for any business automation use case. Use this skill whenever the user needs to build a scraping-to-sales pipeline, agentic outreach system, autonomous inventory/course/product pipeline, scheduled data population workflow, partnership automation, or any multi-stage loop where agents scout, qualify, outreach, secure, populate, sell, and reconcile — governed by Chicken Hawk via Telegram and orchestrated through NemoClaw + Hermes Agent + Auto Research, built on Anthropic's Harness 2.0 architecture (Planner → Generator → Evaluator). Also trigger when the user mentions Stepper, Paperform automation, workgroup design, agent scheduling, harness design, or pipeline architecture using the ACHIEVEMOR agent ecosystem (Chicken Hawk, ACHEEVY, Boomer_Angs, Lil_Hawks).
---

# Autonomous Pipeline Workgroup Skill

Build any autonomous multi-agent pipeline — from discovery to delivery to reconciliation — using the ACHIEVEMOR agent ecosystem, Anthropic's Harness 2.0 architecture, Paperform/Stepper workflow automation, and Telegram-governed command & control.

This skill generalizes the pattern. The Course Acceleration Pipeline was the first implementation. Every future pipeline (product sourcing, talent recruitment, content syndication, lead generation, inventory arbitrage, etc.) follows the same 7-stage loop with the same agent hierarchy, governed by the Harness 2.0 Planner → Generator → Evaluator structure.

---

## AGENT HIERARCHY (Non-Negotiable for All Pipelines)

Every pipeline workgroup uses this exact command chain:

```
CHICKEN HAWK (Commander)
│  └── Interface: Telegram
│  └── Controls: NemoClaw Framework + Hermes Agent
│  └── Authority: Final approval, budget ceilings, override, pause/resume
│
├── ACHEEVY (Orchestrator)
│  └── Interface: Pipeline state machine
│  └── Controls: Boomer_Angs + Lil_Hawks
│  └── Authority: Auto-decides within pre-approved bounds, escalates edge cases
│  └── Uses: Auto Research for market intelligence and scoring
│
├── BOOMER_ANGS (Scout Minions)
│  └── Role: Scrape, monitor, detect, feed raw data upstream
│  └── Authority: Zero decision-making — pure execution
│  └── Scaling: Horizontally scalable (add more as volume grows)
│
└── LIL_HAWKS (Operations Minions)
   └── Role: Outreach, populate, track attribution, manage schedules
   └── Authority: Zero decision-making — pure execution
   └── Scaling: Horizontally scalable (add more as volume grows)
```

### Framework Layer

- **Harness 2.0 (Anthropic Architecture)**: The governing pattern for all pipeline workgroups. Based on Anthropic's March 2026 agent harness research. Implements the Planner → Generator → Evaluator multi-agent structure. In our pipelines: ACHEEVY = Planner (decomposes work, qualifies, scores, sets strategy), Boomer_Angs + Lil_Hawks = Generators (scrape, outreach, populate, transact), Chicken Hawk = Evaluator (approves, rejects, reviews quality via Telegram). Key principles applied:
  - Decompose work into tractable chunks (each pipeline stage is a bounded task)
  - Structured artifacts for context handoff between stages (pipeline state, partnership records, reconciliation ledger)
  - Context resets between stages (each agent starts with clean state + handoff artifact, not full history)
  - Progress tracking via data store records (equivalent to claude-progress.txt)
  - Self-evaluation problem solved by separating Generator (minions) from Evaluator (Chicken Hawk) — agents never grade their own work
- **NemoClaw**: Agent framework managing task queues, retries, error handling, state persistence. Controlled by Chicken Hawk. Serves as the harness runtime executing the Planner → Generator → Evaluator loop.
- **Hermes Agent**: Messaging agent handling Telegram bot, email delivery (outreach sequences), webhook routing, notifications.
- **Auto Research**: Research agent providing market intelligence, competitor analysis, demand signals, scoring data for ACHEEVY's qualification engine.

---

## HARNESS 2.0 ARCHITECTURE (Anthropic Pattern — March 2026)

Every ACHIEVEMOR pipeline workgroup is built on Anthropic's Harness 2.0 design philosophy. The harness is NOT the model — it's the scaffolding around the model that determines whether agents succeed or fail in production.

### Core Principle
"Find the simplest solution possible, and only increase complexity when needed." The harness constrains what agents can do, informs them about what they should do, verifies their work, corrects their mistakes, and keeps humans in the loop at high-stakes decision points.

### The 3-Role Mapping (GAN-Inspired)

```
PLANNER (ACHEEVY)
│  Decomposes pipeline into bounded stages
│  Expands high-level user intent into specific, scorable requirements
│  Sets qualification criteria, deal bounds, scheduling parameters
│  Generates structured artifacts for stage-to-stage handoff
│
GENERATOR (Boomer_Angs + Lil_Hawks)
│  Executes each stage within the constraints set by the Planner
│  Produces outputs: scraped data, outreach emails, listings, transactions
│  Zero decision authority — operates strictly within bounds
│  Multiple generators can run in parallel (horizontal scaling)
│
EVALUATOR (Chicken Hawk via Telegram)
   Reviews flagged items and edge cases
   Approves or rejects partnership deals outside auto-bounds
   Receives weekly performance summaries
   Has kill-switch authority over entire pipeline
   Never the same agent that generated the work (solves self-eval problem)
```

### Harness Design Principles Applied

1. **Structured Artifacts for Handoff**: Each pipeline stage produces a typed output record (manifest, qualified list, outreach log, deal record, listing, transaction, ledger) that the next stage consumes. No ambient context — clean handoff only.

2. **Context Resets, Not Compaction**: Each stage starts fresh with only its handoff artifact. Agents don't carry full pipeline history. This prevents context anxiety and keeps each stage focused.

3. **Progress Tracking**: Pipeline state is persisted in the data store (Google Sheets, Airtable, or PostgreSQL). Equivalent to Anthropic's `claude-progress.txt` — any agent can pick up where another left off.

4. **Generator ≠ Evaluator**: Boomer_Angs and Lil_Hawks never evaluate their own output. ACHEEVY scores (Planner evaluation), Chicken Hawk approves (human-in-the-loop evaluation). This solves the self-evaluation problem Anthropic identified where agents confidently praise mediocre work.

5. **Bounded Autonomy**: ACHEEVY auto-decides within pre-approved bounds. Outside bounds → escalates to Chicken Hawk. This is the harness controlling what's allowed vs. what requires human intervention.

6. **Iterative Improvement Loop**: RECONCILE (Stage 07) feeds performance data back into QUALIFY (Stage 02), updating the scoring model. The harness gets smarter with each cycle — same agents, better scaffolding.

---

## THE 7-STAGE PIPELINE PATTERN

Every autonomous pipeline follows these 7 stages. Adapt the specifics to the domain — the structure never changes.

### Stage 01: SCOUT
- **Agent**: Boomer_Angs
- **Pattern**: Scrape target platforms on a cron schedule. Detect inventory, availability, pricing, or opportunity signals.
- **Output**: Raw manifest of discovered items (title, source, price, availability, URL, category, metadata).
- **Automation**: Runs on configurable cron (default: every 6 hours). Rate-limited per platform. Deduplication against existing inventory.
- **Stepper Integration**: Trigger = Scheduled (cron). Action = HTTP request to scrape endpoint. Output feeds into data store (Google Sheets, Airtable, or direct API).

### Stage 02: QUALIFY
- **Agent**: ACHEEVY + Auto Research
- **Pattern**: Score each discovered item on a viability matrix. Dimensions vary by domain but always include: demand signal, margin potential, audience fit, competition density.
- **Output**: Qualified list with viability score (0-100), recommended action, target segment tag.
- **Automation**: Auto-qualifies items scoring 65+. Flags 40-64 for Chicken Hawk review via Telegram. Rejects below 40 silently.
- **Stepper Integration**: Trigger = New row in data store. Action = AI step (scoring prompt). Conditional branch on score threshold. Action = Telegram notification for flagged items.

### Stage 03: OUTREACH
- **Agent**: Lil_Hawks + Hermes Agent
- **Pattern**: Generate and send personalized partnership/outreach communications to source providers. Multi-touch sequence with escalation.
- **Output**: Outreach log: provider, contact, message sent, follow-up schedule, response status.
- **Automation**: Auto-sends on qualification. 3-touch sequence: intro (Day 0), value prop follow-up (Day 3), final ask (Day 7). Template changes require Chicken Hawk approval.
- **Stepper Integration**: Trigger = Item qualified (score ≥ 65). Action = Gmail send (personalized template). Delay step (3 days). Action = Follow-up send. Delay step (4 days). Action = Final send.

### Stage 04: SECURE
- **Agent**: ACHEEVY
- **Pattern**: When a provider responds positively, negotiate/finalize terms within pre-approved bounds. Generate tracking identifiers.
- **Output**: Partnership/deal record: provider, terms, window start/end, allocation, tracking code, payment terms.
- **Automation**: Auto-accepts deals within pre-set bounds (configurable per pipeline). Escalates edge cases to Chicken Hawk via Telegram.
- **Stepper Integration**: Trigger = Positive response detected (email reply parsing or form submission). Action = Generate deal record. Conditional = Within bounds? → Auto-accept. Outside bounds? → Telegram approval request.

### Stage 05: POPULATE
- **Agent**: Lil_Hawks
- **Pattern**: Auto-generate listing/catalog entries on the target storefront or website. Each entry gets a unique tracking slug and time-bound display window.
- **Output**: Live listings with tracking integration, countdown timers, and buy/action links.
- **Automation**: Auto-publishes on window start. Auto-removes on window end, sellout, or partner cancellation. Zero manual cleanup.
- **Stepper Integration**: Trigger = Deal secured. Action = Create product/listing via Shopify API, Webflow CMS, or website API. Delayed trigger = Window end → Remove listing.

### Stage 06: SELL / CONVERT
- **Agent**: Lil_Hawks
- **Pattern**: Process transactions through the commerce platform (Shopify, Stripe, etc.). Track attribution via referral codes embedded in URLs.
- **Output**: Transaction record: order ID, item, buyer, revenue, margin, partner payout, referral code.
- **Automation**: Fully automated via commerce platform webhooks. No cookies needed — referral codes persist through checkout.
- **Stepper Integration**: Trigger = Shopify webhook (order created). Action = Log attribution to data store. Action = Update inventory count.

### Stage 07: RECONCILE
- **Agent**: ACHEEVY
- **Pattern**: Reconcile transactions against partnership terms. Calculate payouts, margins, and performance scores. Feed performance data back into Stage 02 (QUALIFY) to improve future scoring.
- **Output**: Reconciliation ledger: total sales, partner payouts, net margin, top performers, underperformers, scoring model updates.
- **Automation**: Runs daily. Weekly summary pushed to Chicken Hawk via Telegram. Monthly partner payout trigger.
- **Stepper Integration**: Trigger = Scheduled (daily). Action = Aggregate sales data. Action = Calculate payouts. Action = Update scoring model. Action = Telegram summary (weekly).

```
SCOUT → QUALIFY → OUTREACH → SECURE → POPULATE → SELL → RECONCILE
  ↑                                                            │
  └────────────── Performance data feeds back ─────────────────┘
```

---

## ATTRIBUTION TRACKING MODEL (No Cookies)

Every pipeline uses referral codes, not cookies. This is cleaner, GDPR-safe, and works across domains.

### URL Structure
```
[STOREFRONT_URL]/[ITEM_SLUG]?ref=ACMR-[PARTNER_CODE]-[ITEM_ID]
```

### Components
- `ACMR` = ACHIEVEMOR attribution prefix (constant)
- `PARTNER_CODE` = Partner identifier (e.g., UDEMY, COURSERA, VENDOR-42)
- `ITEM_ID` = Internal item identifier

### Flow
1. User clicks item on listing page (e.g., cti.foi.cloud)
2. Redirected to storefront with ref parameter in URL
3. Commerce platform captures ref as order tag/metadata
4. Webhook fires on purchase → logs sale with partner attribution
5. ACHEEVY reconciles: this sale = this partner = this margin

### Why Not Cookies
- No GDPR consent banner needed
- No cross-domain tracking issues
- No expiry problems
- Referral code persists through entire checkout flow
- Works on mobile, desktop, in-app browsers — everywhere

---

## STEPPER WORKFLOW ARCHITECTURE

Stepper (by Paperform) is the workflow automation layer. It connects triggers to actions across the pipeline.

### Key Stepper Concepts for This Skill
- **Step**: A single action (send email, update CRM, post Slack message, HTTP request)
- **Component**: A reusable set of steps. Build once, drop into any workflow. Our pipeline stages become Stepper Components.
- **Trigger**: What starts a workflow (scheduled cron, webhook, form submission, new row in data store, email received)
- **Credits**: Stepper tokens for AI steps, email sends, premium APIs. Workflows auto-pause if credits run out.
- **MCP Integration**: Stepper exposes authenticated toolkits to AI agents via MCP — this is how NemoClaw and ACHEEVY can trigger Stepper workflows programmatically.

### Component Library (Build Once, Reuse Across All Pipelines)

| Component Name | Stages Used In | What It Does |
|---|---|---|
| `scout-scraper` | 01 | Scheduled HTTP scrape → parse → deduplicate → store |
| `qualify-scorer` | 02 | AI scoring prompt → threshold check → route |
| `outreach-sequence` | 03 | 3-touch email sequence with delays and response detection |
| `deal-negotiator` | 04 | Terms validation → auto-accept or escalate |
| `listing-publisher` | 05 | Create listing → set timer → auto-remove on expiry |
| `attribution-logger` | 06 | Webhook capture → parse ref code → log to data store |
| `reconciliation-engine` | 07 | Aggregate → calculate → report → feedback loop |
| `telegram-escalation` | 02, 04, 07 | Send formatted message to Chicken Hawk with action buttons |

### Stepper Workflow Template (Per Pipeline)

```
Workflow: [PIPELINE_NAME]-loop
  Trigger 1: Schedule (every 6 hours)
    → Component: scout-scraper
    → Component: qualify-scorer
    → Branch: score ≥ 65 → Component: outreach-sequence
    → Branch: score 40-64 → Component: telegram-escalation

  Trigger 2: Webhook (partner response)
    → Component: deal-negotiator
    → Branch: within bounds → Component: listing-publisher
    → Branch: outside bounds → Component: telegram-escalation

  Trigger 3: Webhook (commerce platform order)
    → Component: attribution-logger

  Trigger 4: Schedule (daily)
    → Component: reconciliation-engine
    → Action: Update qualify-scorer weights (feedback loop → Stage 02)
    → Branch: weekly → Component: telegram-escalation (summary)
```

---

## TELEGRAM COMMAND INTERFACE (Chicken Hawk)

Every pipeline exposes these commands to Chicken Hawk via Hermes Agent:

| Command | Action |
|---|---|
| `/status` | Pipeline status + active listings count |
| `/approve [id]` | Approve flagged item/partnership |
| `/reject [id]` | Reject flagged item/partnership |
| `/pause` | Pause all outreach and new listings |
| `/resume` | Resume pipeline |
| `/bounds` | View or set qualification/deal bounds |
| `/report` | On-demand performance report |
| `/kill [listing_id]` | Force-remove a specific listing |
| `/agents` | Show agent status (Boomer_Angs online, Lil_Hawks active, etc.) |
| `/config [key] [value]` | Update pipeline configuration |

---

## SCHEDULING DEFAULTS

| Frequency | Task | Agent |
|---|---|---|
| Every 6h | Scout/scrape target platforms | Boomer_Angs |
| Every 6h | Score and qualify new items | ACHEEVY |
| On qualify (score ≥ 65) | Send outreach | Lil_Hawks |
| Day 3 / Day 7 | Follow-up sequence | Lil_Hawks |
| On partner accept | Finalize terms, generate tracking code | ACHEEVY |
| On promo window start | Publish listing | Lil_Hawks |
| On promo window end | Auto-remove listing | Lil_Hawks |
| On sale/conversion | Log attribution | Lil_Hawks |
| Daily | Reconcile sales, update scores | ACHEEVY |
| Weekly | Summary report to Chicken Hawk (via Hermes Agent) | ACHEEVY |
| Monthly | Partner payout trigger | ACHEEVY |

All schedules are configurable per pipeline instance.

---

## LISTING LIFECYCLE

Items listed by the pipeline follow this lifecycle:

```
UNPUBLISHED → SCHEDULED → LIVE → [SOLD OUT | EXPIRED | CANCELLED] → ARCHIVED
```

- **UNPUBLISHED**: Deal secured, listing generated, waiting for promo window
- **SCHEDULED**: Promo window set, countdown active
- **LIVE**: Visible on storefront, buyable, countdown running
- **SOLD OUT**: All allocated units sold → auto-removed from storefront
- **EXPIRED**: Promo window ended → auto-removed from storefront
- **CANCELLED**: Partner cancelled or Chicken Hawk killed → auto-removed
- **ARCHIVED**: Retained in data store for reconciliation and scoring feedback

---

## HOW TO ADAPT THIS TO A NEW USE CASE

When building a new pipeline, fill in this template:

```
PIPELINE NAME: [e.g., Course Acceleration, Product Sourcing, Talent Pipeline]
TARGET PLATFORMS: [What Boomer_Angs scrape — URLs, APIs, marketplaces]
ITEM TYPE: [What's being discovered — courses, products, candidates, leads]
QUALIFICATION CRITERIA: [What ACHEEVY scores on — demand, margin, fit, competition]
OUTREACH TARGET: [Who Lil_Hawks contact — vendors, schools, recruiters, partners]
DEAL STRUCTURE: [What gets negotiated — discount %, commission, referral fee]
STOREFRONT: [Where items are listed — Shopify, website, marketplace]
COMMERCE PLATFORM: [Where transactions happen — Shopify, Stripe, custom]
TRACKING URL PATTERN: [STOREFRONT]/[SLUG]?ref=ACMR-[PARTNER]-[ITEM_ID]
LISTING PAGE: [Where discounted/promoted items appear — e.g., cti.foi.cloud/discounted-courses]
PROMO WINDOW: [How long items stay listed — hours, days, until sold out]
RECONCILIATION CYCLE: [Daily, weekly, per-event]
CHICKEN HAWK BOUNDS: [Pre-approved limits for auto-decisions]
```

### Example Adaptations

**Course Acceleration** (Reference Implementation)
- Scout: Udemy, Coursera, Skillshare, college extensions
- Item: Unsold course seats
- Qualify: Demand signal + margin potential + audience fit
- Outreach: Course providers for discount partnerships
- Storefront: learn2achievemor.us (Shopify)
- Listing Page: cti.foi.cloud/discounted-courses

**Product Sourcing Pipeline**
- Scout: Alibaba, wholesale marketplaces, liquidation sites
- Item: Discounted/clearance products
- Qualify: Margin potential + demand + shipping feasibility
- Outreach: Suppliers for bulk pricing
- Storefront: Shopify store
- Listing Page: Company website /deals

**Talent Recruitment Pipeline**
- Scout: LinkedIn, Indeed, GitHub, portfolio sites
- Item: Candidates matching open roles
- Qualify: Skill match + culture fit + availability + salary range
- Outreach: Candidates for interviews
- Storefront: ATS (Applicant Tracking System)
- Listing Page: Careers page with open positions

**Content Syndication Pipeline**
- Scout: RSS feeds, news APIs, social media
- Item: Content opportunities (guest posts, syndication slots)
- Qualify: Audience overlap + domain authority + content fit
- Outreach: Publishers for syndication partnerships
- Storefront: Content management system
- Listing Page: Partner content hub

---

## INFRASTRUCTURE REQUIREMENTS

### Required Services
- **Stepper Pro** ($19/mo) — Unlimited workflow runs, reusable components, AI steps
- **Paperform** (if using form-based intake) — Connected to Stepper natively
- **Telegram Bot API** — For Chicken Hawk command interface
- **Commerce Platform** — Shopify, Stripe, or equivalent for transaction processing
- **Data Store** — Google Sheets, Airtable, PostgreSQL, or equivalent for pipeline state

### Agent Runtime
- **NemoClaw**: Manages task queues and agent orchestration
- **Hermes Agent**: Handles all messaging (email, Telegram, webhooks)
- **Auto Research**: Provides market intelligence for ACHEEVY's scoring
- **Hosting**: Hostinger VPS or equivalent for self-hosted agent runtime

### Stepper MCP Integration
Stepper exposes authenticated toolkits via MCP. This allows NemoClaw to trigger Stepper workflows programmatically from any MCP-compatible client (Claude, Cursor, Windsurf, or custom agents). Configure in Stepper:
1. Create integration toolkit with pipeline-specific actions
2. Authenticate with BYOAPI keys for AI steps and email
3. Expose toolkit endpoint to NemoClaw via MCP connector

**Live Paperform MCP Endpoint (Already Connected):**
```
URL: https://mcp.pipedream.net/v2
Name: PAPERFORM
Status: Active — available for Stepper workflow triggers and form-based intake
```
This endpoint enables direct form submission triggers, partial submission detection, and data routing into the pipeline without manual Stepper configuration. Use Paperform forms as the intake layer for any pipeline that needs structured input from partners or end users.

---

## SECURITY & GOVERNANCE

- All pipeline actions logged to immutable ledger
- Chicken Hawk has kill-switch authority via `/pause` and `/kill`
- ACHEEVY operates within pre-approved bounds only — no autonomous decisions outside bounds
- Boomer_Angs and Lil_Hawks have zero decision authority — pure execution
- All outreach emails comply with CAN-SPAM/GDPR (unsubscribe link, sender identification)
- Attribution tracking is GDPR-safe (no cookies, no PII in URL parameters)
- Partnership terms stored with audit trail
- Reconciliation ledger is append-only

---

## CHARTER INTEGRATION

Each pipeline instance generates a Deploy Charter (Template v3.1) with:
- Pipeline-specific use cases (5 minimum)
- Tier recommendation based on token usage estimates
- Voice integration points (if applicable)
- OKRs/KPIs per pipeline stage
- Risk assessment per the RISK & COMPLIANCE MATRIX

The Assessment Ledger System (separate skill) feeds directly into pipeline design by providing validated use cases and alternate routes that inform which pipeline variant to build.
