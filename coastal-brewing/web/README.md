# Coastal Brewing — Web (Next.js)

Customer-facing UI for `brewing.foai.cloud`. Talks to the existing FastAPI runner via rewrites.

## Local dev

```bash
cd web
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_BASE to http://localhost:8000 if running FastAPI locally
npm run dev
```

## Production

`Dockerfile` produces a `next start` standalone image. nginx in front:

```
brewing.foai.cloud
  /api/*         → FastAPI :8000 (rewrite, kept inside Next.js)
  /route, /run   → FastAPI :8000
  /check         → FastAPI :8000
  /approve/*     → FastAPI :8000
  /healthz       → FastAPI :8000
  /*             → Next.js  :3000
```

## Surfaces

| Path | Purpose |
|---|---|
| `/` | Hero + Team ribbon + Featured catalog |
| `/products` | Full catalog (filterable by category) |
| `/products/[slug]` | Product detail + inline ChatPanel |
| `/chat` | Full ChatGPT-style surface (Sales + Marketing) |
| `/team` | Meet the team (Sales + Marketing cards, 3D trigger feature-flagged) |
| `/cart`, `/checkout` | Cart + Stripe Elements (TODO) |
| `/audit/[task_id]`, `/me`, `/admin/margin` | Owner-only — preserved on FastAPI for now |

## Backend contract (`lib/api.ts`)

- `GET  /api/catalog` → `{ products: Product[] }`
- `GET  /api/catalog/:slug` → `Product`
- `POST /api/recommend` → `{ bundle: Product[], rationale: string }`
- `POST /api/chat/send` → `{ reply: ChatMessage, session_id: string }`
- `GET  /healthz`

If a backend endpoint isn't live yet, surfaces degrade gracefully (empty grid + "Catalog is loading…" copy).
