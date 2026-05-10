# Deploy plan — `hawk-ui` to myclaw-vps (Path B)

> **Status:** plan-mode. Awaiting owner sign-off before execution.
> **Risk:** medium — touches Traefik labels on a production gateway. Single PR revertable.

## What changes on the box

1. **Build the image** locally on myclaw-vps and tag it `hawk-ui:0.1.0`.
2. **Add a new service** `hawk-ui` to `/docker/chicken-hawk/docker-compose.yml`.
3. **Update Traefik labels** on the existing `hawk-gateway` service to scope its routes to its API surface only.
4. **Restart** both services together so Traefik re-discovers routes atomically.

## docker-compose.yml diff

```yaml
services:
  # --- existing hawk-gateway service: tighten Traefik rules ---
  hawk-gateway:
    # ... unchanged image, env, volumes, healthcheck ...
    labels:
    - traefik.enable=true
    # OLD: Host(`hawk.foai.cloud`) || Host(`app.myclaw.foai.cloud`)
    # NEW: same host(s), but only API paths.
    - "traefik.http.routers.hawk-prod.rule=(Host(`hawk.foai.cloud`) || Host(`app.myclaw.foai.cloud`)) && (PathPrefix(`/run`) || PathPrefix(`/check`) || PathPrefix(`/audit`) || PathPrefix(`/api/public`) || PathPrefix(`/api/chicken-hawk`) || PathPrefix(`/health`) || PathPrefix(`/internal`) || PathPrefix(`/me`) || PathPrefix(`/logout`) || PathPrefix(`/risk-event`) || PathPrefix(`/risk-events`) || PathPrefix(`/hawks`) || PathPrefix(`/login/verify`))"
    - traefik.http.routers.hawk-prod.entrypoints=websecure
    - traefik.http.routers.hawk-prod.tls.certresolver=letsencrypt
    - traefik.http.routers.hawk-prod.priority=200
    - traefik.http.services.hawk-prod.loadbalancer.server.port=8000

  # --- NEW: Next.js hawk-ui ---
  hawk-ui:
    image: hawk-ui:0.1.0
    restart: unless-stopped
    mem_limit: 512m
    environment:
      NEXT_PUBLIC_GATEWAY_URL: http://hawk-gateway:8000
      PORT: '3010'
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "-", "http://localhost:3010/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    labels:
    - traefik.enable=true
    - "traefik.http.routers.hawk-ui.rule=Host(`hawk.foai.cloud`) || Host(`app.myclaw.foai.cloud`)"
    - traefik.http.routers.hawk-ui.entrypoints=websecure
    - traefik.http.routers.hawk-ui.tls.certresolver=letsencrypt
    - traefik.http.routers.hawk-ui.priority=10
    - traefik.http.services.hawk-ui.loadbalancer.server.port=3010
```

## Routing semantics after the change

| Path | Lands on |
|---|---|
| `GET /` | hawk-ui (Next.js customer chat hero) |
| `GET /about` | hawk-ui |
| `GET /login` | hawk-ui (shader sign-in page) |
| `GET /tools/*` | hawk-ui (Tool Chest panels) |
| `POST /api/public/chat` | hawk-gateway (FastAPI public-chat router) |
| `POST /run` | hawk-gateway |
| `POST /check` | hawk-gateway |
| `GET /audit/{task_id}` | hawk-gateway |
| `GET /audit/integrity-check` | hawk-gateway |
| `POST /chat` | hawk-gateway (operator-tier chat) |
| `POST /login/verify` | hawk-gateway (auth.py — magic-link verification) |
| `GET /me` / `GET /logout` | hawk-gateway |
| `GET /hawks` | hawk-gateway |
| `POST /risk-event` / `GET /risk-events` | hawk-gateway |
| `GET /api/chicken-hawk/live-plan` | hawk-gateway |
| `GET /health` / `GET /internal/health` | hawk-gateway |

The Next.js app's own server-side proxy (`/api/gateway/:path*` rewrite) talks
to `hawk-gateway:8000` over the docker-internal network — so an in-page form
posting to `/api/gateway/login` ends up at `hawk-gateway:/login`, with bearer
cookie forwarded.

## Sequence

```bash
# On myclaw-vps:

# 1. Sync the source
cd /docker/chicken-hawk
ls hawk-ui/    # confirm scaffold landed (shipped from local)

# 2. Build the image
cd hawk-ui && docker build -t hawk-ui:0.1.0 . && cd ..

# 3. Apply the compose diff above to /docker/chicken-hawk/docker-compose.yml

# 4. Restart both services together (Traefik label change + new container)
docker compose up -d hawk-gateway hawk-ui

# 5. Smoke test
curl -fsS https://hawk.foai.cloud/health | jq .
curl -fsS https://hawk.foai.cloud/                                           # 200, Next.js HTML
curl -fsS https://hawk.foai.cloud/about                                      # 200, Next.js HTML
curl -i https://hawk.foai.cloud/tools                                         # should 200 if logged-in else 200 (page renders, panels themselves auth-fail and redirect)
curl -fsS -X POST https://hawk.foai.cloud/api/public/chat \
  -H 'Content-Type: application/json' -d '{"message":"hi"}'                   # 200 (or 502 until LiteLLM keys rotate)
TOKEN=$(docker exec chicken-hawk-hawk-gateway-1 sh -c 'echo $GATEWAY_SECRET')
curl -fsS -H "Authorization: Bearer $TOKEN" \
  https://hawk.foai.cloud/audit/integrity-check                              # 200 from gateway
```

## Rollback

```bash
# Single revert: restore the original Traefik rule on hawk-gateway, stop hawk-ui.
cd /docker/chicken-hawk
git checkout docker-compose.yml   # if compose lives in git
docker compose up -d hawk-gateway
docker compose stop hawk-ui && docker compose rm -f hawk-ui
```

The static-HTML Tool Chest I shipped 90 minutes ago is still in
`/docker/chicken-hawk/gateway/templates/` — when the gateway reverts to its
original `Host(...)` catch-all rule, those routes light back up automatically.

## Open questions before deploy

1. **Sync mechanism**: tar-pipe from local (same pattern I've been using), or set up a deploy script? Tar-pipe is fastest for first cut.
2. **NPM install size**: ~250 MB of node_modules baked into the image; final standalone build is ~120 MB. Acceptable on this VPS.
3. **Old HTML cleanup**: leave the FastAPI templates in place as a fallback for now, or delete them post-deploy? Recommend leaving for the first 7 days as a safety net.
4. **`app.myclaw.foai.cloud` parity**: existing rule includes both hosts. Diff above keeps both for hawk-ui. Confirm `app.myclaw.foai.cloud` should also see the new UI — if it's openclaw-only, drop that host from hawk-ui's rule.
