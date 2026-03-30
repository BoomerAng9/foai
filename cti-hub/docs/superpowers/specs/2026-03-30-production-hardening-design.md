# CTI Hub Production Hardening

**Date:** 2026-03-30
**Status:** Approved
**Scope:** Auth, budget, validation, error handling, deployment safety

---

## 1. Auth Hardening

### Shared `requireAuth()` helper

Create `src/lib/server-auth-guard.ts`:

```
requireAuth(request) -> { userId, email, role } | Response(401)
```

- Extracts Firebase token from `firebase-auth-token` cookie
- Verifies via Firebase Admin SDK (`verifyIdToken`)
- Checks allowlist: owner emails pass instantly, others checked against `allowed_users` table
- Returns 401 with `{ error: "Authentication required" }` on any failure
- Never returns null. Never swallows errors.

### Routes to protect

Every API route calls `requireAuth()` at the top. No exceptions:

- `/api/chat` — remove `userId || 'anonymous'` fallback
- `/api/upload` — currently has zero auth
- `/api/luc/estimate`, `/api/luc/accept`, `/api/luc/stop` — currently no auth
- `/api/research` — currently no auth
- `/api/video/generate`, `/api/video/status` — currently no auth
- `/api/image/generate` — has auth but swallows errors
- `/api/clean` — currently no auth
- `/api/scrape` — currently no auth
- `/api/sheets` — currently no auth
- `/api/sources` — has auth but swallows errors
- `/api/memory` — has auth but swallows errors
- `/api/conversations` — has auth, keep as-is but use shared helper

### Auth endpoint fixes

- `/api/auth/session` POST: verify Firebase token via `verifyIdToken()` BEFORE setting cookie
- `/api/auth/provision` POST: do NOT bypass token verification on catch
- `/api/auth/profile` GET: verify requesting user matches the userId param (no IDOR)

---

## 2. Platform Budget System (LUC)

### Database

```sql
CREATE TABLE platform_budget (
  id TEXT PRIMARY KEY DEFAULT 'poc-dev',
  starting_balance NUMERIC(10,4) NOT NULL DEFAULT 20.0000,
  remaining_balance NUMERIC(10,4) NOT NULL DEFAULT 20.0000,
  last_reset TIMESTAMPTZ DEFAULT NOW(),
  is_exhausted BOOLEAN DEFAULT FALSE
);

CREATE TABLE budget_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  cost NUMERIC(10,6) NOT NULL,
  balance_after NUMERIC(10,4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Budget service (`src/lib/budget.ts`)

- `getBudget()` — returns `{ starting: 20, remaining: X, exhausted: bool }`
- `deductCost(userId, action, cost)` — atomic deduction, returns new balance. If balance would go negative, throws `BudgetExhaustedError`
- `resetBudget(startingBalance)` — owner-only reset

### Integration points

Before every paid API call:
1. Check `getBudget()` — if exhausted, return friendly message
2. After call completes, `deductCost()` with actual cost
3. Stream `budget_update` event to frontend with remaining balance

Paid operations: OpenRouter chat, Gemini image gen, Brave search, Firecrawl scrape, video generation

### Frontend display

Replace "Premium | LUC active" footer with:
```
LUC $18.42 remaining
```

Color: green (>$10), yellow ($3-$10), red (<$3)

During streaming, show live cost deduction alongside the existing cost ticker.

When exhausted: ACHEEVY responds with "Dev budget has been reached. Contact the admin to continue."

---

## 3. Input Validation

| Route | Validation |
|-------|-----------|
| `/api/upload` | 10MB max per file, 10 files max, whitelist: image/*, application/pdf, text/* |
| `/api/chat` | 10,000 char max message |
| `/api/clean` | 100KB max payload |
| `/api/sheets` | 1000 rows max, 100KB max |
| `/api/scrape` | Validate URL format, max 5 URLs |
| `/api/video/generate` | 5000 char max brief |
| `/api/image/generate` | 2000 char max prompt |

### Rate limiting

30 requests/min per authenticated user across all routes. In-memory store (sufficient for single-instance POC). Returns `429 Too Many Requests`.

---

## 4. Error Handling

### Agent streaming (`agent.ts`)

- Add `.catch()` on upstream reader for connection failures
- Close controller in all error paths
- Log fire-and-forget failures (addMessage, memorizeConversationTurn) to console.error
- Add timeout: 60s max for any stream

### Database failures

- When `sql` is null: return `503 { error: "Service temporarily unavailable" }` — not empty arrays
- Add connection retry with exponential backoff (3 attempts)

### Frontend

- Show toast on API failures (conversations load, send failures)
- "Connection error. Tap to retry." instead of raw error messages

### Error response format

All error responses follow:
```json
{ "error": "User-friendly message", "code": "AUTH_REQUIRED" }
```

Never include: stack traces, internal service names, API keys, database details.

---

## 5. Deployment Safety

### .gitignore additions

```
.env.local
.env.production
firebase-sa-key.json
*.pem
*.key
```

### Health check endpoint

`GET /api/healthz` — returns 200 if:
- Database connected
- Required env vars present (DATABASE_URL, OPENROUTER_API_KEY, GOOGLE_KEY)

Returns 503 with missing items if not.

### Dockerfile

Add health check:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/healthz').then(r=>{if(!r.ok)throw r.status})"
```

### Error response sanitization

Strip internal names from all error responses:
- "Failed to reach edu-ang service" → "External service unavailable"
- Remove `detail: String(err)` from enrollments, seats routes

---

## 6. Files to create/modify

### New files
- `src/lib/server-auth-guard.ts` — shared requireAuth()
- `src/lib/budget.ts` — budget service
- `src/app/api/healthz/route.ts` — health check
- `sql/004-budget.sql` — budget tables

### Modified files (auth)
- `src/app/api/chat/route.ts`
- `src/app/api/upload/route.ts`
- `src/app/api/luc/estimate/route.ts`
- `src/app/api/luc/accept/route.ts`
- `src/app/api/luc/stop/route.ts`
- `src/app/api/research/route.ts`
- `src/app/api/video/generate/route.ts`
- `src/app/api/video/status/route.ts`
- `src/app/api/image/generate/route.ts`
- `src/app/api/clean/route.ts`
- `src/app/api/scrape/route.ts`
- `src/app/api/sheets/route.ts`
- `src/app/api/sources/route.ts`
- `src/app/api/memory/route.ts`
- `src/app/api/auth/session/route.ts`
- `src/app/api/auth/provision/route.ts`
- `src/app/api/auth/profile/route.ts`

### Modified files (budget + UI)
- `src/lib/acheevy/agent.ts` — budget check + deduction
- `src/app/(dashboard)/chat/page.tsx` — budget display, exhausted state
- `src/lib/image/generate.ts` — budget check before generation

### Modified files (validation + errors)
- All API routes above — input validation
- `src/lib/insforge.ts` — connection retry
- `src/app/api/enrollments/route.ts` — sanitize error detail
- `src/app/api/seats/route.ts` — sanitize error detail
- `Dockerfile` — health check
- `.gitignore` — env files
