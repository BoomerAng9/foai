# Per|Form Backup & Restore — Gate 7 · Item 39

**Audience:** operator with access to Neon console + VPS SSH.
**Last-updated:** 2026-04-22

---

## RPO (Recovery Point Objective)

**≤ 15 minutes** — worst-case data loss after a DB incident.

Neon's pooled-branch infrastructure maintains a continuous write-ahead log and exposes point-in-time restore with second-level granularity. The practical floor is the time between the incident and the moment an operator triggers the restore — typically 5-15 minutes of detection + reaction.

## RTO (Recovery Time Objective)

**< 30 minutes** — from decision-to-restore to app-live-on-restored-branch.

Broken down:
- 3 min — Create new Neon branch from point-in-time in Neon console
- 1 min — Copy the new branch connection string into `.env.local` on VPS
- 2 min — `docker compose up -d --build perform`
- 1 min — health probe to confirm
- + buffer for unknowns

---

## What's backed up

| Store | Retention | Restore mechanism |
|---|---|---|
| Neon `performdb` | 7-day point-in-time history (all branches) | Neon console → Branches → Create from point-in-time |
| User-generated images under `/opt/foai-data/perform/generated/` | indefinite (filesystem persistence) | VPS filesystem snapshot / scp |
| Stripe checkout sessions | indefinite (source-of-truth: Stripe dashboard) | re-sync from Stripe API if `stripe_checkout_sessions` table lost |
| Firebase auth records | indefinite (Firebase-managed) | no Per\|Form action needed — Firebase admin console |

---

## Procedure — Full restore drill

Run this once a quarter minimum to satisfy Item 39's "Pass if: full restore succeeds, app runs against restored DB."

```bash
# --- Step 1: Create restore branch ---
# Neon console → performdb → Branches → Create branch
#   Name:    restore-drill-YYYY-MM-DD
#   Parent:  main
#   Point in time:  2 hours ago (or known-good timestamp)
# → copy the Pooled connection string

# --- Step 2: Verify connectivity from VPS ---
ssh myclaw-vps
export RESTORE_URL='postgres://...copied-string...'
psql "$RESTORE_URL" -c 'SELECT current_database(), now()'

# --- Step 3: Verify critical tables ---
psql "$RESTORE_URL" <<SQL
  SELECT 'perform_players'       AS t, COUNT(*) FROM perform_players
  UNION ALL SELECT 'perform_submissions',    COUNT(*) FROM perform_submissions
  UNION ALL SELECT 'draft_tokens',           COUNT(*) FROM draft_tokens
  UNION ALL SELECT 'stripe_checkout_sessions', COUNT(*) FROM stripe_checkout_sessions
  UNION ALL SELECT 'huddle_posts',           COUNT(*) FROM huddle_posts
  UNION ALL SELECT 'podcast_episodes',       COUNT(*) FROM podcast_episodes;
SQL
# Expect: counts close to prod (minor drift from the time gap is fine)

# --- Step 4: Run the app against the restored branch (drill only — don't overwrite prod .env.local) ---
cd /opt/foai-repo/perform
docker run --rm -d --name perform-drill -p 3099:3000 \
  -e DATABASE_URL="$RESTORE_URL" \
  -e NODE_ENV=production \
  --env-file .env.local \
  -e DATABASE_URL="$RESTORE_URL" \
  perform-perform:latest

# Wait for boot
sleep 15

# Verify
curl -sS http://localhost:3099/api/health | jq .status
# Expect: "ok"

# Stop the drill container
docker stop perform-drill

# --- Step 5: Drop the restore branch from Neon console ---
# Frees the quota; keeps the exercise deterministic
```

**Pass evidence (Item 39):**
- [ ] Step 3 query returns non-empty counts for all 6 tables
- [ ] Step 4 `/api/health` returns `status: "ok"` against the restored DB
- [ ] Drill completed end-to-end in under 30 min

---

## Incident runbook

For a real data-loss incident (not a drill):

1. **Contain** — kill writes by scaling the prod container to 0 or putting Traefik in maintenance mode. Prevents further drift.
2. **Diagnose** — confirm the DB is the problem (not app bug, not VPS disk). Run `SELECT max(created_at) FROM perform_submissions` etc. to find last good write.
3. **Decide restore point** — pick a timestamp just before the corruption. Prefer 1-2 min before vs exactly-at.
4. **Execute Steps 1-3 above** on a new branch; verify data looks intact.
5. **Swap prod** — replace `DATABASE_URL` in `/opt/foai-repo/perform/.env.local` with the restore branch URL; `docker compose up -d --build perform`.
6. **Verify** — `curl /api/health` + spot-check 3 critical reads (`/api/players`, `/api/tie/submissions/[known-public-id]`, `/api/draft/team-needs`).
7. **Post-incident** — write up in `docs/INCIDENTS/YYYY-MM-DD-short-name.md` with RPO/RTO actual vs documented.

---

## What this doc does NOT handle

- Full VPS filesystem loss → rely on Hostinger VM snapshot or rebuild
- Cloud Run revision rollback → `gcloud run services update-traffic` (not owned by Per|Form; affects only `/nba/*` carveout)
- Stripe dispute / chargeback → Stripe dashboard
