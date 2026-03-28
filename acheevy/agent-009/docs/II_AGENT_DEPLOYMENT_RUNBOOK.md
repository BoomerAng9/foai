# ii-agent Deployment Runbook (Production)

This runbook is for **Agent-ACHEEVY-009** deployment only.

## 1) Prerequisites

- Docker Engine + Docker Compose available on VPS
- Ports available: `1420`, `8000`, `8100`, `1236`, `5432`, `6379`
- Valid `OPENROUTER_API_KEY`

## 2) Configure environment

```bash
cp docker/.stack.env.example docker/.stack.env
```

Required minimum values in `docker/.stack.env`:

- `OPENROUTER_API_KEY`
- `DATABASE_URL`
- `SANDBOX_DATABASE_URL`

Policy-layer rollout values:

- `POLICY_LAYERS_ENABLED=true`
- `POLICY_LAYERS_SHADOW_MODE=true` for first production pass
- `POLICY_LAYERS_EMIT_DEBUG_EVENTS=true`
- `VITE_POLICY_DEBUG_EVENTS=true` (optional, temporary for operator visibility)

Recommended for production:

- `PUBLIC_TOOL_SERVER_URL` (public URL if externally reachable)
- `GOOGLE_APPLICATION_CREDENTIALS` (for storage/media integrations)

Optional for AIMS bridge mode (ii-agent running standalone, linked to AIMS):

- `AIMS_BRIDGE_ENABLED=true`
- `AIMS_GATEWAY_URL` (for example `https://api.aims.plugmein.cloud`)
- `AIMS_BRIDGE_SHARED_SECRET` (shared secret used by bridge handshake)

## 3) Start stack

### VPS (recommended)

SSH to your VPS and run:

```bash
cd /path/to/Agent-ACHEEVY-009
cp docker/.stack.env.example docker/.stack.env
# fill docker/.stack.env with real credentials
./scripts/publish_stack.sh --build
```

Optional tunnel profile:

```bash
./scripts/publish_stack.sh --build --with-tunnel
```

### Windows PowerShell

```powershell
./scripts/publish_stack.ps1 -Build
```

Optional tunnel profile:

```powershell
./scripts/publish_stack.ps1 -Build -WithTunnel
```

### Bash (Linux/macOS/WSL)

```bash
./scripts/publish_stack.sh --build
```

Optional tunnel profile:

```bash
./scripts/publish_stack.sh --build --with-tunnel
```

## 4) Verify health

- Frontend: `http://localhost:1420`
- Backend health: `http://localhost:8000/health`
- Sandbox health: `http://localhost:8100/health`
- Tool server health: `http://localhost:1236/health`

If AIMS bridge mode is enabled:

- Bridge health: `http://localhost:8000/bridge/health`
- Bridge handshake: `POST http://localhost:8000/bridge/handshake` with header `X-II-BRIDGE-KEY`

## 5) Policy Layer Rollout (Production)

Use the route helper script to enforce exact phase flags:

```bash
./scripts/policy_rollout.sh --phase shadow --build
./scripts/policy_rollout.sh --phase enforced --build
./scripts/policy_rollout.sh --phase hardened --build
./scripts/policy_rollout.sh --phase rollback --build
```

PowerShell equivalent:

```powershell
./scripts/policy_rollout.ps1 -Phase shadow -Build
./scripts/policy_rollout.ps1 -Phase enforced -Build
./scripts/policy_rollout.ps1 -Phase hardened -Build
./scripts/policy_rollout.ps1 -Phase rollback -Build
```

Run UAT prechecks + prompt matrix at each phase:

```bash
./scripts/policy_uat.sh --phase shadow
./scripts/policy_uat.sh --phase enforced
./scripts/policy_uat.sh --phase hardened
```

PowerShell equivalent:

```powershell
./scripts/policy_uat.ps1 -Phase shadow
./scripts/policy_uat.ps1 -Phase enforced
./scripts/policy_uat.ps1 -Phase hardened
```

### Phase A — Shadow mode (safe)

Set in `docker/.stack.env`:

```bash
POLICY_LAYERS_ENABLED=true
POLICY_LAYERS_SHADOW_MODE=true
POLICY_LAYERS_EMIT_DEBUG_EVENTS=true
VITE_POLICY_DEBUG_EVENTS=true
```

Deploy:

```bash
./scripts/policy_rollout.sh --phase shadow --build
```

Verify:

- In chat UI, confirm **Policy Debug** card appears.
- Confirm strategy + selected layers are visible.
- Confirm user responses are unchanged in quality/latency baseline.

### Phase B — Enforced mode

After stable shadow observations, set:

```bash
POLICY_LAYERS_ENABLED=true
POLICY_LAYERS_SHADOW_MODE=false
POLICY_LAYERS_EMIT_DEBUG_EVENTS=true
VITE_POLICY_DEBUG_EVENTS=false
```

Redeploy:

```bash
./scripts/policy_rollout.sh --phase enforced --build
```

Verify:

- Chat still returns correct outputs across coding/research/deploy prompts.
- Backend logs show policy diagnostics events without errors.
- No regression in `/health` endpoints.

### Phase C — Hardened steady state

For normal production once validated:

```bash
POLICY_LAYERS_ENABLED=true
POLICY_LAYERS_SHADOW_MODE=false
POLICY_LAYERS_EMIT_DEBUG_EVENTS=false
VITE_POLICY_DEBUG_EVENTS=false
```

Apply + deploy:

```bash
./scripts/policy_rollout.sh --phase hardened --build
```

## 6) Rollback

Immediate rollback to legacy behavior:

```bash
./scripts/policy_rollout.sh --phase rollback --build
```

## 7) Operations

Show status:

```bash
docker compose --project-name ii-agent-stack --env-file docker/.stack.env -f docker/docker-compose.stack.yaml ps
```

Tail backend logs:

```bash
docker compose --project-name ii-agent-stack --env-file docker/.stack.env -f docker/docker-compose.stack.yaml logs -f backend
```

Stop stack:

```bash
docker compose --project-name ii-agent-stack --env-file docker/.stack.env -f docker/docker-compose.stack.yaml down
```

## 8) Common failures

- **`OPENROUTER_API_KEY is missing or placeholder`**
  - Fix key in `docker/.stack.env`, then rerun publish script.
- **Docker daemon unavailable**
  - Start Docker Engine service and retry.
- **Health check timeout**
  - Inspect logs for failing service (`backend`, `sandbox-server`, or `tool-server`).

- **Policy Debug card not visible in shadow mode**
  - Ensure `POLICY_LAYERS_EMIT_DEBUG_EVENTS=true` on backend and `VITE_POLICY_DEBUG_EVENTS=true` for frontend build.
  - Rebuild frontend image after changing frontend `VITE_*` env values.

- **Unexpected behavior after enabling enforced mode**
  - Set `POLICY_LAYERS_SHADOW_MODE=true` first, validate selected layers, then re-enable enforcement.
