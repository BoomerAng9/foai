"""Deep Think evaluation engine V0.5 — Multi-model consensus scoring.

Runs daily (lightweight) and weekly (full). Pulls agent status from Money Engine,
evaluates performance via multiple OpenRouter models for consensus scoring,
stores results in Firestore with trend data, and posts improvement directives.
"""

import json
import os
import statistics
from datetime import datetime, timezone

import httpx
import structlog
from google.cloud import firestore
from openai import OpenAI

from config import (
    DEFAULT_TENANT,
    EVAL_MODELS,
    GCP_PROJECT,
    MONEY_ENGINE_URL,
    OPENROUTER_MODEL,
)

logger = structlog.get_logger("hermes.deep_think")

AGENTS_TO_EVALUATE = [
    "Edu_Ang",
    "Scout_Ang",
    "Content_Ang",
    "Ops_Ang",
    "Biz_Ang",
]

EVALUATION_PROMPT = """You are Hermes, the LearnAng evaluation engine for the FOAI-AIMS ecosystem.

Analyze the following agent performance data and produce:
1. A performance score (0-100) for each agent
2. One specific improvement directive per agent (actionable, measurable)
3. An overall ecosystem health score (0-100)

Agent data:
{agent_data}

Respond in valid JSON with this structure:
{{
  "ecosystem_score": <int>,
  "evaluations": [
    {{
      "agent_name": "<name>",
      "score": <int>,
      "directive": "<improvement directive>",
      "reasoning": "<brief reasoning>"
    }}
  ],
  "summary": "<one paragraph overall assessment>"
}}
"""


def _get_db() -> firestore.Client:
    return firestore.Client(project=GCP_PROJECT)


def _get_openrouter_client() -> OpenAI:
    """Create OpenAI client pointed at OpenRouter."""
    api_key = os.environ["OPENROUTER_API_KEY"]
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )


def _parse_llm_response(raw_text: str) -> dict:
    """Strip markdown fences and parse JSON from LLM output."""
    text = raw_text
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    return json.loads(text.strip())


async def _call_model(client: OpenAI, model: str, prompt: str) -> dict | None:
    """Call a single model and return parsed evaluation, or None on failure."""
    log = logger.bind(model=model)
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content
        result = _parse_llm_response(raw)
        token_usage = {
            "prompt_tokens": completion.usage.prompt_tokens if completion.usage else 0,
            "completion_tokens": completion.usage.completion_tokens if completion.usage else 0,
            "total_tokens": completion.usage.total_tokens if completion.usage else 0,
        }
        result["_meta"] = {"model": model, "token_usage": token_usage}
        log.info("model_eval_complete", ecosystem_score=result.get("ecosystem_score"))
        return result
    except Exception:
        log.exception("model_eval_failed")
        return None


def _build_consensus(evaluations: list[dict]) -> dict:
    """Build consensus evaluation from multiple model outputs.

    Takes the median ecosystem score, averages per-agent scores,
    and selects directives from the most critical evaluator.
    """
    ecosystem_scores = [e["ecosystem_score"] for e in evaluations]
    consensus_ecosystem = int(statistics.median(ecosystem_scores))

    agent_scores: dict[str, list[int]] = {}
    agent_directives: dict[str, list[dict]] = {}
    for ev in evaluations:
        for agent_ev in ev.get("evaluations", []):
            name = agent_ev["agent_name"]
            agent_scores.setdefault(name, []).append(agent_ev["score"])
            agent_directives.setdefault(name, []).append(agent_ev)

    consensus_evals = []
    for name in AGENTS_TO_EVALUATE:
        scores = agent_scores.get(name, [])
        if not scores:
            continue
        avg_score = int(statistics.mean(scores))
        # Pick the directive from the most critical (lowest-scoring) evaluator
        directives = agent_directives.get(name, [])
        most_critical = min(directives, key=lambda d: d["score"])
        consensus_evals.append({
            "agent_name": name,
            "score": avg_score,
            "score_spread": max(scores) - min(scores),
            "directive": most_critical["directive"],
            "reasoning": most_critical["reasoning"],
        })

    summaries = [e.get("summary", "") for e in evaluations]
    combined_summary = " | ".join(s for s in summaries if s)

    return {
        "ecosystem_score": consensus_ecosystem,
        "ecosystem_score_spread": max(ecosystem_scores) - min(ecosystem_scores),
        "evaluations": consensus_evals,
        "summary": combined_summary,
        "models_used": len(evaluations),
        "model_names": [e.get("_meta", {}).get("model", "unknown") for e in evaluations],
    }


async def fetch_agent_statuses(tenant_id: str) -> list[dict]:
    """Pull current agent statuses from Money Engine Firestore."""
    db = _get_db()
    statuses = []
    for agent_name in AGENTS_TO_EVALUATE:
        doc = (
            db.collection("agents")
            .document(tenant_id)
            .collection(agent_name)
            .document("status")
            .get()
        )
        if doc.exists:
            statuses.append(doc.to_dict())
        else:
            statuses.append({"name": agent_name, "status": "no_data"})
    return statuses


async def fetch_enrollment_metrics(tenant_id: str) -> dict:
    """Pull enrollment revenue metrics for context."""
    db = _get_db()
    docs = (
        db.collection("enrollments")
        .document(tenant_id)
        .collection("items")
        .order_by("timestamp", direction=firestore.Query.DESCENDING)
        .limit(50)
        .stream()
    )
    total_revenue = 0.0
    count = 0
    for doc in docs:
        data = doc.to_dict()
        total_revenue += data.get("revenue", 0.0)
        count += 1
    return {"recent_enrollments": count, "recent_revenue": total_revenue}


async def fetch_open_seat_metrics(tenant_id: str) -> dict:
    """Pull open seat scrape metrics for context."""
    db = _get_db()
    docs = (
        db.collection("openSeats")
        .document(tenant_id)
        .collection("items")
        .limit(100)
        .stream()
    )
    total_seats = 0
    institutions = set()
    for doc in docs:
        data = doc.to_dict()
        total_seats += data.get("seats_remaining", 0)
        institutions.add(data.get("institution", "unknown"))
    return {
        "total_open_seats": total_seats,
        "institutions_tracked": len(institutions),
    }


async def fetch_cost_metrics(tenant_id: str) -> dict:
    """Pull LUC cost data from CFO_Ang for evaluation context."""
    db = _get_db()
    try:
        doc = (
            db.collection("agents")
            .document(tenant_id)
            .collection("CFO_Ang")
            .document("status")
            .get()
        )
        if doc.exists:
            data = doc.to_dict()
            return {
                "total_cost_usd": data.get("total_cost_usd", 0.0),
                "daily_avg_cost_usd": data.get("daily_avg_cost_usd", 0.0),
                "top_cost_agents": data.get("top_cost_agents", []),
            }
    except Exception:
        logger.warning("cfo_ang_cost_fetch_failed", tenant_id=tenant_id)
    return {"total_cost_usd": 0.0, "daily_avg_cost_usd": 0.0, "top_cost_agents": []}


async def _store_trend_snapshot(
    db: firestore.Client, tenant_id: str, evaluation: dict, eval_type: str
) -> None:
    """Append a trend data point for historical tracking."""
    now = datetime.now(timezone.utc).isoformat()
    trend_ref = (
        db.collection("hermes")
        .document(tenant_id)
        .collection("trends")
        .document()
    )
    agent_scores = {
        ev["agent_name"]: ev["score"]
        for ev in evaluation.get("evaluations", [])
    }
    trend_ref.set({
        "ecosystem_score": evaluation.get("ecosystem_score"),
        "agent_scores": agent_scores,
        "eval_type": eval_type,
        "models_used": evaluation.get("models_used", 1),
        "timestamp": now,
    })


async def run_evaluation(
    tenant_id: str = DEFAULT_TENANT,
    eval_type: str = "weekly",
    multi_model: bool = True,
) -> dict:
    """Execute a Deep Think evaluation cycle.

    1. Fetch agent statuses + business metrics + cost data
    2. Send to multiple OpenRouter models for consensus analysis
    3. Store evaluation + trend snapshot in Firestore
    4. Post directives back to Money Engine /agent/status
    """
    log = logger.bind(tenant_id=tenant_id, eval_type=eval_type)
    log.info("evaluation_started")

    # Gather data
    agent_statuses = await fetch_agent_statuses(tenant_id)
    enrollment_metrics = await fetch_enrollment_metrics(tenant_id)
    open_seat_metrics = await fetch_open_seat_metrics(tenant_id)
    cost_metrics = await fetch_cost_metrics(tenant_id)

    agent_data = {
        "agents": agent_statuses,
        "enrollments": enrollment_metrics,
        "open_seats": open_seat_metrics,
        "costs": cost_metrics,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
    }

    prompt = EVALUATION_PROMPT.format(agent_data=agent_data)
    client = _get_openrouter_client()

    # Multi-model consensus or single-model evaluation
    models = EVAL_MODELS if multi_model else [OPENROUTER_MODEL]
    raw_evaluations = []
    token_totals = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

    for model in models:
        result = await _call_model(client, model, prompt)
        if result is not None:
            meta = result.pop("_meta", {})
            usage = meta.get("token_usage", {})
            for k in token_totals:
                token_totals[k] += usage.get(k, 0)
            result["_meta"] = meta
            raw_evaluations.append(result)

    if not raw_evaluations:
        log.error("all_models_failed")
        raise RuntimeError("All evaluation models failed — no consensus possible")

    # Build consensus from multiple models, or use single result
    if len(raw_evaluations) > 1:
        evaluation = _build_consensus(raw_evaluations)
    else:
        single = raw_evaluations[0]
        single.pop("_meta", None)
        evaluation = single
        evaluation["models_used"] = 1
        evaluation["model_names"] = [models[0]]

    # Store in Firestore
    db = _get_db()
    now = datetime.now(timezone.utc).isoformat()
    eval_ref = (
        db.collection("hermes")
        .document(tenant_id)
        .collection("evaluations")
        .document()
    )
    eval_ref.set({
        "input_data": agent_data,
        "evaluation": evaluation,
        "eval_type": eval_type,
        "models_used": evaluation.get("models_used", 1),
        "model_names": evaluation.get("model_names", []),
        "token_usage": token_totals,
        "created_at": now,
    })

    # Store trend snapshot
    await _store_trend_snapshot(db, tenant_id, evaluation, eval_type)

    # Post improvement directives back to Money Engine
    directives_posted = 0
    async with httpx.AsyncClient(timeout=10.0) as http:
        for ev in evaluation.get("evaluations", []):
            try:
                await http.post(
                    f"{MONEY_ENGINE_URL}/agent/status",
                    json={
                        "name": ev["agent_name"],
                        "status": "directive_received",
                        "current_task": ev["directive"],
                        "tenant_id": tenant_id,
                    },
                )
                directives_posted += 1
            except Exception:
                log.warning("directive_post_failed", agent=ev["agent_name"])

    log.info(
        "evaluation_complete",
        ecosystem_score=evaluation.get("ecosystem_score"),
        models_used=evaluation.get("models_used"),
        eval_id=eval_ref.id,
    )

    return {
        "evaluation_id": eval_ref.id,
        "ecosystem_score": evaluation.get("ecosystem_score"),
        "agents_evaluated": len(evaluation.get("evaluations", [])),
        "directives_posted": directives_posted,
        "models_used": evaluation.get("models_used", 1),
        "model_names": evaluation.get("model_names", []),
        "eval_type": eval_type,
        "token_usage": token_totals,
        "tenant_id": tenant_id,
        "timestamp": now,
    }
