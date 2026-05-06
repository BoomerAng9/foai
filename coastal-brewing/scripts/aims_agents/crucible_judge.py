"""Crucible Judge_Hawk — pass/fail evaluation against contracts.

Routes through the A.I.M.S. Model Gateway's `structured_evaluation`
surface (Claude Sonnet 4-6). Sonnet earns its cost here on
structured-output reliability — Judge_Hawk emits machine-parseable
verdict objects that downstream agents (Generator loops, FORGE gates,
Lil_Hawk dispatch) consume.

Pattern: input is `{contract, output_under_eval}`. Contract is a
declarative spec — list of pass/fail criteria. Judge_Hawk reads the
contract + the output, scores each criterion, returns a verdict
object: `{verdict: "pass"|"fail"|"partial", criteria: [{id, status,
evidence}], confidence}`.

Contracts live in a SQLite-backed registry (`crucible_contracts.db`
inside the runner) — owner-loadable via `judge_load_contract`. A
small built-in catalog of canonical contracts ships in this module
so the agent works out of the box.

Activation: only requires INWORLD_API_KEY (gateway access — already
in vault). No external API dependencies.
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

log = logging.getLogger("aims.crucible_judge")

CONTRACTS_DB_PATH = pathlib.Path(
    os.environ.get(
        "CRUCIBLE_CONTRACTS_DB",
        str(pathlib.Path(__file__).resolve().parent.parent.parent / "audit_ledger" / "crucible_contracts.db"),
    )
)


# ─── Built-in contract catalog ──────────────────────────────────────────
# Canonical pass/fail contracts that ship with Judge_Hawk so the agent
# is useful out of the box. Owner can add more via judge_register_contract.

BUILTIN_CONTRACTS: Dict[str, Dict[str, Any]] = {
    "coastal_brand_voice": {
        "id": "coastal_brand_voice",
        "title": "Coastal Brewing Co. brand-voice compliance",
        "criteria": [
            {"id": "no_exclamation",       "rule": "Contains zero exclamation marks (!)."},
            {"id": "no_marketing_fluff",   "rule": "Does not use words: 'elevate', 'experience' (as a marketing noun), 'journey', 'indulge', 'premium' (as adjective), 'best-in-class', 'story-driven', 'curated' (without specific certification)."},
            {"id": "no_health_claims",     "rule": "Makes no health, supplement, antioxidant, immunity, focus, gut-health, weight-loss, blood-pressure, blood-sugar, cardiovascular, or therapeutic claim."},
            {"id": "no_supplier_name",     "rule": "Does not name 'Temecula', 'TCR', or any supplier-name leaking the wholesale roastery to customers."},
            {"id": "no_internal_names",    "rule": "Does not surface internal Boomer_Ang names (Sal_Ang, Melli_Capensi, LUC_Ang, ACHEEVY) when persona names are not part of the customer-visible cast — names like Sal, Melli, LUC, ACHEEVY are OK as customer-facing labels."},
            {"id": "owner_signed_paper_trail", "rule": "If the output makes a public claim (origin, certification, sourcing), the claim is either factually anchored in the catalog/sourcing canon OR the output explicitly notes the certificate is on file."},
        ],
    },
    "tcr_mushroom_strict_lane": {
        "id": "tcr_mushroom_strict_lane",
        "title": "TCR functional / mushroom strict-lane compliance (FDA + supplier requirement)",
        "criteria": [
            {"id": "statement_of_identity",    "rule": "Statement of identity is one of the locked phrases: 'Ground Coffee With Mushrooms', 'Instant Coffee With Mushrooms', 'Roasted Green Tea With Mushrooms', 'Matcha Green Tea With Mushrooms'. No paraphrasing."},
            {"id": "soft_qualifiers_only",     "rule": "Any benefit-adjacent phrasing uses ONLY traditional-use language: 'long valued for', 'traditionally used', 'appreciated for'. No therapeutic verbs (boosts, reduces, treats, prevents, supports, enhances)."},
            {"id": "no_therapeutic_claims",    "rule": "Does NOT claim immunity, focus, mental clarity, energy, anti-inflammatory, neuroprotective, gut-health, or any disease-state assertion."},
            {"id": "food_not_supplement",      "rule": "Frames the product as food or beverage, not as a dietary supplement or medicine."},
            {"id": "prop_65_referenced",       "rule": "If discussing label or packaging, references the California Proposition 65 notice that's on every functional package."},
        ],
    },
    "structured_json_output": {
        "id": "structured_json_output",
        "title": "Output is valid JSON conforming to the requested schema.",
        "criteria": [
            {"id": "valid_json",       "rule": "Output parses as valid JSON without trailing prose, markdown fencing, or commentary."},
            {"id": "schema_match",     "rule": "All required schema fields are present with the requested types."},
            {"id": "no_extra_fields",  "rule": "No fields outside the requested schema (unless schema marks the object as open)."},
        ],
    },
    "agent_hand_off_safety": {
        "id": "agent_hand_off_safety",
        "title": "Agent → agent hand-off is safe to forward.",
        "criteria": [
            {"id": "task_specific",    "rule": "The hand-off message is specific (one task, clear deliverable) — not a vague 'help with X'."},
            {"id": "scoped_authority", "rule": "The hand-off respects tier authority — Sal does not commit to discounts above his ceiling, Melli stays in bulk lane, LUC does not approve, ACHEEVY signs final."},
            {"id": "no_ip_leakage",    "rule": "Internal infrastructure (model names, supplier name, internal tool names) is not embedded in the hand-off payload."},
            {"id": "audit_breadcrumb", "rule": "Hand-off carries a session_id or task_id so the audit ledger can stitch it to upstream context."},
        ],
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


# ─── Contract registry (SQLite-backed) ──────────────────────────────────


def _ensure_db() -> None:
    CONTRACTS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(CONTRACTS_DB_PATH) as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS contracts (
                id TEXT PRIMARY KEY,
                title TEXT,
                criteria_json TEXT,
                created_at TEXT
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS verdicts (
                verdict_id TEXT PRIMARY KEY,
                contract_id TEXT,
                verdict TEXT,
                criteria_json TEXT,
                confidence REAL,
                output_preview TEXT,
                created_at TEXT
            )
        """)
        c.commit()


# ─── Tool implementations ──────────────────────────────────────────────


def judge_load_contract(contract_id: str) -> Dict[str, Any]:
    """Fetch a contract by id — checks built-in catalog first, then DB."""
    if contract_id in BUILTIN_CONTRACTS:
        return {"ok": True, "contract": BUILTIN_CONTRACTS[contract_id], "source": "builtin"}
    _ensure_db()
    with sqlite3.connect(CONTRACTS_DB_PATH) as c:
        row = c.execute(
            "SELECT id, title, criteria_json FROM contracts WHERE id = ?",
            (contract_id,),
        ).fetchone()
    if not row:
        return {"error": f"contract '{contract_id}' not found"}
    return {
        "ok": True,
        "contract": {
            "id": row[0],
            "title": row[1],
            "criteria": json.loads(row[2]),
        },
        "source": "db",
    }


def judge_list_contracts() -> Dict[str, Any]:
    _ensure_db()
    with sqlite3.connect(CONTRACTS_DB_PATH) as c:
        db_rows = c.execute("SELECT id, title FROM contracts").fetchall()
    builtin = [{"id": k, "title": v["title"], "source": "builtin"} for k, v in BUILTIN_CONTRACTS.items()]
    db_list = [{"id": r[0], "title": r[1], "source": "db"} for r in db_rows]
    return {"ok": True, "contracts": builtin + db_list}


def judge_register_contract(
    contract_id: str, title: str, criteria: List[Dict[str, str]],
) -> Dict[str, Any]:
    if not contract_id or not criteria:
        return {"error": "contract_id and criteria required"}
    _ensure_db()
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(CONTRACTS_DB_PATH) as c:
        c.execute(
            "INSERT OR REPLACE INTO contracts (id, title, criteria_json, created_at) VALUES (?, ?, ?, ?)",
            (contract_id, title, json.dumps(criteria), now),
        )
        c.commit()
    return {"ok": True, "contract_id": contract_id}


def judge_record_verdict(
    contract_id: str,
    verdict: str,
    criteria_results: List[Dict[str, str]],
    confidence: float,
    output_preview: str = "",
) -> Dict[str, Any]:
    """Persist a verdict for audit / downstream-agent consumption."""
    _ensure_db()
    import secrets
    from datetime import datetime, timezone
    verdict_id = f"v_{secrets.token_hex(8)}"
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(CONTRACTS_DB_PATH) as c:
        c.execute(
            "INSERT INTO verdicts (verdict_id, contract_id, verdict, criteria_json, confidence, output_preview, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (verdict_id, contract_id, verdict, json.dumps(criteria_results),
             float(confidence), output_preview[:500], now),
        )
        c.commit()
    return {"ok": True, "verdict_id": verdict_id, "recorded_at": now}


# ─── Tool registry ──────────────────────────────────────────────────────


TOOL_SCHEMA: List[Dict[str, Any]] = [
    {"type": "function", "function": {
        "name": "judge_load_contract",
        "description": "Load a contract by id. Returns title + criteria list. Built-in contracts: coastal_brand_voice, tcr_mushroom_strict_lane, structured_json_output, agent_hand_off_safety.",
        "parameters": {"type": "object", "properties": {
            "contract_id": {"type": "string"},
        }, "required": ["contract_id"]},
    }},
    {"type": "function", "function": {
        "name": "judge_list_contracts",
        "description": "List all available contracts (built-in + DB-registered).",
        "parameters": {"type": "object", "properties": {}, "required": []},
    }},
    {"type": "function", "function": {
        "name": "judge_register_contract",
        "description": "Register a new contract in the DB. Use sparingly — most contracts should ship in the built-in catalog.",
        "parameters": {"type": "object", "properties": {
            "contract_id": {"type": "string"},
            "title": {"type": "string"},
            "criteria": {"type": "array", "items": {"type": "object", "properties": {
                "id": {"type": "string"}, "rule": {"type": "string"},
            }, "required": ["id", "rule"]}},
        }, "required": ["contract_id", "title", "criteria"]},
    }},
    {"type": "function", "function": {
        "name": "judge_record_verdict",
        "description": "Persist your verdict to the audit DB after evaluating an output. Call this once per evaluation as the final action.",
        "parameters": {"type": "object", "properties": {
            "contract_id":      {"type": "string"},
            "verdict":          {"type": "string", "enum": ["pass", "fail", "partial"]},
            "criteria_results": {"type": "array", "items": {"type": "object", "properties": {
                "id": {"type": "string"}, "status": {"type": "string", "enum": ["pass","fail","unknown"]}, "evidence": {"type": "string"},
            }, "required": ["id","status","evidence"]}},
            "confidence":       {"type": "number"},
            "output_preview":   {"type": "string"},
        }, "required": ["contract_id","verdict","criteria_results","confidence"]},
    }},
]


_TOOL_DISPATCH = {
    "judge_load_contract":     lambda **kw: judge_load_contract(kw.get("contract_id", "")),
    "judge_list_contracts":    lambda **kw: judge_list_contracts(),
    "judge_register_contract": lambda **kw: judge_register_contract(kw.get("contract_id", ""), kw.get("title", ""), kw.get("criteria", [])),
    "judge_record_verdict":    lambda **kw: judge_record_verdict(kw.get("contract_id", ""), kw.get("verdict", ""), kw.get("criteria_results", []), kw.get("confidence", 0.0), kw.get("output_preview", "")),
}


# ─── Agent loop ────────────────────────────────────────────────────────


@dataclass
class JudgeResult:
    verdict: str = ""           # pass | fail | partial | error
    final_answer: str = ""      # rationale
    iterations: int = 0
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None
    duration_ms: float = 0.0


_DEFAULT_SYSTEM_PROMPT = """\
You are Judge_Hawk, the structured evaluation agent for the A.I.M.S. \
Crucible. You evaluate an output against a contract — a declarative \
list of pass/fail criteria. Your job is to load the contract, check \
each criterion against the output, persist a verdict to the audit \
ledger, and explain your reasoning concisely.

Workflow:
1. Call judge_load_contract(contract_id) to fetch the criteria.
2. Read the output_under_eval (provided in the user prompt).
3. For each criterion, decide pass / fail / unknown with a one-line \
   evidence quote from the output (or "no relevant content" for \
   unknowns).
4. Compute the overall verdict: pass = ALL criteria pass; fail = ANY \
   criterion fails; partial = mix of pass + unknown (no fails).
5. Call judge_record_verdict(...) once with the final verdict + \
   criteria_results + confidence (0.0–1.0) + output_preview (first \
   400 chars).
6. After judge_record_verdict returns ok, emit a 2-3 sentence final \
   answer summarizing the verdict + key findings. No markdown, no \
   bullets.

Be ruthlessly literal. If a criterion says "zero exclamation marks" \
and the output has one, it FAILS — no narrative softening. Cite \
exact evidence.
"""


def run_agent(
    contract_id: str,
    output_under_eval: str,
    max_iterations: int = 6,
    system_prompt: Optional[str] = None,
) -> JudgeResult:
    from aims_gateway import chat_completion as _gw_chat_completion

    started = time.time()
    result = JudgeResult()

    if not is_configured():
        result.error = f"agent inactive — missing: {', '.join(missing_keys())}"
        result.duration_ms = (time.time() - started) * 1000
        return result

    user_prompt = (
        f"Contract to load + evaluate against: `{contract_id}`\n\n"
        f"Output under evaluation:\n\n---OUTPUT_BEGIN---\n"
        f"{output_under_eval[:8000]}\n---OUTPUT_END---\n\n"
        f"Run the evaluation workflow."
    )
    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": system_prompt or _DEFAULT_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    final_verdict = ""
    for i in range(max_iterations):
        result.iterations = i + 1
        resp = _gw_chat_completion(
            surface="structured_evaluation",
            messages=messages,
            max_tokens=2048,
            temperature=0.1,
            extra_body={"tools": TOOL_SCHEMA, "tool_choice": "auto"},
            timeout=60,
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
                # Capture verdict when judge_record_verdict fires.
                if fn_name == "judge_record_verdict":
                    final_verdict = fn_args.get("verdict", "")
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
        result.verdict = final_verdict or "unknown"
        result.duration_ms = (time.time() - started) * 1000
        return result

    result.verdict = final_verdict or "error"
    result.error = f"max_iterations ({max_iterations}) reached without final answer"
    result.duration_ms = (time.time() - started) * 1000
    return result
