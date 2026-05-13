# Coastal Owner Console — Design Spec

**Date:** 2026-05-13
**Owner of build:** engineering (Code_Ang gate)
**Surface:** `brewing.foai.cloud/owner` (Next.js page + FastAPI endpoints)
**Status:** approved by owner — ready for implementation plan

## Purpose

A full-screen, owner-only admin surface at `brewing.foai.cloud/owner` that lets the human-in-the-loop see "all happenings of the business" and manage the configurable surfaces of Coastal Brewing Co. without leaving the GUI. Replaces the current operational pattern of:

- SSH-ing to `aims-vps` and editing `/docker/coastal-brewing/.env` by hand
- Clicking Telegram approve / reject links to clear NemoClaw escalations
- Reading container logs to inspect activity
- Editing `cadence.py` / `profitability.py` / `_COASTAL_V2_VOICEID` Python constants via PR for routine pricing or persona tweaks

Goal: every routine owner action that affects customer-facing behavior is one click from the dashboard, with a confirmation gate proportional to the blast radius.

## Architecture

```
brewing.foai.cloud/owner  (Next.js page, owner-only)
        │
        │  magic-link  +  WebAuthn passkey  →  coastal_owner cookie (HMAC, 24h)
        ▼
coastal-runner FastAPI  /api/v1/owner/*
        │
        ├─ reads:  audit_ledger (sqlite), Stripe API, NemoClaw, profile_layer
        └─ writes:
            ├─ /docker/coastal-brewing/config/pricing-config.json   (atomic, hot-reload)
            ├─ /docker/coastal-brewing/config/voice-config.json     (atomic, hot-reload)
            ├─ /docker/coastal-brewing/config/email-templates.json  (atomic, hot-reload)
            ├─ NemoClaw approve/reject  (NEW endpoints: /api/v1/owner/nemoclaw/{task_id}/approve|reject,
            │                            owner-cookie auth; existing token-link endpoints stay
            │                            for Telegram-link compat, both call same downstream action)
            └─ stripe.Customer.modify / Subscription.cancel  /  Subscription.modify

      Host path /docker/coastal-brewing/config/ → container path /app/config/
      (mounted via the existing /docker/coastal-brewing:/app bind mount).
```

- **Frontend route:** `coastal-brewing/web/app/owner/page.tsx` (parent shell) with 6 nested tab components (`activity`, `pricing`, `customers`, `nemoclaw`, `audit`, `cfg`). Reuses existing Tailwind theme, framer-motion, and Next.js 14 App Router conventions established in `web/app/membership/`, `web/app/account/`.
- **Backend modules:** new `scripts/owner_console.py` (router + handlers for `/api/v1/owner/*`) + `scripts/owner_auth.py` (WebAuthn ceremony, owner cookie sign/verify). Mounted at `/api/v1/owner` in `api_server.py`.
- **Config lift:** the canonical constants currently in Python source code (`cadence.CADENCES`, `profitability._TIER_ENVELOPES_CENTS`, `_COASTAL_V2_VOICEID`, email body strings) move to JSON files in the runner's host-mounted config directory. Existing modules read via a loader function with mtime-based cache invalidation.
- **Env additions:**
  - `COASTAL_OWNER_EMAILS=asg@achievemor.io,bpo@achievemor.io,jarrett.risher@gmail.com`
  - `COASTAL_OWNER_SESSION_SECRET` (32-byte HMAC key, separate from auth and gateway secrets)

## Auth flow (2-factor — magic-link + WebAuthn passkey)

### First-time enrollment (one per owner email)

```
/owner   →  no coastal_owner cookie  →  redirect /auth/login?return=/owner
/auth/login   →  email field  →  POST /api/v1/auth/login (existing)
                                       │
                                       └─ email ∈ COASTAL_OWNER_EMAILS  →  mint magic-link
inbox click  →  /auth/verify?token=...
                  │
                  └─ existing verify logic + branch: if email ∈ allowlist:
                       if owner_passkeys row exists for email → redirect /owner/challenge
                       else                                    → redirect /owner/enroll
/owner/enroll  →  WebAuthn `navigator.credentials.create({user: email, ...})`
                  │
                  └─ POST /api/v1/owner/enroll  →  verify attestation  →  insert owner_passkeys row
                                                                       →  set coastal_owner cookie
/owner   →  full dashboard
```

### Returning session

```
/owner  →  has coastal_uid cookie, no coastal_owner cookie  →  /auth/login?return=/owner
/auth/login  →  magic-link  →  /auth/verify  →  redirect /owner/challenge (passkey already enrolled)
/owner/challenge  →  WebAuthn `navigator.credentials.get({allowCredentials:[stored credential_id]})`
                     │
                     └─ POST /api/v1/owner/challenge  →  verify assertion + sign_count  →  set cookie
/owner  →  full dashboard
```

### Storage, cookie, lockout, recovery

- **`audit_ledger.owner_passkeys` table:** `(email TEXT PRIMARY KEY, credential_id BLOB, public_key BLOB, sign_count INT, registered_at INT, last_used_at INT)`. Single passkey per email (no multi-device for now — re-enrol on a new device).
- **Cookie shape:** `coastal_owner = <email>.<expires_unix>.<hmac8>` where `hmac8` is the first 16 hex chars of `HMAC-SHA256(COASTAL_OWNER_SESSION_SECRET, f"{email}.{expires_unix}")`. `HttpOnly`, `SameSite=Strict`, `Secure`, 24h max-age. Dual check on every request: HMAC valid + not expired + email still in allowlist.
- **Lockout:** 3 failed WebAuthn challenges in 5 min per email → 30-min cooldown enforced via in-memory dict (matches existing `_RATE_BUCKETS` pattern). Logged to audit_ledger as `event_type='owner_auth_lockout'`.
- **Recovery:** lost-passkey path is intentional friction — SSH to runner, delete the `owner_passkeys` row, re-enrol on next sign-in. No customer-recoverable surface (would compromise the moat).
- **Library:** `webauthn` Python package (FIDO2 / WebAuthn relying-party reference implementation). Pin in `requirements.txt`.

## 6 tab capabilities

| Tab | Reads | Writes | Notes |
|---|---|---|---|
| **Activity** | `audit_ledger` (last 50, 3 s poll) + Stripe events (cached 30 s) + recent signups + NemoClaw escalations | none | SWR poll on `/api/v1/owner/activity?since=<cursor>`. Combined timeline filtered by `event_type`. |
| **Pricing** | `pricing-config.json` current values + canon shape from `cadence` + `profitability` | atomic-write JSON + hot-reload | 5 tier-retail sliders + 3 cadence-discount sliders + 5 envelope-cap sliders. Two-step confirm modal (diff + Stripe-impact preview + type `CONFIRM PRICING CHANGE`). |
| **Customers** | `stripe.Customer.list(limit=100)` + `Subscription.list_by_customer` + profile_layer cross-ref | `Customer.delete` (test cleanup) + `Subscription.cancel` + `Subscription.modify(cancel_at_period_end=true)` | Search by email/customer_id, table with status badges, per-row drawer. Confirmation modal per write. |
| **NemoClaw** | `audit_ledger.task_packets WHERE status='pending_approval'` + risk_tags | inline Approve / Reject buttons (reuses existing `/approve/click` + `/reject/click` endpoints with owner-cookie auth instead of token-link) | Replaces Telegram link clicks. Same backend action, GUI surface. |
| **Audit** | `audit_ledger` paginated (50/page) with filter by table + date range | none | Read-only firehose. JSON-row drawer for deep inspection. |
| **Cfg** | `voice-config.json` + `email-templates.json` + general settings (`COASTAL_DEBUG`, rate-limit knobs, gateway-token last-rotated-at) | atomic-write JSON + hot-reload | Same two-step confirm as Pricing. Email templates = plaintext textarea with `{magic_link}` / `{custee_email}` / `{tier_label}` placeholders highlighted. Voice persona = dropdown bound to `/api/v1/voice/catalog`. |

## Data flow

### Read path (all tabs)

```
Browser ──►  GET /api/v1/owner/<resource>   (Cookie: coastal_owner)
              │
              ├─ verify_owner_cookie()  →  email + sign_count
              ├─ _check_rate_limit("owner", email)  →  60/min/owner
              └─ handler returns JSON
```

### Write path (Pricing / Cfg / Customers / NemoClaw)

```
Browser ──►  POST /api/v1/owner/<resource>/<action>
              body: { ..., confirmation_phrase: "CONFIRM PRICING CHANGE" }
              │
              ├─ verify_owner_cookie() + rate_limit
              ├─ confirmation_phrase match check (Pricing + Cfg only)
              ├─ pydantic schema validate (bounds, types, allowed keys)
              ├─ atomic write: tempfile.NamedTemporaryFile → fsync → os.replace
              ├─ in-memory modules re-load (mtime check, cached value invalidation)
              ├─ audit_ledger row: { event: "owner_<resource>_update", email, diff, ts }
              └─ return new state
```

### Hot-reload pattern (pricing / voice / email-templates)

- Each module that reads constants exposes a `_get_config()` function that checks `os.path.getmtime(json_path)` against a cached value; on change → re-load + cache.
- Stripe checkout handlers call `_get_config()["tier_monthly_retail"][tier]` instead of importing module constants directly.
- Negligible per-request cost: single `stat()` syscall + cached value.
- Concurrency: atomic-write via `tempfile.NamedTemporaryFile(dir=os.path.dirname(json_path), delete=False)` + `os.replace` → no half-written reads possible.

### Activity feed (real-time-ish)

- SWR poll every 3 s on `/api/v1/owner/activity?since=<cursor>`. No SSE / WebSocket (simpler, no Traefik proxy issues, 3 s lag acceptable for monitoring surface).
- Sources combined: `audit_ledger` rows + a Stripe event snapshot (cached 30 s, fetched via `stripe.Event.list(limit=50)` and refreshed lazily on the next /activity request after the cache TTL expires — no separate background task required).

## Error handling

- **401** — cookie missing or HMAC invalid. Frontend redirects to `/auth/login?return=/owner`.
- **403** — cookie valid but email no longer in `COASTAL_OWNER_EMAILS` (env changed mid-session). Deny ongoing session.
- **423** (locked) — WebAuthn challenge failed 3× in 5 min. 30-min cooldown.
- **409** (conflict) — `pricing-config.json` mtime changed between client read and write (optimistic lock). Client re-fetches + re-confirms.
- **422** (unprocessable) — pydantic schema violation. Returns field-level error so the slider UI can flag the bad input.
- **Stripe write failures** — toast + audit_ledger entry with `error_class`. Retry button. No silent failures.
- **Hot-reload failure** (malformed JSON saved by a non-owner pathway) — log warning, keep cached values, do NOT 500 customer-money endpoints. The save endpoint validates before writing, so this path is defensive only.

## Testing

- **Unit:**
  - pydantic schema tests for every write endpoint body.
  - HMAC cookie sign + verify (golden vectors against `COASTAL_OWNER_SESSION_SECRET`).
  - Hot-reload pattern under concurrent reads + writes (`pytest-asyncio` with `asyncio.gather`).
  - Allowlist parsing (comma-split, whitespace tolerance, empty env → no allowlist).
- **Integration:**
  - WebAuthn ceremony round-trip using `webauthn` library's `SoftWebauthnDevice` test fixture (no real hardware needed).
  - Owner-cookie required on every `/api/v1/owner/*` endpoint (parameterised test).
  - JSON config files round-trip: write → re-load → verify Stripe checkout returns new value.
- **E2E (deferred to the FDR-2026-05-13-live-smoke-money-endpoints reliability tool when promoted):**
  - Playwright script: sign in → enrol → drag slider → confirm modal → save → verify new value reflected in a fresh `/api/membership/custee-card/checkout` response.
  - Runs against the deployed runner (Stripe test-mode keys when available, else assertion on the runner's response only).
- **Regression test class:** every new Stripe API param in any owner write endpoint gets a `sk_test_…` integration call that hits real Stripe with the constructed dict. Per the FDR-2026-05-13 lesson — mocked pytest doesn't catch invalid Stripe params.

## Migration

PR includes a one-time migration step:

1. Generate `pricing-config.json` from current `cadence.CADENCES` + `profitability._TIER_ENVELOPES_CENTS` values.
2. Generate `voice-config.json` from current `_COASTAL_V2_VOICEID`.
3. Generate `email-templates.json` from current `magic_link_email_body` constants.
4. Swap module reads from Python-source constants → loader functions.
5. Existing pytest suite stays green (loader returns identical structure).
6. Create host directory `/docker/coastal-brewing/config/` and seed the three JSON files into it. The existing `/docker/coastal-brewing:/app` bind mount makes them visible at `/app/config/` in the container — no compose change required.
7. Add 2 new envs to runner: `COASTAL_OWNER_EMAILS`, `COASTAL_OWNER_SESSION_SECRET`.

## Out of scope (YAGNI)

- Multi-owner role-based permissions (single owner; the allowlist gates everything).
- Mobile-first UI (desktop-first; owner uses laptop for admin work).
- Analytics charts / time-series graphs (this phase ships tables + counters; charts can layer in later if needed).
- Bulk operations (one-at-a-time is sufficient for the volumes Coastal will see in year one).
- Separate "owner audit" tab (the existing `audit_ledger` table already records owner actions via the standard event-type pattern).
- Hardware-key-only flow without magic-link (passkey alone is one factor; magic-link is the second).
- Cross-browser passkey sync (the spec stores one credential per email — re-enrol on a new device).

## Build phasing

**Big-bang single PR per owner directive.** All 6 tabs ship in one PR. Higher per-PR risk in exchange for full feature delivery in one cycle. The implementation plan (next step, `writing-plans` skill) decomposes the work into commit-sized chunks within the PR.
