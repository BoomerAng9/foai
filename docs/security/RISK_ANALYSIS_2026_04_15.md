# Risk Analysis & Security Hardening — Gate 1-6 Pass (2026-04-15)

Scope: everything shipped in PR #185 (branch `perform/freshness-indicators`). Written to be read alongside the PR diff and the audit-log files it references.

---

## 1. What changed in attack surface

| Surface | Before | After |
|---|---|---|
| Sqwaadrun gateway | Public by default (`0.0.0.0`), non-timing-safe key compare, raw responses | Loopback default, `hmac.compare_digest`, `sanitize_output` scrubs paths/IPs/secrets from responses, CORS allowlist enforced |
| cti-hub pipeline keys | `!==` string compare on reaper + seed-board | `timingSafeEqual` via `@/lib/security/timing-safe` |
| cti-hub high-cost routes | 9 authenticated routes called paid LLM / Kie / fal with no per-user cap | Per-user rate limits 5–60/min keyed by Firebase uid |
| Broadcast/chat Grammar errors | Silently swallowed (server log only) | Surfaced via SSE meta frame to UI, client-visible string redacted to safe enum |
| `/api/spinner/chat` (new) | n/a | Rate-limited and auth-gated via the existing route handler; tools filtered by caller scope before session.update reaches Inworld |

---

## 2. Residual risks (known, scoped, not blockers for this PR)

### HIGH

- **Deploy voice-gateway ephemeral-token stub returns the root `INWORLD_API_KEY`.** Per comments in `services/voice-gateway/src/inworld-realtime.ts:mintEphemeralCredential`. If the browser-direct WSS topology ships to production as-is, the root key is exposed to any authenticated user. Must be replaced with a Portal-issued short-lived credential before any Deploy prod rollout. Tracked separately.

- **Stripe architecture conflict.** Locked memory says Stripe routes through Stepper/Taskade exclusively; cti-hub still has a direct Stripe webhook receiver (`/api/stripe/webhook/route.ts`) importing the `stripe` SDK. Signature verification is present and correct, but the architecture invariant isn't. Needs an explicit call: retire the direct receiver and route all Stripe events through Stepper, or grandfather the direct receiver and amend the invariant.

### MEDIUM

- **Rate limit is in-memory + single-replica.** `@/lib/rate-limit-simple` uses a `Map`. On Cloud Run or multi-instance myclaw-vps, caps are per-replica, so a client with N replicas can burst N × cap. Fine for current single-instance deploys; needs Redis/Upstash migration when we scale horizontally.

- **Grammar error SSE meta frame is visible to the user.** Now redacted to a safe enum (`timeout | auth_error | rate_limited_upstream | upstream_unavailable | network | unknown`), but a very careful probe could map timing of each status back to a provider. Low exposure in practice, not a credential leak.

- **`@aims/pricing-matrix` + `@aims/spinner` as `file:` deps** mean any local edit to the upstream package changes cti-hub behavior immediately (no version pinning). That's intentional for dedup but surfaces a change-management cost: a bad commit to aims-pricing-matrix breaks every consumer at once. Mitigation: CI build-verify on consumers when upstream changes.

### LOW

- **`@aims/pmo` dep in spinner's `package.json`** is `file:../aims-pmo` but the PMO package is scaffold-level — any broken edit there cascades. Watch the dependency graph.

- **`aims-pricing-matrix/src/neon-loader.ts`** has several implicit-any parameters. Not a security issue but a type-safety gap flagged by typecheck. Clean-up pass welcome, not urgent.

- **`prefer-reduced-motion`** support in new Broadcast Grammar indicator not explicitly checked. It's a static badge with no animation, so low actual risk; call out for design QA.

- **No integration tests** for the Inworld tool-use loop. `@aims/spinner` ships with unit tests for intent classification but none for `runFunctionCalling()` or the Realtime session. Smoke test checklist is in PR #185 description.

---

## 3. Hardening that landed this session (grouped by control family)

### Authentication / authorization
- Timing-safe pipeline-key comparison on `/api/aiplug/worker/reap` and `/api/perform/seed-board` (prevents token probing)
- `hmac.compare_digest` on Sqwaadrun gateway bearer auth
- Firebase ID-token verification + UID match + email allowlist on `/api/auth/provision` (verified, already secure)
- Scope gate in `@aims/spinner` filters tools before `session.update` reaches Inworld — a caller without `authenticated` scope never sees the `start_checkout` or `dispatch_sqwaadrun_mission` schemas

### Rate limiting / abuse
- 9 cti-hub routes now rate-limited per Firebase uid: 5/min (video/render, perform/seed, automation), 10/min (the-chamber/run, clean), 20/min (broadcast/chat, plugs/[slug], perform), 60/min (the-lab/catalog)
- `/api/spinner/chat` inherits `handleChatRequest` which runs per-route

### Output sanitization / data exfil
- Sqwaadrun `/scrape` + `/mission` responses pass through `sanitize_output` which strips `[A-Z]:\Users\…`, `/home/…`, `/opt/…`, `/tmp/…`, RFC1918 IPs, and anything matching `(api[_-]?key|token|secret|password|authorization)…[A-Za-z0-9_\-]{20,}` before the response crosses the API boundary
- Broadcast Grammar error strings pass through a `safeGrammarError()` mapper before reaching the client
- Identity-guard hook (AIMS uncommitted) expanded blocklist: infra names, AI provider names, full agent-fleet roster, tool codebase names

### Network / transport
- Sqwaadrun default bind `127.0.0.1` — explicit opt-in for `0.0.0.0` via `SQWAADRUN_BIND` env var (prevents accidental public exposure)
- Sqwaadrun CORS locked to `SQWAADRUN_CORS_ORIGINS` allowlist (empty = no cross-origin, preflight returns 403 without a matching origin)
- Inworld LLM Router: `Authorization: Basic <key>` over TLS; no plaintext key in code
- Inworld Realtime WS: WSS-only, `Authorization: Basic <key>` header at handshake

### Input validation
- Sqwaadrun `validate_targets()` — SSRF prevention (blocks RFC1918, loopback, link-local, cloud metadata, multicast; DNS resolution failure = fail closed)
- `sanitize_intent()` — strip control chars, cap at 2000 chars
- `sanitize_config()` — recursive dict sanitization, blocks `__proto__ / constructor / prototype / __import__ / eval / exec / system` keys, caps depth at 3 and string length at 10000
- `@aims/spinner` tool handlers `try/catch` args JSON.parse — malformed arguments return a JSON error string to the LLM for self-correction instead of crashing

### Audit / observability
- Sqwaadrun `audit_log()` appends `rate_limited`, `ssrf_blocked`, `scrape_start`, `mission_start` events to daily-rotated JSONL at `SQWAADRUN_AUDIT_DIR`
- cti-hub server-side logs full raw Grammar error (while client sees only the safe enum) — auditability without leak

### Supply-chain
- `@aims/spinner` moved from `"*"` registry deps to `file:` workspace links → no accidental install from a stranger publishing `@aims/pmo` to public npm
- `@aims/pricing-matrix` node_modules now installed — Gate 4 wire exposed and fixed a pre-existing unbuildable state

---

## 4. Threat-model highlights

| Attacker | Goal | Current mitigation | Residual |
|---|---|---|---|
| Authenticated malicious user | Drain LLM tokens / rack up bill | Per-uid rate limits + scope gate on mutation tools | Multi-replica bypass (MEDIUM, documented) |
| Unauthenticated prober | Discover valid pipeline keys | Timing-safe bearer check + 401 on empty config | None known |
| Compromised browser | Steal Inworld key | Realtime key never reaches browser via aims-core topology; Deploy voice-gateway topology exposes root key (HIGH, tracked) | Until ephemeral-token stub replaced |
| Prompt-injection payload in user message | Bypass identity guard, exfil tool names | Tool schemas filtered by scope before session.update; identity-guard hook (AIMS) scans inbound + outbound | Not yet wired into every chat surface |
| Malicious scrape request | SSRF to cloud metadata endpoint | `validate_target_url()` blocklists + DNS resolution + blocked hostnames | None known |
| Stale path in response | Leak internal filesystem layout | `sanitize_output` regex sweep on scrape + mission responses | Paths using non-standard prefixes could slip through — add test fixtures |

---

## 5. What this pass explicitly did NOT solve

- Deploy ephemeral-token replacement (HIGH, separate PR)
- Stripe-via-Stepper enforcement (architecture decision pending)
- Key rotation playbook (ops doc, not code)
- JWT verification audit beyond Firebase path (no non-Firebase JWT surfaces found)
- Multi-replica rate limit migration
- Boomer_Ang character renders + asset mirroring
- ANG/Boomer_Ang rebrand sweep across user-facing copy

Each is tracked in memory as a follow-up and does not gate this PR.
