# Paperclip Control Plane

Paperclip is the Coastal Brewing AI workforce control plane: org chart, goals,
agent budgets, approval threads, liveness, and issue history. This pass deploys
Paperclip `v2026.427.0` with a dedicated Postgres service on aims-vps. It does
not migrate Coastal AuditLedger; `coastal-runner` keeps using SQLite until the
ledger adapter is intentionally changed.

## Services

`paperclip-postgres`
: Postgres 16 for Paperclip only. Persistent volume:
  `paperclip-postgres-data`.

`paperclip`
: Paperclip built from `https://github.com/paperclipai/paperclip.git#v2026.427.0`.
  Local image tag: `paperclip:v2026.427.0`. Persistent volume:
  `paperclip-data`.

Paperclip binds to `127.0.0.1:3100:3100`. Do not expose it publicly until nginx,
TLS, and owner-only access are configured deliberately.

## Required Secrets

Set these in the aims-vps Coastal `.env` before first boot:

```bash
PAPERCLIP_POSTGRES_PASSWORD="$(openssl rand -hex 32)"
PAPERCLIP_BETTER_AUTH_SECRET="$(openssl rand -hex 32)"
PAPERCLIP_PUBLIC_URL="https://paperclip.foai.cloud"
```

Optional model-provider keys can be added later if Paperclip-managed agents
need direct model access. Existing Hermes and Chicken Hawk lanes remain the
execution surfaces for this first deployment.

## Deploy On aims-vps

```bash
cd /root/foai/coastal-brewing
docker compose config
docker compose build paperclip
docker compose up -d paperclip-postgres paperclip
```

Verify:

```bash
docker compose ps paperclip-postgres paperclip coastal-runner hermes
docker exec paperclip-postgres pg_isready -U paperclip -d paperclip
curl -I http://127.0.0.1:3100
docker compose logs --tail 120 paperclip | grep -Ei "migration|database|error|listening|ready"
curl -fsS http://127.0.0.1:8080/healthz
docker inspect --format="{{.State.Status}}" hermes
```

Expected results:

- Postgres is healthy.
- Paperclip serves on localhost port `3100`.
- Paperclip logs do not show migration or database failures.
- `coastal-runner` still returns healthy.
- `hermes` remains running and unchanged.

## First-Run Onboarding

After Paperclip is reachable through an SSH tunnel or protected reverse proxy,
run onboarding inside the container:

```bash
docker exec -it paperclip pnpm paperclipai onboard
```

Seed Coastal as a single company:

- Board / owner: ACHEEVY plus the human owner approval role.
- Department leads: Boomer_Ang sales, marketing, operations, finance, CX, and quality.
- Workers: Lil_Hawk task workers with narrowly scoped recurring work.
- Existing execution surfaces: Hermes for inbound owner command; Chicken Hawk
  for guard-gated dispatch and audit retrieval.
- Budgets: start advisory and low; no autonomous spend, send, publish, order,
  refund, or sign action may bypass the existing owner approval boundary.

## Backup

Postgres dump:

```bash
docker exec paperclip-postgres pg_dump -U paperclip paperclip > paperclip-$(date -u +%Y%m%dT%H%M%SZ).sql
```

Paperclip volume archive:

```bash
docker run --rm -v coastal-brewing_paperclip-data:/paperclip -v "$PWD":/backup alpine \
  tar -czf /backup/paperclip-data-$(date -u +%Y%m%dT%H%M%SZ).tgz -C /paperclip .
```

## Rollback

Stop Paperclip without touching Coastal runner or Hermes:

```bash
docker compose stop paperclip paperclip-postgres
```

Remove containers while preserving data volumes:

```bash
docker compose rm -f paperclip paperclip-postgres
```

Only delete volumes after a confirmed backup and explicit owner approval:

```bash
docker volume rm coastal-brewing_paperclip-data coastal-brewing_paperclip-postgres-data
```
