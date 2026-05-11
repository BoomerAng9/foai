# Mercury Plumbing Plan — Coastal × FOAI Ecosystem

**Date:** 2026-05-11
**Status:** PLAN — owner confirmed Mercury endpoint pattern, ready to wire when API key arrives
**Scope:** Mercury Bank API + MCP + CLI integration across Coastal Brewing Co. (B2B/wholesale invoicing) and broader FOAI ecosystem (operating-account visibility for ACHEEVY)

---

## 1. Owner-confirmed surface

Owner-shared endpoint pattern: `https://api.mercury.com/api/v1/account/{accountId}`

Confirmed Mercury offerings (per prior research session 2026-05-10):
- **Mercury REST API** — full banking surface at `api.mercury.com/api/v1/`. Basic auth (API key as username, empty password).
- **Mercury Hosted MCP** — official, read-only, OAuth-gated. Customer authenticates per session.
- **Mercury CLI** — official, terminal-native, can make payments + categorize transactions.
- **Mercury Invoicing API** — official, requires Mercury subscription plan. Recurring invoices NOT yet supported.

---

## 2. Strategic split — what Mercury replaces, what stays on Stripe

| Use case | Tool | Why |
|---|---|---|
| Coastal Custee Card / Wood Stork / Pooler Pass recurring memberships | **Stripe** (existing) | Mercury Invoicing has no recurring billing |
| Coastal retail bag/bundle checkout (Hostinger storefront + Amazon) | **Stripe** | Mercury has no hosted retail checkout widget |
| Path A Stripe escalation Checkout Session for wholesale | **Stripe** (existing) | Already wired per `reference_coastal_path_a_stripe_direct_2026_05_09` |
| **B2B wholesale invoicing — Wood Stork case orders, Melli catering, event invoices** | **Mercury Invoicing API** | Direct deposit to operating account, no Stripe payout latency |
| **AIMS licensee billing ($2.5K-$500K/mo Platform Partner / Full Launch tiers)** | **Mercury Invoicing API** | High-ticket B2B; no consumer rails needed |
| Operating-account visibility for ACHEEVY (balance, runway, invoice status) | **Mercury Hosted MCP** | Read-only, OAuth-gated, owner authenticates |
| Programmatic balance/transaction queries for Code_Ang burn-rate dashboards | **Mercury REST API + Lil_Mercury_Hawk** | Needs API key in vault; CLI > MCP per agentic-cli decision rule |
| Transaction categorization (vendor spend by category for tax + AIMS pricing-matrix data) | **Mercury REST API** | API-only writes; no MCP write surface |
| Owner-facing payments-out (paying TCR wholesale invoices, paying contractors) | **Mercury CLI** | Terminal-native, owner-driven, no agent automation here |

**Net:** Stripe owns customer-facing payment rails. Mercury owns B2B invoicing + operating-account intelligence + ops-side payments.

---

## 3. What we are NOT doing

- **NOT** moving Coastal recurring memberships to Mercury — Mercury Invoicing has no recurring support, full stop
- **NOT** giving any agent write-side access to Mercury without explicit owner approval per request — even Lil_Mercury_Hawk read endpoints stay read-only until owner ratifies write scope
- **NOT** exposing Mercury account ID, balances, or transactions in any customer-facing surface (Sacred Separation)
- **NOT** caching Mercury account balance in a shared store — balance reads go through MCP/CLI per call, owner authenticates
- **NOT** migrating away from Stripe escalation flow (Path A) — Mercury complements, doesn't replace

---

## 4. Build plan — three phases

### Phase 1 — Read-side (no auth burden on owner)

**Lil_Mercury_Hawk** built per `agentic-cli` factory pattern. Same shape as Lil_YouTube_Hawk + Lil_Telegram_Hawk recent builds.

**Scope:**
- `mercury_read_account(account_id)` → balance, available, currency, status
- `mercury_read_transactions(account_id, limit=50, since=None)` → transaction list with merchant, amount, category, posted_at
- `mercury_read_invoices(invoice_id=None, status_filter=None)` → invoice list / detail
- `mercury_burn_rate(window_days=30)` → computed from transactions (categorized debits / window)
- `mercury_runway_estimate()` → current balance / monthly burn → months of runway

**Token discipline:**
- ≤2000 token slim projections returned to agent context
- Raw payloads cached at `~/.cache/agentic-cli/mercury/responses.db` (SQLite, mirrors Lil_YouTube_Hawk pattern)
- API key from `MERCURY_API_KEY` env first, then `~/.cache/agentic-cli/mercury/api_key` file (mode 600)

**Endpoint mapping:**
- `GET https://api.mercury.com/api/v1/accounts` — list accounts
- `GET https://api.mercury.com/api/v1/account/{accountId}` — account detail (owner-confirmed pattern)
- `GET https://api.mercury.com/api/v1/account/{accountId}/transactions` — transactions
- `GET https://api.mercury.com/api/v1/invoices` — invoice list
- `GET https://api.mercury.com/api/v1/invoices/{invoiceId}` — invoice detail

**Auth:** HTTP Basic — username=API_KEY, password=empty. Stored in vault per Print Press secret pattern.

**Reports to:** Chicken_Hawk → ACHEEVY (NOT a Boomer_Ang — Mercury is operating-infra, not customer-facing)

**Deliverable:** Class at `sqwaadrun.lil_mercury_hawk.LilMercuryHawk` extending BaseLilHawk. Registry update from current 19 → 20. Smoke-tested against owner's real Mercury account before merge.

### Phase 2 — Write-side B2B invoicing (Wood Stork + AIMS licensees)

Once Phase 1 read endpoints are green:

**Scope:**
- `mercury_create_invoice(...)` — for Wood Stork case orders (Melli initiated), AIMS licensee billing, one-off catering events
- `mercury_send_invoice(invoice_id)` — push invoice to customer email via Mercury's send mechanism
- `mercury_invoice_status(invoice_id)` — paid / unpaid / overdue check (also available read-side in Phase 1)

**Owner-gate boundary:**
- Every invoice creation goes through `aims-build-control-pack` evidence-based receipt
- Telegram alert via Lil_Telegram_Hawk fires for owner approval BEFORE invoice send
- Owner approves with Stripe-style HMAC URL → `POST /coastal/runner/mercury/approve-invoice` → invoice fires
- This mirrors the Path A escalation pattern for symmetry — owner gets one-button approve from Telegram

**Mercury subscription plan:**
- Invoicing API is gated on Mercury paid subscription tier
- Owner needs to confirm subscription is active before Phase 2 work begins

### Phase 3 — Owner ACHEEVY operating-account dashboard

Once Phase 1 + Phase 2 are stable:

**Scope:**
- ACHEEVY learns to query Lil_Mercury_Hawk for "what's the balance" / "what's runway" / "any unpaid invoices over 30 days"
- Owner ACHEEVY chat surface (`/acheevy` on AIMS) gains a "balance check" intent that routes to Lil_Mercury_Hawk
- Mercury Hosted MCP becomes the primary owner-direct surface — owner authenticates once per session via OAuth, gets read-only natural-language queries

**Sacred Separation enforcement:**
- ACHEEVY responses NEVER include Mercury account number, full balance, or vendor names without owner-explicit-request
- Default phrasing: "Your operating runway looks healthy" / "There are 3 unpaid invoices to follow up on" — not "$X balance, $Y burn"
- Numbers only on owner explicit ask (e.g., "What's the actual balance?")

---

## 5. Vault + secrets layout

| Secret | Storage | Loader |
|---|---|---|
| `MERCURY_API_KEY` | Print Press vault (AES-GCM, PBKDF2 600k) | env first → `~/.cache/agentic-cli/mercury/api_key` mode 600 |
| Mercury OAuth client (for hosted MCP) | OAuth flow per-session, no persistent storage | owner browser, no agent storage |
| `LIL_MERCURY_HAWK_HMAC_TOKEN` | Print Press vault, fleet-token mint per pattern | mints 17th HMAC token in vault |

**Owner action required to unblock Phase 1:**
1. Generate Mercury API key from Mercury Dashboard → Settings → API
2. Store in vault via `pp vault add MERCURY_API_KEY <key>` (Print Press CLI)
3. Confirm Mercury subscription plan is active (gates Phase 2)

---

## 6. Sequencing — what unlocks what

```
[ Owner provides Mercury API key + subscription confirmation ]
            │
            ▼
   Phase 1 — Read-side Lil_Mercury_Hawk
            │
            │  (smoke test against owner's real account)
            │
            ▼
   Phase 2 — B2B invoicing wire-up (Wood Stork case orders, AIMS licensees)
            │
            │  (owner-gated invoice creation flow)
            │
            ▼
   Phase 3 — ACHEEVY operating-account intelligence
            │
            │  (Mercury MCP for owner direct, Lil_Mercury_Hawk for agent reads)
            │
            ▼
   Steady-state ops
```

---

## 7. Files to create when owner unblocks Phase 1

- `~/foai/smelter-os/sqwaadrun/lil_mercury_hawk.py` — class extending BaseLilHawk
- `~/foai/smelter-os/sqwaadrun/cli/mercury.py` — agentic-cli wrapper (CLI > API > MCP)
- `~/.cache/agentic-cli/mercury/responses.db` — SQLite mirror (created on first call)
- `~/.claude/skills/mercury-cli/SKILL.md` — companion skill registered for ACHEEVY
- `FOAI Project/registry/sqwaadrun_hawks.json` — bump count 19 → 20, add Lil_Mercury_Hawk entry with 9 personification fields + 7 factory-origin metadata fields per pattern
- `coastal-brewing/scripts/adapters/mercury_adapter.py` — Coastal-side adapter for Phase 2 invoice flow

---

## 8. Coastal-specific Mercury wire — Phase 2 detail

### Wood Stork invoice flow (replaces Stripe Checkout for case orders > $500)

```
Wood Stork member places case order (CLI or web)
  → Coastal runner → Boomer_Ops + Melli_Capensi voice approval
  → If amount > $500 OR member tier == reserve:
      → Mercury Invoicing API: create invoice
      → Telegram → owner approval
      → On approve: send invoice via Mercury (lands in member email)
      → On member pays: Mercury webhook → mark order ready-to-ship → notify TCR
  → If amount ≤ $500: Stripe Checkout (existing membership-discount-applied flow)
```

### AIMS licensee invoice flow

```
Licensee onboarding completes → AIMS frontend tier-pick →
  → If tier in {Platform Partner, Full Launch}:
      → Mercury Invoicing API: create monthly invoice
      → Send to billing-email-on-file
      → Set up monthly recurring through Mercury's manual recurring (Mercury API
        does NOT yet support recurring — workaround: cron job creates fresh
        invoice each month from template)
  → If tier == Wholesale Direct ($2.5K/mo): Stripe subscription as today
```

---

## 9. Open questions for owner

1. **Mercury subscription plan status?** — Required for Invoicing API access
2. **Will Mercury be the primary operating account for both Coastal AND AIMS,** or do you want Coastal-only initially?
3. **Lil_Mercury_Hawk write scope** — even after Phase 2 launches, do you want any Mercury writes to be owner-confirm gated, or do you trust the agent to send (already-drafted) invoices on its own?
4. **MCP vs CLI default** — for owner-direct queries ("what's my balance"), do you prefer Mercury MCP (OAuth per session, browser) or Mercury CLI via terminal?
5. **Burn-rate / runway dashboard** — want this surfaced in CTI Hub admin, or in a new ACHEEVY-internal view, or both?

---

## 10. References

- Mercury API endpoint pattern (owner-shared 2026-05-11): `https://api.mercury.com/api/v1/account/{accountId}`
- Mercury official docs: https://docs.mercury.com/docs/welcome
- Mercury API page: https://mercury.com/api
- Mercury Invoicing API changelog: https://docs.mercury.com/changelog/invoicing-api-now-available
- Implicator article on Mercury CLI + MCP: https://www.implicator.ai/the-dashboard-is-losing-the-account-mercury-bank-is-testing-the-replacement/
- Prior session research: `~/.claude/projects/C--Users-rishj/memory/MEMORY.md` Mercury entries
- Print Press vault pattern: `reference_print_press_v2_installed_2026_05_10`
- Agentic-cli factory pattern: `~/.claude/skills/agentic-cli/`
- Sqwaadrun Lil_Hawk registry: `FOAI Project/registry/sqwaadrun_hawks.json`
