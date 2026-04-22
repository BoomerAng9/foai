# Per|Form Staging Environment — Provisioning Runbook (Gate 5 · Item 30)

**Target duration:** 15 minutes (owner-action only — nothing to code).
**Target result:** `perform-staging.foai.cloud` serves an isolated copy of Per|Form with its own DB, its own cookies, and its own Stripe test mode. Zero shared resources with production per Ship Checklist Item 30.

---

## Why not automated

This runbook is owner-action because three of the five steps require credentials no automation in this repo holds:
- Hostinger DNS panel (no API key in VPS env)
- Neon console (no `NEON_API_KEY` in VPS env)
- GitHub repo Settings → Secrets (human UI)

Once provisioned, subsequent staging deploys ride `docker compose --profile staging up -d --build perform-staging` via the `staging` profile added to `perform/docker-compose.yml` in PR #287.

---

## Step 1 — Neon: Create a staging branch

1. Open **https://console.neon.tech** → select the Per|Form project (the one hosting `performdb`).
2. Left nav → **Branches** → **Create branch**.
3. Parent branch: `main`. Name: `staging`. Copy data: yes (includes all 19 migrations + seed data).
4. After creation, click the `staging` branch → **Connection details** → copy the **Pooled connection** string.
5. Paste into `DATABASE_URL` in the `.env.staging` template (Step 3).

**Verification:** `psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM perform_players'` returns the same count as prod.

---

## Step 2 — Hostinger: Add DNS A-record

1. Hostinger → hPanel → Domains → `foai.cloud` → **DNS / Nameservers**.
2. Add record:
   ```
   Type:  A
   Name:  perform-staging
   Points to:  31.97.133.29
   TTL:   3600
   ```
3. Wait 1–5 min for propagation (`nslookup perform-staging.foai.cloud` should resolve to 31.97.133.29).

**Verification:** `nslookup perform-staging.foai.cloud` returns `31.97.133.29`.

---

## Step 3 — VPS: Create `.env.staging`

```bash
ssh myclaw-vps
cd /opt/foai-repo/perform

# Copy the template, then edit in the real values from Step 1 + your own
# staging-specific secrets (PIPELINE_AUTH_KEY, WEBHOOK_SECRET, Stripe TEST keys).
cp .env.staging.example .env.staging
vim .env.staging   # or: nano .env.staging

# Lock it down — same file-mode as .env.local
chmod 600 .env.staging
```

**Must change from the template:**
- `DATABASE_URL` — Neon staging branch connection string
- `PIPELINE_AUTH_KEY` — any 32+ char random string, DIFFERENT from prod
- `WEBHOOK_SECRET` — any 32+ char random string, DIFFERENT from prod
- `STRIPE_SECRET_KEY` — Stripe test mode (`sk_test_...`), NOT `sk_live_*`
- `STRIPE_WEBHOOK_SECRET` — from the test-mode webhook endpoint in Stripe dashboard

**Safe to reuse from prod:** AI/LLM keys, data-source API keys, Firebase project (Firebase isolation is a Gate 6 concern; Gate 5 accepts shared).

---

## Step 4 — Provision staging data volumes

```bash
sudo mkdir -p /opt/foai-data/perform-staging/generated
sudo mkdir -p /opt/foai-data/perform-staging/secrets
sudo chmod 755 /opt/foai-data/perform-staging
```

If prod uses GCP service-account credentials at `/opt/foai-data/perform/secrets/`, copy (or create a new one) into `/opt/foai-data/perform-staging/secrets/`. A separate service account is recommended but not required — same project + same billing is acceptable since Vertex AI usage is read-mostly.

---

## Step 5 — Run the staging container

```bash
ssh myclaw-vps
cd /opt/foai-repo/perform

# Run migrations on the STAGING DB
DATABASE_URL="$(grep ^DATABASE_URL= .env.staging | cut -d= -f2-)" \
  npx --yes tsx@4.19 scripts/apply-all-migrations.ts

# Boot the staging container (profile-gated — won't accidentally fire on the
# prod `docker compose up -d perform` path)
docker compose --profile staging up -d --build perform-staging

# Tail logs — expect "Ready in XXms" within 10s
docker logs perform-staging-perform-staging-1 -f
```

First request to `https://perform-staging.foai.cloud/api/health` triggers Traefik → Let's Encrypt → cert issue. Expect 10–30s wait on that first curl while the ACME handshake completes, then 200 on subsequent requests.

---

## Step 6 — Verify isolation

```bash
# From any machine:
curl -sS https://perform-staging.foai.cloud/api/health

# Expect all 4 components ok, but note the DB latency differs from prod
# (Neon regional placement of the staging branch may differ).

# Confirm prod wasn't affected by the staging boot
curl -sS https://perform.foai.cloud/api/health

# Confirm staging DB is a different DB
# (run from any shell with psql installed)
psql "$STAGING_DATABASE_URL" -c 'SELECT current_database(), current_user'
psql "$PROD_DATABASE_URL"    -c 'SELECT current_database(), current_user'
# `current_database()` should be identical (performdb on both branches)
# but the connection endpoint in the URL is DIFFERENT (branch-specific
# endpoint e.g., ep-staging-xxx-pooler vs ep-dawn-bar-a4orhend-pooler).
```

---

## Step 7 — Optional: Add GitHub secret for auto-deploy to staging

If you want the auto-deploy workflow (`.github/workflows/deploy-perform.yml`) to also target staging, add a new workflow file or parameterize the existing one with `--profile staging`. This is a Gate 5 follow-up; not blocking Item 30's pass criterion.

---

## Ship-Checklist Item 30 pass evidence after completion

- [ ] `nslookup perform-staging.foai.cloud` → `31.97.133.29`
- [ ] `curl https://perform-staging.foai.cloud/api/health` → `{"status":"ok"}`
- [ ] `DATABASE_URL` in staging `.env.staging` ≠ `DATABASE_URL` in prod `.env.local`
- [ ] `docker ps` shows two perform containers (prod `perform-perform-1` + staging `perform-staging-perform-staging-1`)
- [ ] Editing a row in staging DB has zero effect on prod (verified by SELECT-after-UPDATE comparison)

Once all 5 checkboxes are ticked, Item 30 status moves from FAIL to PASS.

---

## Teardown (if you need to reset staging)

```bash
docker compose --profile staging down perform-staging

# Drop the Neon staging branch from the Neon console to free the quota.
# The .env.staging file stays for next time — won't be committed (in .gitignore).
```
