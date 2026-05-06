"""Lil_Hawk Dispatch — task-to-worker routing in the A.I.M.S. ecosystem.

Routes through the gateway's `agent_orchestration` surface (Claude
Sonnet 4-6). Multi-step reasoning that picks the right Lil_Hawk worker
for an incoming task, dispatches it, and tracks status.

Pattern:
- Receive task (free-form goal + optional metadata).
- Reason about which Lil_Hawk worker class fits (research / scrape /
  visual / code / outreach / data-extract).
- Call lilhawk_dispatch(class, task, payload).
- Store dispatch record in SQLite (audit_ledger) so Chicken Hawk +
  observers can see the routing decision.

Lil_Hawk fleet registry: a worker-class catalog ships built-in. Real
workers are wired by Chicken Hawk's infra (NemoClaw / Hermes /
Autoresearch run them on dedicated VPS containers). For v1, dispatch
records the assignment + returns a task_id; actual execution wiring
lands when the fleet ports + queues are live.

Activation: only requires INWORLD_API_KEY (gateway access). Optional
LILHAWK_FLEET_URL when Chicken Hawk's dispatch endpoint is online —
without it, dispatches are recorded but not forwarded.
"""
from __future__ import annotations

import json
import logging
import os
import pathlib
import sqlite3
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import requests

log = logging.getLogger("aims.lilhawk_dispatch")

DISPATCH_DB_PATH = pathlib.Path(
    os.environ.get(
        "LILHAWK_DISPATCH_DB",
        str(pathlib.Path(__file__).resolve().parent.parent.parent / "audit_ledger" / "lilhawk_dispatch.db"),
    )
)
FLEET_URL = os.environ.get("LILHAWK_FLEET_URL", "").strip()


# ─── Lil_Hawk fleet registry ────────────────────────────────────────────
# Built-in catalog of worker classes the agent can dispatch to. Each
# entry names what the worker does + which Super Agent backs it.

LILHAWK_FLEET: Dict[str, Dict[str, Any]] = {
    "research": {
        "id": "research",
        "title": "Research Lil_Hawk",
        "description": "Web research via ii-researcher (Brave + Jina + DuckDuckGo). Multi-source synthesis. Use for: market intel, competitor analysis, fact-finding, SKU research.",
        "backed_by": "ii-researcher (vendored runtime/ii_researcher) + AIMS Gateway research_synthesis surface",
        "max_concurrent": 4,
    },
    "scrape": {
        "id": "scrape",
        "title": "Scrape Lil_Hawk",
        "description": "Site scraping + extraction via Firecrawl + Apify. Use for: bulk page download, structured data extraction from a domain.",
        "backed_by": "Firecrawl (canon) + Apify",
        "max_concurrent": 2,
    },
    "visual": {
        "id": "visual",
        "title": "Visual Lil_Hawk",
        "description": "Iller_Ang 4-step pipeline — GPT-Image-2 → Seedance 2.0 → FFmpeg → Remotion. Use for: product photos, motion landing-pages, campaign assets, NFT cards.",
        "backed_by": "Iller_Ang skill + Kie.ai gpt-image-2 + Seedance 2.0",
        "max_concurrent": 3,
    },
    "code": {
        "id": "code",
        "title": "Code Lil_Hawk",
        "description": "Code generation + review + refactor via Code_Ang agent (Sonnet 4-6 + repo-read tools). Use for: scaffolding, code audits, targeted bug fixes.",
        "backed_by": "Code_Ang agent (this repo: scripts/aims_agents/code_ang.py)",
        "max_concurrent": 2,
    },
    "outreach": {
        "id": "outreach",
        "title": "Outreach Lil_Hawk",
        "description": "B2B prospecting via LinkedIn + Maps agent (Sonnet 4-6 + LinkedIn API + Maps API). Use for: lead research, geo-validation, first-touch outreach drafts.",
        "backed_by": "linkedin_maps_agent (this repo: scripts/aims_agents/linkedin_maps_agent.py)",
        "max_concurrent": 2,
    },
    "data_extract": {
        "id": "data_extract",
        "title": "Data-Extract Lil_Hawk",
        "description": "Structured-output extraction from PDFs / HTML / unstructured text. Use for: parsing supplier docs, label compliance, contract intake.",
        "backed_by": "MarkItDown + AIMS Gateway structured_evaluation surface",
        "max_concurrent": 4,
    },
    "evaluate": {
        "id": "evaluate",
        "title": "Evaluate Lil_Hawk",
        "description": "Pass/fail evaluation against contracts via Crucible Judge_Hawk. Use for: brand-voice compliance, FDA strict-lane checks, structured-JSON validation.",
        "backed_by": "crucible_judge agent (this repo: scripts/aims_agents/crucible_judge.py)",
        "max_concurrent": 4,
    },
}


# ─── Activation ─────────────────────────────────────────────────────────


def is_configured() -> bool:
    from aims_gateway import is_configured as _gw_configured
    return _gw_configured()


def missing_keys() -> List[str]:
    out: List[str] = []
    from aims_gateway import is_configured as _gw_configured
    if not _gw_configured():
        out.append("INWORLD_API_KEY")
    return out


def fleet_url_configured() -> bool:
    return bool(FLEET_URL)


# ─── Dispatch DB ────────────────────────────────────────────────────────


def _ensure_db() -> None:
    DISPATCH_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DISPATCH_DB_PATH) as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS dispatches (
                task_id TEXT PRIMARY KEY,
                lilhawk_class TEXT,
                task_summary TEXT,
                payload_json TEXT,
                status TEXT,
                forwarded INTEGER,
                created_at TEXT,
                updated_at TEXT
            )
        """)
        c.commit()


# ─── Tool implementations ──────────────────────────────────────────────


def lilhawk_list() -> Dict[str, Any]:
    """List the Lil_Hawk worker classes available for dispatch."""
    return {
        "ok": True,
        "fleet": [
            {"id": v["id"], "title": v["title"], "description": v["description"], "max_concurrent": v["max_concurrent"]}
            for v in LILHAWK_FLEET.values()
        ],
    }


def lilhawk_assess_task(task: str) -> Dict[str, Any]:
    """Return the fleet listing + a hint that the model should reason
    over which class fits. (Pure metadata helper — no LLM call here;
    the calling agent does the reasoning.)"""
    return {
        "ok": True,
        "task_excerpt": (task or "")[:300],
        "fleet": list(LILHAWK_FLEET.keys()),
        "guidance": (
            "Pick the worker class whose `description` most closely "
            "matches the task. If multiple could fit, prefer the most "
            "specific. If none fit, return error so the operator can "
            "add a new class."
        ),
    }


def lilhawk_dispatch(
    lilhawk_class: str,
    task_summary: str,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Record a dispatch + optionally forward to the Chicken Hawk fleet
    endpoint. Returns the new task_id."""
    if lilhawk_class not in LILHAWK_FLEET:
        return {"error": f"unknown lilhawk_class '{lilhawk_class}' — fleet has {sorted(LILHAWK_FLEET.keys())}"}
    if not task_summary:
        return {"error": "task_summary required"}
    _ensure_db()

    import secrets
    from datetime import datetime, timezone
    task_id = f"lh_{secrets.token_hex(8)}"
    now = datetime.now(timezone.utc).isoformat()
    payload_json = json.dumps(payload or {})

    forwarded = 0
    forward_status: Dict[str, Any] = {}
    if FLEET_URL:
        try:
            r = requests.post(
                f"{FLEET_URL.rstrip('/')}/dispatch",
                json={"task_id": task_id, "class": lilhawk_class, "task": task_summary, "payload": payload or {}},
                timeout=15,
            )
            forward_status = {
                "status_code": r.status_code,
                "body_preview": r.text[:200],
            }
            if r.status_code == 200:
                forwarded = 1
        except requests.RequestException as exc:
            forward_status = {"error": f"forward failed: {exc}"}

    with sqlite3.connect(DISPATCH_DB_PATH) as c:
        c.execute(
            """INSERT INTO dispatches
                (task_id, lilhawk_class, task_summary, payload_json, status, forwarded, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (task_id, lilhawk_class, task_summary[:500], payload_json,
             "queued" if forwarded else "recorded_local", forwarded, now, now),
        )
        c.commit()
    return {
        "ok": True,
        "task_id": task_id,
        "lilhawk_class": lilhawk_class,
        "forwarded_to_fleet": bool(forwarded),
        "fleet_response": forward_status,
        "fleet_url_configured": fleet_url_configured(),
    }


def lilhawk_check_status(task_id: str) -> Dict[str, Any]:
    _ensure_db()
    with sqlite3.connect(DISPATCH_DB_PATH) as c:
        row = c.execute(
            "SELECT task_id, lilhawk_class, task_summary, status, forwarded, created_at, updated_at FROM dispatches WHERE task_id = ?",
            (task_id,),
        ).fetchone()
    if not row:
        return {"error": f"task_id '{task_id}' not found"}
    return {
        "ok": True,
        "task_id":       row[0],
        "lilhawk_class": row[1],
        "task_summary":  row[2],
        "status":        row[3],
        "forwarded":     bool(row[4]),
        "created_at":    row[5],
        "updated_at":    row[6],
    }


# ─── Tool registry ──────────────────────────────────────────────────────


TOOL_SCHEMA: List[Dict[str, Any]] = [
    {"type": "function", "function": {
        "name": "lilhawk_list",
        "description": "List available Lil_Hawk worker classes — research / scrape / visual / code / outreach / data_extract / evaluate. Returns id + title + description + max_concurrent for each.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    }},
    {"type": "function", "function": {
        "name": "lilhawk_assess_task",
        "description": "Inspect a task to get fleet metadata + guidance. Use early to ground your routing decision.",
        "parameters": {"type": "object", "properties": {
            "task": {"type": "string", "description": "Free-text task description."},
        }, "required": ["task"]},
    }},
    {"type": "function", "function": {
        "name": "lilhawk_dispatch",
        "description": "Dispatch a task to a Lil_Hawk worker class. Records to audit DB + optionally forwards to LILHAWK_FLEET_URL. Returns task_id.",
        "parameters": {"type": "object", "properties": {
            "lilhawk_class": {"type": "string", "description": "Worker class id from lilhawk_list."},
            "task_summary":  {"type": "string", "description": "One-sentence task summary for the worker + audit trail."},
            "payload":       {"type": "object", "description": "Optional worker-specific payload (urls, queries, etc.)."},
        }, "required": ["lilhawk_class", "task_summary"]},
    }},
    {"type": "function", "function": {
        "name": "lilhawk_check_status",
        "description": "Look up the current status of a dispatched task by task_id.",
        "parameters": {"type": "object", "properties": {
            "task_id": {"type": "string"},
        }, "required": ["task_id"]},
    }},
]


_TOOL_DISPATCH = {
    "lilhawk_list":         lambda **kw: lilhawk_list(),
    "lilhawk_assess_task":  lambda **kw: lilhawk_assess_task(kw.get("task", "")),
    "lilhawk_dispatch":     lambda **kw: lilhawk_dispatch(kw.get("lilhawk_class", ""), kw.get("task_summary", ""), kw.get("payload")),
    "lilhawk_check_status": lambda **kw: lilhawk_check_status(kw.get("task_id", "")),
}


# ─── Agent loop ────────────────────────────────────────────────────────


@dataclass
class DispatchResult:
    final_answer: str = ""
    task_id: Optional[str] = None
    lilhawk_class: Optional[str] = None
    iterations: int = 0
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None
    duration_ms: float = 0.0


_DEFAULT_SYSTEM_PROMPT = """\
You are the Lil_Hawk Dispatcher in the A.I.M.S. ecosystem. You receive \
incoming tasks, reason about which Lil_Hawk worker class fits best, \
and dispatch them. Chicken Hawk owns the fleet; you own the routing \
decision.

Workflow:
1. Call lilhawk_list (or lilhawk_assess_task for a task-aware view) to \
   ground your knowledge of what's available.
2. Read the incoming task carefully. Determine the work-type + the \
   specific deliverable.
3. Pick exactly ONE worker class. If multiple fit, prefer the most \
   specific. If nothing fits, return error.
4. Call lilhawk_dispatch(lilhawk_class, task_summary, payload) — \
   task_summary is the one-sentence brief the worker sees; payload is \
   any structured input (URLs, queries, SKUs, addresses).
5. Emit a 1-2 sentence final answer naming the chosen class + task_id.

Be ruthlessly literal about matching task → class. Don't dispatch a \
visual asset request to research.
"""


def run_agent(
    task: str,
    max_iterations: int = 4,
    system_prompt: Optional[str] = None,
) -> DispatchResult:
    from aims_gateway import chat_completion as _gw_chat_completion

    started = time.time()
    result = DispatchResult()

    if not is_configured():
        result.error = f"agent inactive — missing: {', '.join(missing_keys())}"
        result.duration_ms = (time.time() - started) * 1000
        return result

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": system_prompt or _DEFAULT_SYSTEM_PROMPT},
        {"role": "user", "content": task},
    ]

    for i in range(max_iterations):
        result.iterations = i + 1
        resp = _gw_chat_completion(
            surface="agent_orchestration",
            messages=messages,
            max_tokens=1024,
            temperature=0.2,
            extra_body={"tools": TOOL_SCHEMA, "tool_choice": "auto"},
            timeout=45,
        )
        if not resp:
            result.error = "gateway returned no response"
            break
        choice = (resp.get("choices") or [{}])[0]
        msg = choice.get("message") or {}
        tool_calls = msg.get("tool_calls") or []

        if tool_calls:
            messages.append(msg)
            for call in tool_calls:
                fn_name = (call.get("function") or {}).get("name", "")
                fn_args_raw = (call.get("function") or {}).get("arguments", "{}")
                try:
                    fn_args = json.loads(fn_args_raw) if isinstance(fn_args_raw, str) else fn_args_raw
                except json.JSONDecodeError:
                    fn_args = {}
                impl = _TOOL_DISPATCH.get(fn_name)
                tool_result = impl(**fn_args) if impl else {"error": f"unknown tool: {fn_name}"}
                if fn_name == "lilhawk_dispatch" and tool_result.get("ok"):
                    result.task_id = tool_result.get("task_id")
                    result.lilhawk_class = tool_result.get("lilhawk_class")
                result.tool_calls.append({
                    "iteration": i + 1, "tool": fn_name, "args": fn_args,
                    "result_preview": json.dumps(tool_result)[:400],
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.get("id", ""),
                    "content": json.dumps(tool_result),
                })
            continue

        content = msg.get("content")
        result.final_answer = (content or "").strip()
        result.duration_ms = (time.time() - started) * 1000
        return result

    result.error = f"max_iterations ({max_iterations}) reached without final dispatch"
    result.duration_ms = (time.time() - started) * 1000
    return result
