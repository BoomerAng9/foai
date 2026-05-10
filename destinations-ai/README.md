# Destinations AI

Place-first real-estate discovery for the ACHIEVEMOR ecosystem. Lives at **destinations.foai.cloud**.

Not properties — **destinations**. The platform leads with the place you want to live (its walkability, ambient noise, schools, vibe), then surfaces the listings that fit.

---

## Stack

- **Next.js 15** App Router · React 19 · TypeScript 5.7 strict
- **Tailwind CSS 3** · Framer Motion 12 · Geist Sans / Geist Mono
- **Neon Postgres** via `postgres` npm package (matches foai convention — see `perform/src/lib/db.ts`)
- **Firebase** admin + client for auth
- **Google Cloud Vertex AI** via `@google/genai` for intention-ranked destination matching
- **Maps:** MapLibre GL JS (free tier via MapTiler) **or** Google Maps Photorealistic 3D Tiles — swap via `NEXT_PUBLIC_MAP_PROVIDER`

## Layout

```
destinations-ai/
├─ migrations/            numbered SQL migrations (Neon)
├─ scripts/               migrate.ts · seed.ts
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ destinations/
│  │  │  └─ coming-soon/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  └─ globals.css
│  ├─ components/
│  │  └─ DestinationsCanvas.tsx
│  └─ lib/
│     ├─ db.ts            Neon client
│     ├─ validation.ts    Zod schemas
│     ├─ vertex.ts        Gemini ranking (server-only)
│     └─ map/
│        ├─ provider.ts   MapContext + useMap() + resolveProvider()
│        ├─ maplibre.tsx  MapLibre provider
│        └─ google3d.tsx  Google Photorealistic 3D Tiles provider
├─ package.json
├─ tsconfig.json
├─ next.config.mjs
├─ tailwind.config.ts
├─ postcss.config.mjs
├─ .env.example
├─ ARCHITECTURE.md        system design
└─ PRODUCTION_CHECKLIST.md honest Phase 2/3 hand-off
```

## Local setup

```bash
cd ~/foai/destinations-ai
cp .env.example .env.local         # then fill in DATABASE_URL + keys
npm install
npm run db:migrate                  # applies /migrations in order
npm run db:seed                     # loads 5 live + 8 coming-soon regions
npm run dev                         # http://localhost:3000
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Next lint |
| `npm run db:migrate` | Apply SQL migrations via `scripts/migrate.ts` |
| `npm run db:seed` | Seed curated destinations + Coming Soon regions |

## Map provider swap

```bash
# Free tier — vector tiles via MapTiler (default)
NEXT_PUBLIC_MAP_PROVIDER=maplibre
NEXT_PUBLIC_MAPTILER_KEY=...

# Photorealistic 3D Tiles — cinematic, metered via Google Maps Platform
NEXT_PUBLIC_MAP_PROVIDER=google3d
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

Query-string override for A/B — `?map=google3d` on any page.

## Further reading

- `ARCHITECTURE.md` — system design, data flow, provider contracts
- `PRODUCTION_CHECKLIST.md` — what Phase 1 ships vs. what Phase 2/3 own
- Prototype reference: `C:\Users\rishj\Projects\destinations-ai-prototype\` (browser-globals JSX sandbox used to validate the visual direction before this production port)

## Session provenance

Phase 1 foundation committed 2026-04-19. Follows foai monorepo conventions (Next.js 15 + React 19 + `postgres` npm + Firebase + Tailwind + Framer Motion) established in `perform/` and `cti-hub/`.
