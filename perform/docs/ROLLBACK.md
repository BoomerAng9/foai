# Per|Form — Rollback Playbook (SHIP-CHECKLIST Gate 5 · Item 29)

**Audience:** anyone with SSH access to `myclaw-vps` and write permission to `BoomerAng9/foai`.
**Target:** <5 minutes from decision to recovered state.
**Last-updated:** 2026-04-22

---

## Decision Tree

```
Production is misbehaving
    │
    ├── Can you identify the bad commit? ────► Yes ──► Path A (git revert)
    │                                                  "most common path"
    │
    ├── Site is completely down? ────────────► Yes ──► Path B (git reset to last
    │                                                  known-good, rebuild)
    │
    ├── Migration broke the DB? ─────────────► Yes ──► Path C (restore Neon branch
    │                                                  or manual forward-fix)
    │
    └── Cert / Traefik / infra issue? ───────► Yes ──► Path D (check Traefik, see
                                                       infrastructure section)
```

---

## Path A — Revert a specific commit (most common)

Use when a single recent PR caused the regression and you can identify it.

```bash
ssh myclaw-vps
cd /opt/foai-repo

# Find the bad commit SHA (last 10 merges to main)
git log --oneline -10

# Create a revert commit on the VPS checkout's main branch
git revert --no-edit <BAD_SHA>

# Rebuild + restart perform container
cd perform
docker compose up -d --build perform

# Tail logs to confirm clean boot
docker logs perform-perform-1 -f
# Ctrl-C when you see "✓ Ready in XXms"

# Verify endpoint
curl -sS https://perform.foai.cloud/api/health | grep status
# Expect: {"status":"ok",...}
```

**Follow-up (within 30 min):**
1. Push the revert commit back to GitHub so main on origin matches VPS:
   `git push origin main`
2. Open a GitHub issue pointing at `<BAD_SHA>` with the regression observed.

---

## Path B — Reset to last known-good (site-down emergency)

Use when you don't have time to identify the bad commit — just get back to a stable state.

```bash
ssh myclaw-vps
cd /opt/foai-repo

# Show last 20 merges — pick the commit from before the issue started
git log --oneline -20

# Hard-reset main to that SHA (NOTE: this diverges VPS main from origin main)
git reset --hard <KNOWN_GOOD_SHA>

cd perform
docker compose up -d --build perform
docker logs perform-perform-1 --tail 50
curl -sS https://perform.foai.cloud/api/health
```

**Follow-up (MANDATORY):**
Origin `main` is now ahead of the VPS. You must either:
- **Option B1 (preferred):** open a revert PR on GitHub for the bad range, merge it, then `git pull --ff-only origin main` on the VPS to reconcile.
- **Option B2 (emergency):** `git push --force origin main` from the VPS — **only if no other developer is actively merging**. Warn in Slack first.

---

## Path C — Migration broke the DB

All migrations in `perform/migrations/` are idempotent by design (CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, DROP VIEW IF EXISTS before CREATE). A forward-fix is almost always safer than rolling the DB back.

**Forward-fix pattern:**
```bash
ssh myclaw-vps
cd /opt/foai-repo/perform

# Add a new migration that reverses or corrects the bad one
# e.g., migrations/NNN_fix_<issue>.sql with DROP / ALTER / whatever

# Commit + push normally, then re-run db:migrate
npx --yes tsx@4.19 scripts/apply-all-migrations.ts
```

**Hard rollback (DB-level):**
Neon offers branch-level time-travel. Open the Neon console → `performdb` → Branches → "Restore to point in time". Snapshot the DB URL and point `DATABASE_URL` at the restored branch.

> **WARNING:** Restoring a branch loses any data written between the restore point and now, including user submissions and token purchases. Only do this if a forward-fix is impossible and data loss is acceptable.

---

## Path D — Traefik / cert / routing issue

```bash
ssh myclaw-vps

# Inspect Traefik dynamic config
ls /docker/traefik/dynamic/
cat /docker/traefik/dynamic/perform-cloudrun.yml

# Reload Traefik (file provider auto-reloads, but a restart clears stuck state)
docker restart traefik

# Verify cert
echo | openssl s_client -servername perform.foai.cloud -connect perform.foai.cloud:443 2>/dev/null | openssl x509 -noout -subject -dates

# Check container health
docker ps --format '{{.Names}}\t{{.Status}}' | grep perform
```

---

## What this playbook does NOT handle

- **Cloud Run service (perform-draft-2026)** — rollback via `gcloud run services update-traffic perform-draft-2026 --to-revisions=REVISION=100`. Cloud Run carries `/nba/*` paths only; most rollbacks don't need to touch it.
- **Stripe + Stepper payment state** — customer token balances persist in Neon `draft_tokens`; a code rollback does not refund customers. For payment disputes, use the Stripe dashboard refund flow.
- **Firebase auth** — session cookies stay valid after rollback. If a vulnerability is found, rotate Firebase service-account key + force-re-auth all users via `revokeRefreshTokens` admin SDK call.

---

## Emergency contacts

- **Owner:** jarrett.risher@gmail.com / bpo@achievemor.io
- **VPS host:** Hostinger KVM (myclaw-vps, 31.97.133.29)
- **DNS:** Hostinger (foai.cloud zone) — no Cloudflare
- **DB:** Neon — console.neon.tech (performdb)

---

## Verification after any rollback

Run the Gate 1 smoke to confirm the rolled-back state is healthy:

```bash
curl -sS https://perform.foai.cloud/api/health
# Expect: {"status":"ok","components":{"database":{"ok":true,...},"runtime":{"ok":true,...},"upstream_espn":{"ok":true,...},"upstream_gemini":{"ok":true,...}}}
```

Anything other than `status: "ok"` means the rollback didn't fix the issue — escalate.
