# Owner Bypass Reference

## What it does

Owner emails bypass every paywall, tier limit, budget check, and Stripe
checkout gate in this repository. Owners see "UNLIMITED BERTH · OWNER
CLEARANCE" on pricing and billing pages and never trigger Stripe customer
or session creation. This is enforced both server-side (Stripe routes)
and client-side (UI rendering).

## Owner emails

Set via the `OWNER_EMAILS` environment variable on the Cloud Run service.
Comma-separated list, lowercased on comparison.

Current owners (canonical):

```
OWNER_EMAILS=bpo@achievemor.io,jarrett.risher@gmail.com
```

To add a new owner: update `OWNER_EMAILS` on the Cloud Run service for
both `cti.foai.cloud` and `deploy.foai.cloud`. No code change required —
the value is read at request time, not at build time.

## Bypassed gates

| Gate | File | How it bypasses |
|---|---|---|
| Auth fast-path | `src/lib/auth-guard.ts` (`requireAuth` function) | Owner email returns immediately as `role: 'owner'` without consulting the allowed_users table |
| Budget enforcement | `src/lib/budget.ts` (`enforceBudget` function) | Owner email returns early before any quota math runs |
| Stripe checkout (main) | `src/app/api/stripe/checkout/route.ts` (`POST` handler) | After auth, before rate limiting and Stripe API calls, returns `{ owner_bypass: true, redirect_url, message }` |
| Stripe checkout (Sqwaadrun) | `src/app/api/stripe/sqwaadrun/checkout/route.ts` (`POST` handler) | Identical pattern to main checkout |
| Pricing page UI | `src/app/(dashboard)/pricing/page.tsx` | `isOwner(user?.email)` short-circuits the page; renders `OwnerClearanceStamp` banner above the tier grid |
| Billing page UI | `src/app/(dashboard)/billing/page.tsx` | Already had `isOwner` import; existing silent return replaced with positive owner feedback; small banner upgraded to full clearance stamp; tier grid stays visible as read-only preview |
| Plan-selection handler | `pricing/page.tsx` `handleUpgrade`, `billing/page.tsx` `handleSelectPlan` | Both handlers now interpret `data.owner_bypass === true` as a redirect to `/dashboard?owner_unlimited=1` with a toast |

## Verifying the bypass works

1. **Owner sign-in flow.** Sign in as `bpo@achievemor.io`. Navigate to
   `/pricing`. The page should render the `UNLIMITED BERTH · OWNER
   CLEARANCE` stamp above the tier grid.
2. **No Stripe call.** Open the browser network tab. Click any plan
   button on `/pricing` or `/billing`. Verify NO request fires to
   `/api/stripe/checkout`. The owner is redirected to `/dashboard`
   with a success toast.
3. **Direct API check.** With an owner session active, POST to
   `/api/stripe/checkout` directly (curl or fetch). Response must be
   `{ owner_bypass: true, redirect_url: "/dashboard?owner_unlimited=1",
   message: "Owner clearance — no checkout required." }` with HTTP 200.
4. **Sqwaadrun checkout.** Repeat step 3 against
   `/api/stripe/sqwaadrun/checkout` with a Sqwaadrun tier payload.
   Same response shape.
5. **Owner-check endpoint.** GET `/api/auth/owner-check` as owner →
   `{ isOwner: true, email: "bpo@achievemor.io" }`. As non-owner →
   `{ isOwner: false, email: "..." }`. Unauthenticated →
   `{ isOwner: false, email: null }` (200, not 401).
6. **Non-owner regression check.** Sign in as a non-owner test email.
   Pricing page shows the normal tier grid. Clicking checkout creates a
   real Stripe checkout session and redirects to Stripe. Nothing
   regressed.
7. **Budget enforcement still gated.** Trigger a budget-enforced action
   as the owner. Verify no rejection. Trigger the same action as a
   non-owner near their quota — verify enforcement still fires.

## Adding a new gate

When you add a new paywall, tier check, or chargeable action:

1. Add `import { isOwner } from '@/lib/allowlist';` at the top of the file.
2. Read the user's email from the auth context that file already uses
   (do not re-implement auth — use what the surrounding code uses).
3. Insert the bypass as the FIRST check after auth resolution and BEFORE
   any external call, rate-limit, or chargeable operation:
   ```ts
   if (isOwner(email)) {
     return { owner_bypass: true, ...UNLIMITED_RESPONSE };
   }
   ```
4. Add a row to the table above documenting the new gate.
5. Add a verification step to the list above.

## Why Number.MAX_SAFE_INTEGER, not Infinity

The `agentLimit()` helper in `src/lib/access-helpers.ts` returns
`UNLIMITED = Number.MAX_SAFE_INTEGER` for owners, NOT `Infinity`.
JavaScript's `Infinity` is not JSON-safe — `JSON.stringify(Infinity)`
returns the string `"null"`. If owner limits ever cross a serialization
boundary (API response, log line, SSR hydration, SWR cache, DB column),
they would silently become `null`, and downstream comparisons like
`used < limit` would always evaluate to `false`, breaking owner access
everywhere the limit is read post-serialization. Always use `UNLIMITED`.
