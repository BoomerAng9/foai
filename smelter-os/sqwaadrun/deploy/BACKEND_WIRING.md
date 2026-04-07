# Sqwaadrun Backend Wiring — Puter + GCS + Neon

**Status:** Code-ready. Execution-pending. Follow the sequence below.

---

## The rule

> **Puter is home. GCS is scale. Both write. Neither blocks.**

| Layer | Purpose |
|---|---|
| **Puter** (self-hosted) | Smelter OS native storage. Mission manifests, results, doctrine journal, Chronicle Ledger (heartbeats), ingots, media. |
| **GCS** (`foai-aims`) | Scalable + CDN-fronted delivery. Raw scrape artifacts, public ingots, media delivery, backup mirror for doctrine. |
| **Neon** (existing) | Structured queryable data only — `sqwaadrun_staging.*`, `profiles.sqwaadrun_*` columns, Stripe webhook state. |

---

## Storage routing matrix

| Write | Puter path | GCS bucket / path | Neon |
|---|---|---|---|
| `store_mission_result()` | `/smelter-os/sqwaadrun/missions/{id}/results.json` | `foai-sqwaadrun-artifacts/{id}/results.json` | `mission_log` row (TRCC pipeline) |
| `store_mission_manifest()` | `/smelter-os/sqwaadrun/missions/{id}/manifest.json` | `foai-sqwaadrun-artifacts/{id}/manifest.json` | — |
| `store_mission_artifact()` | `/smelter-os/sqwaadrun/missions/{id}/artifacts/{name}` | `foai-sqwaadrun-artifacts/{id}/artifacts/{name}` | `scrape_artifact` row |
| `store_ingot()` | `/smelter-os/ingots/{format}/{id}` | `foai-ingots/{format}/{id}` (public) | — |
| `store_media()` | `/smelter-os/media/{type}/{id}` | `foai-media/{type}/{id}` (public) | — |
| `log_heartbeat()` | `/smelter-os/chronicle/ledger/heartbeat-{ts}.json` | **NEVER** | — |
| `log_doctrine()` | `/smelter-os/sqwaadrun/doctrine/entries/doctrine-{ts}.json` + local `doctrine.jsonl` | `foai-backups/doctrine/doctrine-{ts}.json` | — |

---

## 9-step deployment sequence

Execute in order. Each step is independent — if one fails, the earlier steps remain good.

### Step 0 — Deploy Puter on Hostinger VPS

```bash
ssh hostinger-vps
mkdir -p /opt/smelter && cd /opt/smelter

# Copy smelter-os/docker-compose.puter.yml from this repo to /opt/smelter/
# Ensure the smelter-net Docker network exists:
docker network inspect smelter-net >/dev/null 2>&1 || docker network create smelter-net

docker compose -f docker-compose.puter.yml up -d

# Verify
curl http://localhost:4100/status
```

### Step 1 — Create GCS buckets

```bash
cd smelter-os/sqwaadrun
./deploy/create-gcs-buckets.sh
```

Creates all 4 buckets, sets the 90-day lifecycle on `foai-sqwaadrun-artifacts`, and grants public read on `foai-ingots` + `foai-media`. Idempotent.

### Step 2 — Apply Neon migrations

```bash
psql "$NEON_DATABASE_URL" -f ../../cti-hub/sql/008_sqwaadrun_addon_neon.sql
psql "$NEON_INGEST_DSN"   -f migrations/001_sqwaadrun_staging.sql
```

Adds `profiles.sqwaadrun_*` columns on the public schema and creates the full `sqwaadrun_staging` schema with promotion functions.

### Step 3 — Create Stripe products

Stripe dashboard → Products → **+ New product** × 3:

| Product | Monthly price | Price ID env var |
|---|---|---|
| Sqwaadrun Solo | \$29 | `NEXT_PUBLIC_STRIPE_SQWAADRUN_SOLO_PRICE_ID` |
| Sqwaadrun Sqwaad | \$79 | `NEXT_PUBLIC_STRIPE_SQWAADRUN_SQWAAD_PRICE_ID` |
| Sqwaadrun Commander | \$299 | `NEXT_PUBLIC_STRIPE_SQWAADRUN_COMMANDER_PRICE_ID` |

Plus the Deploy-customer discount coupon:
- Stripe dashboard → Coupons → New → 20% off → copy ID → set `STRIPE_SQWAADRUN_DEPLOY_DISCOUNT_COUPON`.

### Step 4 — Secret Manager

```bash
gcloud config set project foai-aims

gcloud secrets create SQWAADRUN_API_KEY --data-file=<(openssl rand -hex 32)
gcloud secrets create NEON_INGEST_DSN   --data-file=<(echo "$NEON_INGEST_DSN")
gcloud secrets create NEON_DATABASE_URL --data-file=<(echo "$NEON_DATABASE_URL")
gcloud secrets create PUTER_API_KEY     --data-file=<(echo "$PUTER_API_KEY")
```

### Step 5 — Provision the GCE VM

```bash
cd smelter-os/sqwaadrun
./deploy/provision.sh
```

Creates the `sqwaadrun-runner` service account, binds it to Secret Manager + Artifact Registry + the 4 GCS buckets, builds and pushes the gateway image, creates the VM with no public IP, adds the Cloud IAP firewall rule, and smoke-tests via IAP TCP tunnel.

### Step 6 — Set env vars on the cti-hub container

On myclaw-vps, add these to the cti-hub container's env file:

```
SQWAADRUN_GATEWAY_URL=http://<gateway-private-ip>:7700
SQWAADRUN_API_KEY=<same value from Secret Manager>
PUTER_BASE_URL=http://smelter-puter:4100
PUTER_API_KEY=<same value>
NEXT_PUBLIC_STRIPE_SQWAADRUN_SOLO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_SQWAADRUN_SQWAAD_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_SQWAADRUN_COMMANDER_PRICE_ID=price_...
STRIPE_SQWAADRUN_DEPLOY_DISCOUNT_COUPON=coupon_...
```

### Step 7 — Redeploy the cti-hub container

```bash
ssh myclaw-vps
cd /opt/cti-hub
docker compose pull cti-hub
docker compose up -d cti-hub
```

This ships the latest `main` build, which includes `/plug/sqwaadrun`, `/sqwaadrun`, `/sqwaadrun/missions/[id]`, and the full Stripe + proxy routes.

### Step 8 — DNS + Traefik for `sqwaadrun.foai.cloud` (optional)

1. Add an A record: `sqwaadrun.foai.cloud → <myclaw-vps IP>`
2. Drop the Traefik labels from `deploy/TRAEFIK_SQWAADRUN_DOMAIN.md` into the cti-hub service

Skip this for v1 — `https://deploy.foai.cloud/plug/sqwaadrun` is the canonical URL. The subdomain is a nice-to-have.

---

## End-to-end data flow

```
USER DISPATCHES MISSION via deploy.foai.cloud/plug/sqwaadrun
  │
  ├── cti-hub frontend → POST /api/sqwaadrun/mission
  │     (quota check, tier gate, user_id injection)
  │
  ├── cti-hub proxy → POST {SQWAADRUN_GATEWAY_URL}/mission
  │
  ├── Sqwaadrun Gateway (port 7700 on sqwaadrun-vm)
  │   │
  │   ├── General_Ang policy gate
  │   │   └── (on dispatch) _log_doctrine fires
  │   │       ├── Local: doctrine.jsonl
  │   │       ├── Puter: /smelter-os/sqwaadrun/doctrine/entries/{ts}.json
  │   │       └── GCS:   foai-backups/doctrine/{ts}.json
  │   │
  │   ├── Chicken_Hawk dispatches mission
  │   │   ├── Lil_Guard_Hawk — robots.txt, rate limits
  │   │   ├── Lil_Scrapp_Hawk — async fetch
  │   │   ├── Lil_Parse_Hawk — structure content
  │   │   ├── Lil_Schema_Hawk — JSON-LD / microdata extraction
  │   │   └── (remaining Hawks as needed)
  │   │
  │   ├── Mission completes → service.py handler fires
  │   │   SmelterStorage.store_mission_manifest()
  │   │     ├── Puter: /smelter-os/sqwaadrun/missions/{id}/manifest.json
  │   │     └── GCS:   foai-sqwaadrun-artifacts/{id}/manifest.json
  │   │
  │   │   SmelterStorage.store_mission_result()
  │   │     ├── Puter: /smelter-os/sqwaadrun/missions/{id}/results.json
  │   │     └── GCS:   foai-sqwaadrun-artifacts/{id}/results.json
  │   │
  │   ├── TRCC pipeline (if enrichment mission):
  │   │   ├── Neon:  sqwaadrun_staging.mission_log
  │   │   ├── Neon:  sqwaadrun_staging.scrape_artifact (per URL)
  │   │   ├── Neon:  sqwaadrun_staging.athlete_enrichment
  │   │   └── Neon:  promote_all() cron → public.perform_players
  │   │
  │   └── Heartbeat loop (every 90s, Puter ONLY):
  │       SmelterStorage.log_heartbeat()
  │         └── Puter: /smelter-os/chronicle/ledger/heartbeat-{ts}.json
  │
  └── RESPONSE back to user via cti-hub
      │
      └── User views results at /sqwaadrun/missions/{mission_id}
          │
          └── cti-hub → GET /api/sqwaadrun/mission/{id}
              └── Neon query (scrape_artifact) for rendering in ArtifactViewer
```

---

## Verification checklist

After all 9 steps run, this should be true:

- [ ] `curl http://localhost:4100/status` returns 200 (Puter up on Hostinger)
- [ ] `gcloud storage ls` shows all 4 `foai-*` buckets
- [ ] `psql $NEON_INGEST_DSN -c "\\dn"` lists `sqwaadrun_staging`
- [ ] `psql $NEON_DATABASE_URL -c "\\d profiles"` shows `sqwaadrun_*` columns
- [ ] Stripe dashboard shows 3 active Sqwaadrun products + coupon
- [ ] `gcloud compute instances list` shows `sqwaadrun-vm` running
- [ ] `gcloud compute start-iap-tunnel sqwaadrun-vm 7700 --local-host-port=localhost:7700 &` then `curl http://localhost:7700/health` returns `16/17` active hawks
- [ ] `https://deploy.foai.cloud/plug/sqwaadrun` returns 200 and shows 17 hawks
- [ ] Authenticated user can click a Sqwaadrun tier → lands in Stripe Checkout
- [ ] After subscribing, `/sqwaadrun` shows Hawk Bay dashboard with active tier
- [ ] Clicking DISPATCH MISSION → filling form → submitting returns a `mission_id`
- [ ] `/sqwaadrun/missions/{id}` renders the ArtifactViewer with full results
- [ ] Puter container `ls /var/puter/smelter-os/sqwaadrun/missions/{id}/` shows `manifest.json` + `results.json`
- [ ] `gsutil ls gs://foai-sqwaadrun-artifacts/{id}/` shows the same files
- [ ] `gsutil ls gs://foai-backups/doctrine/` has entries from General_Ang dispatches
- [ ] Puter `/var/puter/smelter-os/chronicle/ledger/` fills with heartbeat files every 90s

---

## Failure modes + recovery

| Scenario | Effect | Recovery |
|---|---|---|
| Puter container down | Writes degrade to GCS-only (logged warning). Reads fall through to GCS. | Restart Puter. No data loss — GCS has everything except heartbeats. |
| GCS project unreachable | Writes degrade to Puter-only. Reads still work from Puter. | Fix credentials / network. No data loss. |
| Both down | Mission still runs, results in Chicken_Hawk's in-memory log. Response to client still returns. | Fix either backend. Missing artifacts become a re-run (Sqwaadrun is idempotent by content hash). |
| Neon down | `sqwaadrun_staging` writes fail. Mission completes on the gateway but the customer dashboard can't query recent. | Restore Neon. Gateway persistence to Puter/GCS survives the outage. |
| Gateway VM down | No new missions, but existing cached missions still served from Puter/GCS via cti-hub proxy fallback. | Restart VM. |

---

## The seven correction record rules (immutable)

1. **Puter self-hosted** on Hostinger VPS. Never customer-managed, never exposed.
2. **GCS in `foai-aims`** only. Four buckets. Ingots + media public (CDN). Artifacts + backups private.
3. **Heartbeat = Puter ONLY**. Never GCS. Never customer-facing.
4. **Write-through never blocks.** Both backends fire in parallel. Either can fail without breaking the other.
5. **Neon is structured data only.** Never stores blob content.
6. **Chronicle Charter ≠ Ledger.** Charter is customer-facing; Ledger is internal. Separate Puter directories, never mixed.
7. **Doctrine = Puter primary, GCS backup.** Local `doctrine.jsonl` is the authoritative audit journal from General_Ang's POV; the dual-write is redundancy.

---

*Smelter OS — ACHIEVEMOR — Sqwaadrun Storage Wiring v1.0*
*Puter is home. GCS is scale. Both write. Neither blocks.*
