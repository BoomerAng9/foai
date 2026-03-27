"""Deep Think evaluation engine — Gemini-powered agent performance analysis.

Runs weekly. Pulls agent status from Money Engine, evaluates performance
via Gemini, stores results in Firestore, and posts improvement directives.
"""

from datetime import datetime, timezone

import google.generativeai as genai
import httpx
from google.cloud import firestore

from config import (
    DEFAULT_TENANT,
    GCP_PROJECT,
    MONEY_ENGINE_URL,
    get_secret,
)

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


async def run_evaluation(tenant_id: str = DEFAULT_TENANT) -> dict:
    """Execute a full Deep Think evaluation cycle.

    1. Fetch agent statuses + business metrics
    2. Send to Gemini for analysis
    3. Store evaluation in Firestore
    4. Post directives back to Money Engine /agent/status
    """
    # Gather data
    agent_statuses = await fetch_agent_statuses(tenant_id)
    enrollment_metrics = await fetch_enrollment_metrics(tenant_id)
    open_seat_metrics = await fetch_open_seat_metrics(tenant_id)

    agent_data = {
        "agents": agent_statuses,
        "enrollments": enrollment_metrics,
        "open_seats": open_seat_metrics,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Configure Gemini
    api_key = get_secret("gemini-api-key")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")

    # Run Deep Think
    prompt = EVALUATION_PROMPT.format(agent_data=agent_data)
    response = model.generate_content(prompt)

    # Parse response — Gemini returns text, extract JSON
    raw_text = response.text
    # Strip markdown code fences if present
    if "```json" in raw_text:
        raw_text = raw_text.split("```json")[1].split("```")[0]
    elif "```" in raw_text:
        raw_text = raw_text.split("```")[1].split("```")[0]

    import json
    evaluation = json.loads(raw_text.strip())

    # Store in Firestore: hermes/{tenant_id}/evaluations/{id}
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
        "created_at": now,
    })

    # Post improvement directives back to Money Engine /agent/status
    async with httpx.AsyncClient(timeout=10.0) as client:
        for ev in evaluation.get("evaluations", []):
            await client.post(
                f"{MONEY_ENGINE_URL}/agent/status",
                json={
                    "name": ev["agent_name"],
                    "status": "directive_received",
                    "current_task": ev["directive"],
                    "tenant_id": tenant_id,
                },
            )

    return {
        "evaluation_id": eval_ref.id,
        "ecosystem_score": evaluation.get("ecosystem_score"),
        "agents_evaluated": len(evaluation.get("evaluations", [])),
        "directives_posted": len(evaluation.get("evaluations", [])),
        "tenant_id": tenant_id,
        "timestamp": now,
    }
