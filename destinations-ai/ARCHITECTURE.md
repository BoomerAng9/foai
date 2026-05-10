# Destinations AI — Architecture

## System shape

```
              ┌────────────────────┐
              │ Browser (Next 15)  │
              │ DestinationsCanvas │
              │ ┌────────────────┐ │
              │ │ MapLibre  OR   │ │
              │ │ Google 3D      │ │ ← NEXT_PUBLIC_MAP_PROVIDER
              │ │ (useMap ctx)   │ │
              │ └────────────────┘ │
              └─────────┬──────────┘
                        │ fetch /api/*
                        ▼
              ┌────────────────────┐
              │ Next.js route      │
              │ handlers           │
              │ ─ requireDb()      │
              │ ─ Zod parse        │
              │ ─ Firebase verify  │ (Phase 2, mutation routes)
              └─────────┬──────────┘
                        │ postgres
                        ▼
              ┌────────────────────┐    ┌──────────────────────┐
              │ Neon Postgres      │    │ Vertex AI · Gemini   │
              │ 3 tables:          │    │ (server-side only)   │
              │ ─ destinations     │    │ rankDestinations()   │
              │ ─ coming_soon      │    │ ─ flash for chip ops │
              │ ─ region_waitlist  │    │ ─ pro for deep rank  │
              │ ─ user_intentions  │    └──────────────────────┘
              │ ─ user_shortlists  │
              └────────────────────┘
```

## Data contracts

Every row returned from the DB flows through a **Zod schema** (`src/lib/validation.ts`) before
reaching the client. Rows that fail validation are dropped from the response and logged —
never silently passed through. This is the "defense in depth" discipline for production data.

### Destination

```ts
{
  destinationId: string;
  name: string;
  region: string;
  state: string;                    // 2-letter
  coordinates: { lat, lng };
  medianHomePrice: number | null;
  listingCount: number;
  pulse: {
    walkScore: number | null;       // 0-100
    noiseDbRange: [min, max] | null;
    schoolRating: number | null;    // 0-10
    vibeDescriptors: string[];
    ambientColor: string;           // hex
  };
  heroText: string | null;
  summary: string | null;
}
```

### ComingSoonRegion

```ts
{
  regionId: string;
  name: string;
  geographicArea: string;
  centerCoordinates: { lat, lng };
  ambientPalette: [hex, hex, hex];
  destinationCount: number;
  estimatedUnlockQuarter: string;   // "Q3 2026"
  flagshipDestinations: string[];
  regionVibe: string[];
  waitlistCount: number;
  summary: string | null;
  displayOrder: number;
}
```

## Map provider contract

Two concrete providers share the same `MapContextValue` interface (`src/lib/map/provider.ts`).
Overlay components (pins, pulse cards, drawers) never touch the underlying renderer —
they call `useMap()` to get `project(lngLat) → {x,y}` and `flyTo(target)` bound to the live
map instance.

This means the **entire Phase 2 overlay tree works against both providers unchanged**.
Swapping between MapLibre and Google 3D Tiles is a build-time env flip or a runtime
query-string `?map=google3d` for A/B testing.

### MapLibre (default)

- Package: `maplibre-gl` 4.x
- Tiles: MapTiler dataviz-dark (free tier — 100k loads/mo)
- Style: vector, 2D, custom-tuned dark palette
- Cost: free up to tier, MapTiler subscription above

### Google 3D Tiles (premium)

- Package: `google.maps.Map3DElement` via the Maps JavaScript API (`v=alpha` libraries=maps3d)
- Tiles: Photorealistic 3D — GA April 2026
- Style: photorealistic 3D mesh
- Cost: metered per load (Maps Platform billing)
- Implementation: `<gmp-map-3d>` Web Component, dynamically loaded on mount

## AI ranking (Vertex)

`rankDestinations()` in `src/lib/vertex.ts` takes:
- the caller's destination array
- the user's weighted intention set

and calls `gemini-2.5-flash` (or `-pro` for deep rank) via `@google/genai` in Vertex mode,
returning an ordered score list. Server-side only — the client never has Vertex credentials.

Prompt discipline:
- Structured JSON output via `responseSchema`
- `temperature: 0.2` for consistency
- Parse failures are logged and return `[]`, never throw into the route

## Caching

| Layer | Strategy |
|---|---|
| `/api/destinations` | `s-maxage=60, stale-while-revalidate=300` |
| `/api/destinations/[id]` | `s-maxage=120, stale-while-revalidate=600` |
| `/api/coming-soon` | `s-maxage=300, stale-while-revalidate=900` |
| Client fetch | `no-store` on SSR payload; component-level SWR recommended Phase 2 |

## Security

- All DB access gated by `requireDb()` — returns 503 when DATABASE_URL is missing
- Firebase token verification gates mutation routes (Phase 2 addition)
- Input validation via Zod on every route (parse + safe parse defense in depth)
- Production headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (set in `next.config.mjs`)
- Secrets via env — `.env.local` gitignored, production via Cloud Run env
- No tokens in client bundles beyond `NEXT_PUBLIC_*` vars (intentional public keys only)

## Deployment target

**Cloud Run**, project `ai-managed-services`, region `us-central1`.
Domain mapping: `destinations.foai.cloud → <cloud-run-service>` via foai DNS on Cloudflare.

CI/CD, image registry, and deploy config: Phase 2 (see `PRODUCTION_CHECKLIST.md`).
