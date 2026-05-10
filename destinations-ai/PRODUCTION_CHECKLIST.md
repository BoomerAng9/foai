# Destinations AI — Production Checklist

**Honest hand-off: what Phase 1 ships vs. what Phase 2+ must deliver before this is commercial-ready.**

Phase 1 is a **production foundation**, not a finished commercial product. The code is production-grade for what it covers — zero stubs, zero mocks, real schema, real validation, real provider abstractions. But a commercial-ready real-estate platform requires real listing data, legal review, full auth flows, payment infrastructure, monitoring, and compliance work that a single session cannot deliver.

Each unchecked item below is either (a) work that requires an external dependency (MLS contract, legal review), (b) work that belongs in a dedicated session, or (c) both.

---

## Phase 1 — Shipped ✅

### Infrastructure
- [x] Next.js 15 App Router scaffold, React 19, TS 5.7 strict
- [x] Tailwind 3 + Framer Motion 12 + Geist fonts
- [x] `postgres` npm Neon client matching foai convention
- [x] Firebase admin + client SDKs installed
- [x] Production security headers in `next.config.mjs`
- [x] `.env.example` documenting every required secret
- [x] `.gitignore` excludes service accounts + env files

### Schema
- [x] `destinations` + `destinations_public` view, with check constraints and triggers
- [x] `coming_soon_regions` with palette + quarter format validation
- [x] `region_waitlist` with email regex + denormalized count via trigger
- [x] `user_intentions` with 50-item cap trigger
- [x] `user_shortlists` with compound PK + FK cascade
- [x] `scripts/migrate.ts` with bookkeeping table, idempotent apply

### Core lib
- [x] `db.ts` with `requireDb()` guard + `assertDbReady()` boot probe
- [x] `validation.ts` — Zod schemas for every API shape
- [x] `map/provider.ts` — `MapContext` + `useMap()` + `resolveProvider()`
- [x] `map/maplibre.tsx` — full MapLibre + MapTiler dark style, projection, flyTo
- [x] `map/google3d.tsx` — Google `<gmp-map-3d>` web component, projection, flyCameraTo
- [x] `vertex.ts` — Gemini ranking via `@google/genai`, structured JSON output, server-only

### API
- [x] `GET /api/destinations` — filter by region/state/minWalk/maxPrice, Zod-validated output
- [x] `GET /api/destinations/[id]` — single destination detail
- [x] `GET /api/coming-soon` — expansion roster with s-maxage cache

### Seed data
- [x] `scripts/seed.ts` — 5 live destinations (Coastal GA/Lowcountry) + 8 Coming Soon regions (24 destinations queued)
- [x] All seed rows tagged `data_source='curated'` with provenance documented in-file

### App entry
- [x] `src/app/layout.tsx` — full metadata, viewport, Geist fonts, reduced-motion CSS
- [x] `src/app/page.tsx` — SSR fetch of destinations + coming-soon, Suspense fallback
- [x] `src/components/DestinationsCanvas.tsx` — Phase 1 shell with MapProvider swap + minimal markers

### Docs
- [x] `README.md` — layout, setup, scripts
- [x] `ARCHITECTURE.md` — system diagram, contracts, provider abstraction
- [x] `PRODUCTION_CHECKLIST.md` (this file) — honest hand-off

---

## Phase 2 — Full overlay port + auth + Vertex routing

### Component port (prototype → TSX) ✅ 2026-04-19

Source: `C:\Users\rishj\Projects\destinations-ai-prototype\` — the browser-globals JSX sandbox used to validate the visual direction.

- [x] `DestinationPin.tsx` — ported with `pinStyle: 'glow' | 'beacon' | 'ring'`, hover + active states, shortlist indicator. Positions via `useMap().project()`.
- [x] `NeighborhoodPulseCard.tsx` — full card (WalkArc, NoiseWaveform, SchoolDots, HeroStrip, vibe chips, actions). HeroStrip keeps per-destination ambient color; card chrome follows accentScheme.
- [x] `IntentionComposer.tsx` — draggable glass panel, chip weights, add/remove, 3 position modes (floating/left-rail/bottom-sheet).
- [x] `ShortlistDock.tsx` — draggable, 4 position modes (bottom/right/floating/auto-hidden with empty-state pill).
- [x] `ExpansionDrawer.tsx` — Coming Soon roster panel, collapsed pill + expanded list, notify-me state (local only — server wiring tracked below).
- [x] `ConstellationOverlay.tsx` — fully-connected shortlist graph with animated dashed flow, renders at z-5 between map and pins.
- [x] All components wired to `useMap().project()` — re-render on camera change during pan/zoom.
- [x] MapLibre provider syncs camera on `move` + `moveend` for smooth overlay tracking during pan.
- [x] `DestinationsCanvas.tsx` full rewrite — wires every component against live data.
- [ ] `TweaksPanel.tsx` — dev-only, behind `NEXT_PUBLIC_ENABLE_TWEAKS=true`, 9 tweaks (deferred — production ships single opinion; tweaks are design-review only)
- [ ] Replace SSR static data with client-side SWR hooks for live updates

### Firebase Auth flows
- [x] `src/lib/firebase/admin.ts` — `getAdminAuth()` matching perform pattern (discrete env vars for project/email/privateKey)
- [x] `src/lib/firebase/client.ts` — client SDK init with `NEXT_PUBLIC_FIREBASE_*` envs
- [x] `src/app/api/auth/session/route.ts` — POST exchanges ID token for session cookie (5-day expiry, httpOnly secure); DELETE clears
- [x] `src/app/api/auth/verify/route.ts` — GET returns decoded user claims or 401
- [x] Sign-up, sign-in, password recovery UI — `/sign-in`, `/sign-up` pages with `AuthForm` component (email+password + Google OAuth + humanized error copy)
- [x] `middleware.ts` — soft edge gate, 401 on mutation routes without cookie, redirects `/account/*` → `/sign-in?returnTo=`
- [x] `src/lib/auth.ts` — shared `requireUser()` helper for route handlers (reads cookie → verifySessionCookie → user claims)
- [x] `src/lib/hooks/useAuth.ts` — client-side auth state hook with sync-to-server-cookie on every sign-in path
- [ ] MFA scaffold (Firebase second-factor)

### Mutation routes (auth-gated)
- [x] `POST /api/waitlist` — Zod-validated + session-cookie-verified + email-match-guarded, returns 409 on duplicate
- [x] `POST /api/intentions` — full-set replace in transaction (delete-then-insert)
- [x] `GET /api/intentions` — returns authenticated user's intention set ordered
- [x] `POST /api/shortlist` — add w/ note, ON CONFLICT UPDATE (idempotent)
- [x] `GET /api/shortlist` — authenticated user's saved destinations, newest first
- [x] `DELETE /api/shortlist` — remove by destinationId
- [x] `POST /api/intentions/rank` — Vertex Gemini ranking over `destinations_public`, flash/pro selectable, region-filterable
- [ ] Rate limiting via Upstash Ratelimit (or Cloud Run per-instance limiter)
- [ ] CSRF protection on all mutation routes

### Deploy (Cloud Run)
- [x] `Dockerfile` — multi-stage Node 20 alpine, Next.js standalone output, non-root user, ~200MB image
- [x] `.dockerignore` — excludes envs, logs, node_modules; keeps migrations IN image
- [x] `cloudbuild.yaml` — build + push + deploy + explicit allUsers IAM binding (Gate 6b gotcha fix)
- [x] `next.config.mjs` — `output: 'standalone'` for minimal Docker runtime
- [x] `GET /api/health` — Cloud Run liveness+readiness probe with DB latency check
- [ ] Neon → Cloud Run private networking (VPC connector)
- [ ] Domain mapping `destinations.foai.cloud` → Cloud Run service
- [ ] Secret Manager entries: `destinations-database-url`, `destinations-firebase-project-id`, `destinations-firebase-client-email`, `destinations-firebase-private-key`
- [ ] Cloud Build trigger wired to main branch of `foai` repo with destinations-ai path filter
- [ ] Service account `destinations-ai@${PROJECT_ID}.iam.gserviceaccount.com` with: Secret Manager Secret Accessor, Vertex AI User, Cloud SQL/Neon access

### Email + notifications
- [ ] SendGrid (or Resend) integration for waitlist confirmation emails
- [ ] Waitlist-notify cron job — when a region unlocks, iterate `region_waitlist WHERE notified=false` and mail
- [ ] Unsubscribe flow + `List-Unsubscribe` header

---

## Phase 3 — Real listing data + compliance + deploy

### Listing data source
- [ ] `ListingSource` interface in `src/lib/listings/source.ts` — pluggable adapter shape
- [ ] MLS feed contract (RETS or RESO Web API) — coastal GA/SC first, 30-60 day procurement
- [ ] `destination_listings` table migration (schema already designed in ARCHITECTURE.md)
- [ ] Nightly sync job (Cloud Run Job or Cloud Scheduler → Pub/Sub → worker)
- [ ] Image optimization pipeline — Next Image with remote MLS CDN allowlist
- [ ] Listing detail pages `/destinations/[slug]/listings/[id]`

### Legal + compliance
- [ ] Fair Housing Act copy audit — no protected-class language, equal housing logo
- [ ] ADA / WCAG 2.2 AA compliance — axe-core CI check, manual keyboard nav pass
- [ ] State real-estate disclosure pages (GA, SC initially)
- [ ] GDPR + CCPA privacy policy, cookie banner, DSAR flow
- [ ] Terms of Service
- [ ] Data Processing Agreement for any third-party data partner

### Deploy
- [ ] `Dockerfile` — multi-stage build matching foai Cloud Run pattern
- [ ] `.github/workflows/deploy-destinations.yml` — build, typecheck, lint, deploy
- [ ] Cloud Run service at `destinations-ai`, min-instances=0, concurrency=80
- [ ] Domain mapping `destinations.foai.cloud` → Cloud Run
- [ ] Neon connection pooling via PgBouncer endpoint (Neon serverless driver if needed)
- [ ] Secret Manager entries for DATABASE_URL, FIREBASE_ADMIN_CREDENTIAL_JSON, GOOGLE_APPLICATION_CREDENTIALS
- [ ] Staging environment + preview deploys per PR

### Observability
- [ ] Sentry SDK (browser + server) with source maps
- [ ] Structured JSON logs → Cloud Logging
- [ ] Cloud Monitoring dashboard — p95 latency per route, error rate, DB pool saturation
- [ ] Alerting: PagerDuty or email on error rate / latency SLO breach
- [ ] Uptime checks on `/api/destinations` (synthetic ping)

### Performance
- [ ] Lighthouse CI budget: ≥90 performance, 100 accessibility, ≥90 SEO
- [ ] WebP/AVIF image formats with responsive sizes
- [ ] Font subsetting (Geist already subsettable via `geist/font/*`)
- [ ] Map tile prefetch for default viewport
- [ ] Bundle analysis + route-level dynamic imports for heavy components (3D Tiles especially)

### Testing
- [ ] Unit tests for `validation.ts` schemas (edge cases on all refinements)
- [ ] Integration tests for API routes (Playwright or Vitest against local Neon)
- [ ] E2E smoke — Playwright drives the discovery flow end-to-end
- [ ] Accessibility — axe + NVDA keyboard nav
- [ ] Load test — k6 run against staging, document p95 budget

### Owner-ready
- [ ] Full SEO: sitemap.xml, robots.txt, structured data (RealEstateListing schema.org)
- [ ] Open Graph + Twitter card images per destination
- [ ] Analytics via a privacy-first provider (Plausible or self-hosted Umami)
- [ ] Status page at `destinations.foai.cloud/status`

---

## What "commercial ready" means when all of the above are checked

A visitor can:
- Land on `destinations.foai.cloud`, see a cinematic 3D (or MapLibre-dark) map of the Coastal GA corridor
- Hover any of the 5 live destinations to see Neighborhood Pulse — real walk/noise/school data from licensed sources
- Stack natural-language intentions ("walkable coastal, good schools, under $850k") and see Vertex-ranked results
- Shortlist destinations, see real MLS listings for each
- Join a region waitlist and get a real email when that region unlocks
- Complete everything with full Fair Housing + ADA + GDPR compliance
- Under SLO, observable, with on-call rotation and legal coverage

That's the bar. Phase 1 ships the foundation that every subsequent phase builds on without rework.
