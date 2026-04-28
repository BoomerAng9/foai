# `@chicken-hawk/hawk-ui`

> Chicken Hawk is our Super Agent — built by ACHIEVEMOR, deployed in our own
> autonomous operations, in the same class as OpenClaw.

The customer-facing + operator-facing web surface for Chicken Hawk. Lives at
`hawk.foai.cloud` alongside the FastAPI gateway (which keeps owning the API
paths at the same host, behind a Traefik PathPrefix priority split).

## Surfaces

| Path | What | Auth |
|---|---|---|
| `/` | Customer chat hero (cyberpunk port-noir register) | anon, rate-limited |
| `/about` | CH positioning page | anon |
| `/login` | Operator sign-in (animated dot-grid background → email → 6-digit code) | anon |
| `/tools` | Tool Chest overview (daylight ops register) | operator |
| `/tools/autoresearch` | Self-improvement engine (status: coming soon) | operator |
| `/tools/nemoclaw` | Policy-Gate verdict tester + risk-event feed | operator |
| `/tools/hermes` | Agent runtime channels + skills | operator |
| `/tools/lil-hawks` | Lil_Hawk roster | operator |
| `/tools/cron` | Scheduled jobs (read-only) | operator |
| `/tools/audit` | Tamper-evident receipt-chain browser + integrity check | operator |

## Architecture

```
            hawk.foai.cloud
                  │
            ┌─────┴─────┐
            │  Traefik  │
            └─┬───────┬─┘
              │       │
   priority 200       priority 10
   (PathPrefix       (Host-only,
    carve-outs)       catch-all)
              │       │
              ▼       ▼
   chicken-hawk    hawk-ui (this app)
    -gateway-1    Next.js 14 standalone
    FastAPI         on :3010
    on :8000
```

The Next.js app **never owns auth state** — it forwards bearer tokens / cookies
through `/api/gateway/:path*` rewrites to the FastAPI gateway. Auth lives in
one place (FastAPI's `auth.py`), the UI is just a prettier mouth.

## Brand language

Two registers, anchored to owner reference images:

| Surface | Palette | Reference |
|---|---|---|
| Customer (`/`, `/about`, `/login`) | Cyberpunk port-noir — `--hawk-orange #FF6B35` + `--hawk-jet #1488FC` on `#0c0d10` deep-navy | Image 3 (CHICKENHAWK mech) |
| Operator (`/tools/*`) | Daylight container yard — `--ops-aims #D4A64A` warm orange on `#1a1815` warm dark | Image 4 (Boomer_Angs at Port) |

The split is intentional: customers see the cinematic cyberpunk hero; operators
see the workhorse register that mirrors how AIMS containers feel in the yard.

## Components

Inspired by the spec doc Rish provided:

- `ray-background.tsx` — the bolt.new-style ray gradient, re-painted with hawk-orange + jet-blue
- `hawk-chat-input.tsx` — chat input with model selector slot (defer to Wave 2)
- `dot-grid-canvas.tsx` — animated dot-grid for the sign-in flow (CSS-canvas; can be upgraded to the full WebGL `CanvasRevealEffect` from `sign-in-flow-1.tsx` later)
- `super-agent-badge.tsx` — the "Super Agent · ACHIEVEMOR" announcement pill
- `hawk-footer.tsx` — framer-motion animated footer
- `tools-nav.tsx` — operator sidebar with active-route highlight

`framer-motion`, `lucide-react`, `vaul`, `@radix-ui/*`, `react-easy-crop`, and
`three` are pre-installed — the remaining components from the spec doc
(`modal.tsx`, `avatar-uploader.tsx`, `hero-ascii-one.tsx`) drop in cleanly when
needed for future Tool Chest features (modal confirmations, operator profile,
hero splash variants).

## Local dev

```bash
cd ~/foai/chicken-hawk/hawk-ui
npm install
npm run dev          # serves on http://localhost:3010
```

Set `NEXT_PUBLIC_GATEWAY_URL` if the gateway is reachable somewhere other than
the docker-internal default `http://hawk-gateway:8000`.

## Production build

```bash
npm run build && npm start
```

Or via Docker (used in production):

```bash
docker build -t hawk-ui:latest .
docker run -p 3010:3010 -e NEXT_PUBLIC_GATEWAY_URL=https://hawk.foai.cloud hawk-ui:latest
```

## Environment

| Var | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_GATEWAY_URL` | FastAPI gateway base URL (used by `next.config.mjs` rewrites) | `http://hawk-gateway:8000` |
| `PORT` | Container listen port | `3010` |

The Next.js side never reads gateway secrets — it only forwards requests.
