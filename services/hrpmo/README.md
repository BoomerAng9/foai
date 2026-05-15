# HRPMO Loop — Betty-Anne_Ang's weekly cycle (Track D, #95)

Phase 6 of the Taskade integration plan. Mondays 09:00 ET: read 7-day audit slice + 4-cycle coaching history, score each active agent on V.I.B.E. + KPI + Org Fit, dispatch AutoResearch for coaching recipes, persist to `foai.coaching_notes`, post to Taskade `hrpmo-cycles` folder for ACHEEVY review.

## Scoring

All three sub-scores are in `[0, 1]` and intentionally simple/explainable (Betty-Anne has to defend her conclusions to ACHEEVY on every cycle):

- **V.I.B.E.** = mean of Value (success / (success+failure)), Initiative (% events with proactive trigger source), Behavior (1.0 − constraint-violation penalty), Excellence (% events with payload.quality_score ≥ 0.8).
- **KPI hit rate** = fraction of agent's declared `success_metrics` that received a `payload.kpi_hit` tag on at least one successful event this period.
- **Org Fit Index** = (action-mission keyword overlap) × (1 − constraint violation rate).

Below-threshold = V.I.B.E. < `VIBE_THRESHOLD` (default 0.7) OR KPI hit rate < `KPI_THRESHOLD` (default 0.5).

## Pipeline

```
cron (Mon 09:00 ET)
   ↓
1. agent_cards.load_agent_cards(/registry/agents) → filter_active()
2. SELECT audit events WHERE timestamp_event BETWEEN since AND now
3. scoring.score_agent() per agent → AgentScore
4. flagged = top max_recipes_per_cycle by (lowest vibe, then lowest kpi)
5. For each flagged: autoresearch.invoke(intent=author_coaching_skill_recipe)
   (fallback skeleton if AutoResearch unreachable — never block on it)
6. UPSERT into foai.coaching_notes (idempotent on agent_name, week_iso)
7. POST to Taskade adapter → workspace.hrpmo-cycles project=cycle-YYYY-WW
8. POST to Chicken Hawk notifier → Telegram cycle summary
9. Resolve prior cycle's outcomes (improved / no_change / worsened)
```

## Run

```bash
# Cron mode (production)
docker compose up --build hrpmo-loop  # runs once, exits; cron schedules re-runs

# Dry-run preview
python -m services.hrpmo.loop --dry-run --json

# Override scoring thresholds
VIBE_THRESHOLD=0.6 KPI_THRESHOLD=0.4 python -m services.hrpmo.loop --dry-run --json
```

## Tests

```bash
# From foai/ repo root
pip install -r services/hrpmo/requirements.txt
PYTHONPATH=. pytest services/hrpmo/tests/ -v
```

## Owner-blocking before production

- `NEON_DATABASE_URL` (shared with sync worker)
- `foai.coaching_notes` schema applied (see `../taskade_sync_worker/schema/audit_ledger.sql`)
- Betty-Anne_Ang Operating Card `enabled: true` (flip in a separate activation PR)
- AutoResearch endpoint reachable + bearer in openclaw vault as `Autoresearch_Internal_Bearer`
- Taskade `hrpmo-cycles` folder created + ID captured in `TASKADE_HRPMO_FOLDER_ID`
- Telegram bot webhook wired to Chicken Hawk `/api/internal/hrpmo-decision` so Approve/Reject button callbacks land

## Sacred Separation

`hrpmo-cycles` folder is `owner_tier` by default (Betty-Anne needs raw agent names to coach meaningfully). When a recipe references a customer-visible behavior, the recipe author switches to `client_tier` for the customer-visible quoted block only.
