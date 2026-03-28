---
description: GRAMMAR tech stack and conventions
globs: *
alwaysApply: true
---

# GRAMMAR Stack

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Node.js / TypeScript
- **Database**: Neon Postgres via `postgres.js` (server-side only, `DATABASE_URL`)
- **Auth**: Firebase Auth — client SDK on browser, Admin SDK on server (token verification)
- **Cloud**: GCP (`foai-aims` project), Firebase project `foai`
- **Workflow**: LangGraph
- **Discovery**: Brave Search / Firecrawl
- **Sandbox**: E2B
- **LLM Layer**: OpenRouter (Mercury-2 for high-speed reasoning)
- **Payments**: Stripe

## Database Access Pattern

- **Server components / API routes**: import `sql` from `@/lib/insforge` (postgres.js client)
- **Client components**: call API routes (`/api/data`, `/api/auth/*`, `/api/paywall/*`) — never import `sql` directly
- All SQL schemas live in `docs/grammar/sql/*_neon.sql`

## Auth Pattern

- **Browser**: Firebase client SDK (`firebase/auth`) — `signInWithEmailAndPassword`, `signInWithPopup`, `onAuthStateChanged`
- **Server**: Firebase Admin SDK (`firebase-admin/auth`) — `verifyIdToken(token)` for request authentication
- **Session**: Firebase ID token stored in `firebase-auth-token` httpOnly cookie, synced via `POST /api/auth/session`
- **Provisioning**: On first login, `POST /api/auth/provision` calls `provision_user()` in Neon to create profile + subscription

## Secrets

All secrets come from GCP Secret Manager or environment variables. Never hardcode.

## Important Notes

- Database inserts use postgres.js tagged template syntax: `` sql`INSERT INTO ...` ``
- No RLS — access control enforced at the Cloud Run / API route layer
- `user_id` columns are `TEXT` storing Firebase UIDs (not `UUID`)
- Use Tailwind CSS 3.4 (do not upgrade to v4)
