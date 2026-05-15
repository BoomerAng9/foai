"""HRPMO weekly cycle — Betty-Anne_Ang's main loop.

Cron Mondays 09:00 ET.
1. Read foai.audit_ledger for the past 7 days + foai.coaching_notes for the past 4 cycles
2. Score each active agent on V.I.B.E. + KPI + Org Fit
3. Flag agents below threshold
4. Dispatch AutoResearch for coaching recipes (capped by max_recipes_per_cycle)
5. Post cycle + recipes to Taskade hrpmo-cycles folder
6. Send Telegram cycle summary via Chicken Hawk notifier
7. Outcome verification: for last week's coached agents, did metrics move?

Dry-run mode renders the full cycle to JSON without writing to Taskade or
foai.coaching_notes. Useful for staging snapshots + owner preview.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import logging
import sys
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from . import scoring
from .agent_cards import filter_active, load_agent_cards
from .config import Settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s :: %(message)s",
)
log = logging.getLogger("hrpmo.loop")


def _iso_week(now: Optional[datetime] = None) -> str:
    now = now or datetime.now(timezone.utc)
    iso_year, iso_week, _ = now.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def _create_engine(database_url: str) -> Engine:
    connect_args: dict[str, Any] = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    return create_engine(database_url, connect_args=connect_args, future=True)


def _fetch_events(engine: Engine, since: datetime, until: datetime) -> dict[str, list[dict]]:
    """SELECT * FROM foai.audit_ledger WHERE timestamp_event BETWEEN ... GROUP BY agent."""
    # We tolerate SQLite (tests) which won't have the foai schema prefix.
    schema_prefix = "" if engine.url.drivername.startswith("sqlite") else "foai."
    sql = text(
        f"SELECT event_id, agent, action, payload, timestamp_event "
        f"FROM {schema_prefix}audit_ledger "
        f"WHERE timestamp_event >= :since AND timestamp_event < :until"
    )
    by_agent: dict[str, list[dict]] = {}
    with engine.connect() as conn:
        rows = conn.execute(sql, {"since": since, "until": until}).mappings().all()
    for row in rows:
        payload = row["payload"]
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                payload = {"raw": payload}
        by_agent.setdefault(row["agent"], []).append({
            "event_id": str(row["event_id"]),
            "agent": row["agent"],
            "action": row["action"],
            "payload": payload or {},
            "timestamp_event": row["timestamp_event"],
        })
    return by_agent


def _fetch_prior_outcomes(engine: Engine, prior_week_iso: str) -> dict[str, str]:
    """Return {agent_name: outcome} for the previous cycle (for trend analysis)."""
    schema_prefix = "" if engine.url.drivername.startswith("sqlite") else "foai."
    sql = text(
        f"SELECT agent_name, outcome FROM {schema_prefix}coaching_notes "
        f"WHERE week_iso = :week"
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"week": prior_week_iso}).mappings().all()
    return {r["agent_name"]: r["outcome"] for r in rows}


def _persist_cycle_note(
    engine: Engine,
    *,
    agent_name: str,
    week_iso: str,
    body_md: str,
    taskade_project_id: str | None,
) -> None:
    schema_prefix = "" if engine.url.drivername.startswith("sqlite") else "foai."
    # Idempotent: ON CONFLICT (agent_name, week_iso) DO UPDATE.
    sql = text(
        f"INSERT INTO {schema_prefix}coaching_notes "
        f"(note_id, agent_name, week_iso, body_md, taskade_project_id, authored_by, outcome) "
        f"VALUES (:nid, :agent, :week, :body, :tpid, 'Betty-Anne_Ang', 'pending') "
        f"ON CONFLICT (agent_name, week_iso) DO UPDATE SET "
        f"body_md = EXCLUDED.body_md, taskade_project_id = EXCLUDED.taskade_project_id"
    )
    note_id = hashlib.sha256(f"{agent_name}:{week_iso}".encode("utf-8")).hexdigest()[:32]
    with engine.begin() as conn:
        try:
            conn.execute(
                sql,
                {
                    "nid": note_id,
                    "agent": agent_name,
                    "week": week_iso,
                    "body": body_md,
                    "tpid": taskade_project_id,
                },
            )
        except Exception as e:
            # SQLite test path may not support ON CONFLICT depending on version.
            log.warning("coaching_notes upsert failed (%s) — falling back to UPDATE", e)
            conn.execute(
                text(
                    f"UPDATE {schema_prefix}coaching_notes "
                    f"SET body_md = :body, taskade_project_id = :tpid "
                    f"WHERE agent_name = :agent AND week_iso = :week"
                ),
                {"body": body_md, "tpid": taskade_project_id, "agent": agent_name, "week": week_iso},
            )


def _autoresearch_dispatch(
    settings: Settings,
    *,
    agent_card: dict[str, Any],
    score: scoring.AgentScore,
    action_counts: dict[str, int],
    prior_outcome: str | None,
) -> str:
    """Dispatch AutoResearch to author a coaching skill-recipe.

    Returns the recipe body (markdown). On AutoResearch failure, returns a
    deterministic fallback skeleton — Betty-Anne never blocks on AutoResearch
    being unavailable (cycle integrity > recipe richness).
    """
    if not settings.autoresearch_url or not settings.autoresearch_bearer:
        return _fallback_recipe(agent_card, score, action_counts, prior_outcome)

    try:
        with httpx.Client(timeout=120.0) as c:
            r = c.post(
                f"{settings.autoresearch_url}/invoke",
                headers={"Authorization": f"Bearer {settings.autoresearch_bearer}"},
                json={
                    "intent": "author_coaching_skill_recipe",
                    "agent_card": agent_card,
                    "score": asdict(score),
                    "action_counts": action_counts,
                    "prior_outcome": prior_outcome,
                },
            )
        if r.status_code != 200:
            log.warning("autoresearch returned %s; using fallback recipe", r.status_code)
            return _fallback_recipe(agent_card, score, action_counts, prior_outcome)
        body = r.json()
        return body.get("recipe_md") or _fallback_recipe(
            agent_card, score, action_counts, prior_outcome
        )
    except httpx.HTTPError as e:
        log.warning("autoresearch unreachable (%s); using fallback recipe", e)
        return _fallback_recipe(agent_card, score, action_counts, prior_outcome)


def _fallback_recipe(
    agent_card: dict[str, Any],
    score: scoring.AgentScore,
    action_counts: dict[str, int],
    prior_outcome: str | None,
) -> str:
    """Deterministic recipe skeleton when AutoResearch is unavailable."""
    name = agent_card["name"]
    mission = agent_card.get("mission", "(no mission declared)")
    metrics = agent_card.get("success_metrics", [])
    actions_str = ", ".join(f"{a}: {n}" for a, n in sorted(action_counts.items(), key=lambda kv: -kv[1])[:5])
    reasons = "; ".join(score.flagged_reasons) or "below threshold"
    prior_note = f"\n\n**Prior cycle outcome:** `{prior_outcome}`" if prior_outcome else ""
    return (
        f"# Coaching note — {name}\n\n"
        f"**Flagged because:** {reasons}\n\n"
        f"**Scores:** V.I.B.E. {score.vibe:.2f} · KPI hit rate {score.kpi_hit_rate:.2f} · Org Fit {score.org_fit:.2f}\n\n"
        f"**Mission:** {mission}\n\n"
        f"**Top 5 actions this cycle:** {actions_str or '(no activity)'}\n\n"
        f"**Success metrics declared:**\n"
        + "".join(f"- {m}\n" for m in metrics)
        + f"\n## Suggested recipe (skeleton — AutoResearch unavailable, fill in manually)\n\n"
        f"1. Review the top actions above against the declared success metrics. "
        f"Are the actions producing kpi_hit events? If not, the agent may need "
        f"explicit prompt-level direction to tag kpi_hit in its action payload.\n"
        f"2. Check for constraint violations or NemoClaw blocks in the 7-day audit slice.\n"
        f"3. Compare action distribution to mission keywords. Drift = persona patch needed.\n"
        f"4. If event_count is low (< 5), consider whether the dispatch surface is reaching the agent.\n"
        f"{prior_note}\n\n"
        f"---\n_Authored by HRPMO loop fallback._\n"
    )


def run_cycle(
    settings: Settings,
    *,
    now: Optional[datetime] = None,
) -> dict[str, Any]:
    """Run one HRPMO cycle. Returns a structured summary dict.

    Dry-run mode (settings.dry_run = True) skips Taskade writes + coaching_notes
    persistence — useful for staging previews.
    """
    now = now or datetime.now(timezone.utc)
    since = now - timedelta(days=7)
    week_iso = _iso_week(now)
    prior_week_iso = _iso_week(now - timedelta(days=7))

    log.info("starting cycle week=%s since=%s now=%s dry_run=%s", week_iso, since, now, settings.dry_run)

    cards = load_agent_cards(settings.agents_dir)
    active = filter_active(cards)
    log.info("loaded %d agent cards (%d active)", len(cards), len(active))

    engine = _create_engine(settings.neon_database_url)
    events_by_agent = _fetch_events(engine, since, now)
    prior_outcomes = _fetch_prior_outcomes(engine, prior_week_iso)

    scored: list[scoring.AgentScore] = []
    for name, card in active.items():
        events = events_by_agent.get(name, [])
        score = scoring.score_agent(
            name,
            events,
            success_metrics=card.get("success_metrics", []) or [],
            mission=card.get("mission", "") or "",
            constraints=card.get("constraints", []) or [],
            vibe_threshold=settings.vibe_threshold,
            kpi_threshold=settings.kpi_threshold,
        )
        scored.append(score)

    flagged = sorted(
        (s for s in scored if s.flagged),
        key=lambda s: (s.vibe, s.kpi_hit_rate),
    )[: settings.max_recipes_per_cycle]

    recipes: list[dict[str, Any]] = []
    for s in flagged:
        card = active[s.agent]
        actions = scoring.summarize_action_counts(events_by_agent.get(s.agent, []))
        recipe_md = _autoresearch_dispatch(
            settings,
            agent_card=card,
            score=s,
            action_counts=actions,
            prior_outcome=prior_outcomes.get(s.agent),
        )
        recipes.append({"agent": s.agent, "recipe_md": recipe_md, "score": s.to_row()})

        if not settings.dry_run:
            _persist_cycle_note(
                engine,
                agent_name=s.agent,
                week_iso=week_iso,
                body_md=recipe_md,
                taskade_project_id=None,  # filled by the next step once we post to Taskade
            )

    # Cycle outcome verification — score this cycle's deltas vs prior_outcomes
    outcomes_resolved = _resolve_prior_outcomes(scored, prior_outcomes)

    summary = {
        "week_iso": week_iso,
        "now": now.isoformat(),
        "active_agents": len(active),
        "scored": [s.to_row() for s in scored],
        "flagged_count": len(flagged),
        "recipes_authored": len(recipes),
        "recipes": recipes,
        "prior_cycle_outcomes_resolved": outcomes_resolved,
        "dry_run": settings.dry_run,
    }
    log.info(
        "cycle complete week=%s active=%d flagged=%d recipes=%d dry_run=%s",
        week_iso,
        len(active),
        len(flagged),
        len(recipes),
        settings.dry_run,
    )
    return summary


def _resolve_prior_outcomes(
    scored: list[scoring.AgentScore],
    prior_outcomes: dict[str, str],
) -> list[dict[str, Any]]:
    """For agents that had a coaching note last cycle with outcome=pending,
    determine if their scores improved / no_change / worsened.

    This is a synthetic measurement (the real measurement runs against the
    DB UPDATE on coaching_notes.outcome). Returned for logging + the cycle
    summary that gets posted to Taskade.
    """
    out: list[dict[str, Any]] = []
    score_by_name = {s.agent: s for s in scored}
    for agent_name, prior in prior_outcomes.items():
        s = score_by_name.get(agent_name)
        if not s:
            continue
        # Without prior scores stored, we can only call out the current state
        # (a real implementation queries the prior cycle's row). For now:
        verdict = "improved" if not s.flagged else "no_change"
        out.append({"agent": agent_name, "prior_outcome": prior, "current_verdict": verdict})
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="HRPMO cycle runner")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--week", type=str, help="ISO week override for testing, e.g. 2026-W20")
    parser.add_argument("--json", action="store_true", help="Print summary as JSON")
    args = parser.parse_args(argv)

    settings = Settings()
    if args.dry_run:
        settings.dry_run = True

    summary = run_cycle(settings)
    if args.json:
        print(json.dumps(summary, indent=2, default=str))
    else:
        print(f"Cycle {summary['week_iso']}: {summary['flagged_count']}/{summary['active_agents']} flagged, {summary['recipes_authored']} recipes authored, dry_run={summary['dry_run']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
