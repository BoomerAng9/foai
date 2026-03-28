# CLAUDE.md

CTI HUB — the public product shell for the FOAI-AIMS ecosystem.

## What This Is

CTI HUB is the Coastal Talent & Innovation command surface. It is the product.
GRAMMAR is NOT this app — GRAMMAR is an internal technical language engine that may serve CTI HUB if needed.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Auth**: Firebase Auth (client SDK on browser, Admin SDK on server)
- **Database**: Neon Postgres via `postgres.js` (server-side only via `DATABASE_URL`)
- **Backend**: 11 Python/FastAPI Cloud Run services in GCP `foai-aims`
- **LLM**: OpenRouter
- **Payments**: Stripe

## Key Paths

- `src/app/page.tsx` — Public landing page
- `src/app/(dashboard)/` — Authenticated dashboard (sidebar + canvas + talk dock)
- `src/app/api/auth/provision/route.ts` — Firebase-to-Neon user provisioning
- `src/context/auth-provider.tsx` — Auth state + provision loop
- `src/lib/firebase.ts` — Client SDK singleton
- `src/lib/firebase-admin.ts` — Server SDK singleton

## Rules

- All responses, comments, and commits in English
- Revenue-first: if it doesn't serve launch, it doesn't ship
- No GRAMMAR features unless they directly support a CTI HUB business flow
