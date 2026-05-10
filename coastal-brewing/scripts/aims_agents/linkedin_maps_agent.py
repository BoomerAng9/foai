"""LinkedIn + Google Maps prospecting agent — A.I.M.S. ecosystem.

Owner directive 2026-05-06: B2B prospecting agent that researches a
LinkedIn profile / company, geo-validates via Google Maps Places, and
drafts outreach. Routes through the A.I.M.S. Model Gateway's
`linkedin_maps_agent` surface (Claude Sonnet 4-6) — multi-tool
orchestration accuracy earns the cost.

Tool surface:
- linkedin_search_profile(query)        — find a person/company on LinkedIn
- linkedin_get_profile(profile_url)     — fetch profile details
- linkedin_get_company(company_url)     — fetch company details
- maps_search_places(query, location)   — Google Maps Places search
- maps_geocode(address)                 — address → lat/lng + region
- maps_distance_matrix(origin, dests)   — driving distance / serviceable region check

Activation gates (until these env vars are set, endpoint returns 503):
- LINKEDIN_API_TOKEN — LinkedIn API access (use a partnered wrapper
  like Proxycurl, Phantombuster, or LinkedIn's own Marketing
  Developer Platform — direct LinkedIn API is gated)
- GOOGLE_MAPS_API_KEY — Maps Platform key with Places + Geocoding +
  Distance Matrix APIs enabled
- INWORLD_API_KEY (already in vault) — A.I.M.S. Gateway access for Sonnet

The agent runs the Sonnet tool-use loop: receive a goal → planner picks
which tool to call → execute tool → feed result back to model → repeat
until the model emits a final answer or hits max_iterations.

This is the FIRST agent surface that uses tool-calling end-to-end in
the A.I.M.S. ecosystem. Pattern here becomes the template for
Code_Ang, Lil_Hawk dispatch, Crucible Judge_Hawk, and other
agentic surfaces.
"""
from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import requests

log = logging.getLogger("aims.linkedin_maps_agent")


# ─── Activation gates ───────────────────────────────────────────────────


def linkedin_configured() -> bool:
    return bool(os.environ.get("LINKEDIN_API_TOKEN", "").strip())


def maps_configured() -> bool:
    return bool(os.environ.get("GOOGLE_MAPS_API_KEY", "").strip())


def is_configured() -> bool:
    """All three keys must be present: LinkedIn + Maps + Inworld
    (gateway). If any is missing, the endpoint returns 503 with a
    clear list of which key is absent."""
    from aims_gateway import is_configured as _gw_configured
    return linkedin_configured() and maps_configured() and _gw_configured()


def missing_keys() -> List[str]:
    """Diagnose which env vars are blocking activation."""
    out: List[str] = []
    from aims_gateway import is_configured as _gw_configured
    if not _gw_configured():
        out.append("INWORLD_API_KEY")
    if not linkedin_configured():
        out.append("LINKEDIN_API_TOKEN")
    if not maps_configured():
        out.append("GOOGLE_MAPS_API_KEY")
    return out


# ─── Tool implementations ──────────────────────────────────────────────


def linkedin_search_profile(query: str, limit: int = 5) -> Dict[str, Any]:
    """Search LinkedIn for a profile or company matching the query.

    Provider: Proxycurl (canonical wrapper for LinkedIn data — direct
    LinkedIn API access requires an enterprise-tier Marketing Developer
    Platform agreement). Endpoint pattern is OAS-documented at
    https://nubela.co/proxycurl/.
    """
    token = os.environ.get("LINKEDIN_API_TOKEN", "").strip()
    if not token:
        return {"error": "LINKEDIN_API_TOKEN not configured"}
    try:
        r = requests.get(
            "https://nubela.co/proxycurl/api/search/person",
            headers={"Authorization": f"Bearer {token}"},
            params={"page_size": min(limit, 10), "country": "US",
                    "first_name": query.split()[0] if query else ""},
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
        return {
            "ok": True,
            "results": data.get("results", [])[:limit],
        }
    except requests.RequestException as exc:
        return {"error": f"linkedin_search failed: {exc}"}


def linkedin_get_profile(profile_url: str) -> Dict[str, Any]:
    """Fetch a LinkedIn profile by URL."""
    token = os.environ.get("LINKEDIN_API_TOKEN", "").strip()
    if not token:
        return {"error": "LINKEDIN_API_TOKEN not configured"}
    try:
        r = requests.get(
            "https://nubela.co/proxycurl/api/v2/linkedin",
            headers={"Authorization": f"Bearer {token}"},
            params={"url": profile_url, "fallback_to_cache": "on-error"},
            timeout=30,
        )
        r.raise_for_status()
        return {"ok": True, "profile": r.json()}
    except requests.RequestException as exc:
        return {"error": f"linkedin_get_profile failed: {exc}"}


def maps_search_places(query: str, location: str = "", radius_m: int = 5000) -> Dict[str, Any]:
    """Google Maps Places API search. Returns list of place candidates
    matching the query, optionally biased toward a location."""
    key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if not key:
        return {"error": "GOOGLE_MAPS_API_KEY not configured"}
    try:
        params: Dict[str, Any] = {"query": query, "key": key}
        if location:
            geocoded = maps_geocode(location)
            if geocoded.get("ok"):
                latlng = geocoded["lat"], geocoded["lng"]
                params["location"] = f"{latlng[0]},{latlng[1]}"
                params["radius"] = radius_m
        r = requests.get(
            "https://maps.googleapis.com/maps/api/place/textsearch/json",
            params=params,
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
        return {
            "ok": True,
            "results": [
                {
                    "name": p.get("name"),
                    "address": p.get("formatted_address"),
                    "place_id": p.get("place_id"),
                    "lat": (p.get("geometry") or {}).get("location", {}).get("lat"),
                    "lng": (p.get("geometry") or {}).get("location", {}).get("lng"),
                    "rating": p.get("rating"),
                    "types": p.get("types", []),
                }
                for p in data.get("results", [])[:10]
            ],
        }
    except requests.RequestException as exc:
        return {"error": f"maps_search failed: {exc}"}


def maps_geocode(address: str) -> Dict[str, Any]:
    """Geocode an address → lat/lng + administrative components."""
    key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if not key:
        return {"error": "GOOGLE_MAPS_API_KEY not configured"}
    try:
        r = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": address, "key": key},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        results = data.get("results") or []
        if not results:
            return {"error": "no_geocode_match", "address": address}
        first = results[0]
        loc = (first.get("geometry") or {}).get("location") or {}
        return {
            "ok": True,
            "address": address,
            "formatted": first.get("formatted_address"),
            "lat": loc.get("lat"),
            "lng": loc.get("lng"),
            "place_id": first.get("place_id"),
            "components": first.get("address_components", []),
        }
    except requests.RequestException as exc:
        return {"error": f"maps_geocode failed: {exc}"}


def maps_distance_matrix(origin: str, destinations: List[str]) -> Dict[str, Any]:
    """Driving distance + duration from origin to each destination."""
    key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if not key:
        return {"error": "GOOGLE_MAPS_API_KEY not configured"}
    try:
        r = requests.get(
            "https://maps.googleapis.com/maps/api/distancematrix/json",
            params={
                "origins": origin,
                "destinations": "|".join(destinations[:25]),
                "mode": "driving",
                "units": "imperial",
                "key": key,
            },
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
        rows = data.get("rows") or []
        if not rows:
            return {"error": "no_distance_data"}
        elements = rows[0].get("elements", [])
        return {
            "ok": True,
            "origin": data.get("origin_addresses", [origin])[0],
            "destinations": [
                {
                    "address": data.get("destination_addresses", [])[i] if i < len(data.get("destination_addresses", [])) else destinations[i],
                    "distance_text": (e.get("distance") or {}).get("text"),
                    "distance_meters": (e.get("distance") or {}).get("value"),
                    "duration_text": (e.get("duration") or {}).get("text"),
                    "duration_seconds": (e.get("duration") or {}).get("value"),
                    "status": e.get("status"),
                }
                for i, e in enumerate(elements)
            ],
        }
    except requests.RequestException as exc:
        return {"error": f"maps_distance failed: {exc}"}


# ─── Tool registry — Sonnet tool-use schema ─────────────────────────────


TOOL_SCHEMA: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "linkedin_search_profile",
            "description": "Search LinkedIn for a person or company matching the query. Returns up to N results with name, headline, profile URL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Free-text search — name, role, company, or industry."},
                    "limit": {"type": "integer", "description": "Max results to return (default 5, max 10)."},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "linkedin_get_profile",
            "description": "Fetch a full LinkedIn profile by URL. Returns headline, current role, company, location, experience, skills.",
            "parameters": {
                "type": "object",
                "properties": {
                    "profile_url": {"type": "string", "description": "LinkedIn profile URL (https://linkedin.com/in/...)."},
                },
                "required": ["profile_url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "maps_search_places",
            "description": "Google Maps Places search. Find businesses, cafés, hotels, offices, etc. matching a query, optionally biased to a location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Free-text search — e.g., 'specialty coffee bluffton sc'."},
                    "location": {"type": "string", "description": "Optional address or city to bias results around."},
                    "radius_m": {"type": "integer", "description": "Search radius in meters (default 5000)."},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "maps_geocode",
            "description": "Geocode a postal address or place name to lat/lng + administrative region.",
            "parameters": {
                "type": "object",
                "properties": {
                    "address": {"type": "string", "description": "Address or place to geocode."},
                },
                "required": ["address"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "maps_distance_matrix",
            "description": "Compute driving distance + duration from one origin to up to 25 destinations. Use to score serviceable-region fit for a Coastal lead.",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string", "description": "Origin address."},
                    "destinations": {"type": "array", "items": {"type": "string"}, "description": "List of destination addresses."},
                },
                "required": ["origin", "destinations"],
            },
        },
    },
]


_TOOL_DISPATCH = {
    "linkedin_search_profile": lambda **kw: linkedin_search_profile(kw.get("query", ""), kw.get("limit", 5)),
    "linkedin_get_profile":    lambda **kw: linkedin_get_profile(kw.get("profile_url", "")),
    "maps_search_places":      lambda **kw: maps_search_places(kw.get("query", ""), kw.get("location", ""), kw.get("radius_m", 5000)),
    "maps_geocode":            lambda **kw: maps_geocode(kw.get("address", "")),
    "maps_distance_matrix":    lambda **kw: maps_distance_matrix(kw.get("origin", ""), kw.get("destinations", [])),
}


# ─── Agent loop ────────────────────────────────────────────────────────


@dataclass
class AgentResult:
    final_answer: str = ""
    iterations: int = 0
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None
    duration_ms: float = 0.0


_DEFAULT_SYSTEM_PROMPT = """\
You are a B2B prospecting agent for the A.I.M.S. ecosystem (currently \
serving Coastal Brewing Co. as the first vertical). You research \
prospects on LinkedIn, geo-validate them via Google Maps, and produce \
a concise lead brief: who they are, where they are, why they fit, and \
a suggested first-touch outreach line. Be specific and citation-ready.

Output rules: when you have enough information, return a clean lead brief \
in plain prose — no markdown, no bullets, no preamble. Cite source URLs \
inline. Stop calling tools as soon as you can produce a confident answer.

Never fabricate. If the LinkedIn or Maps tools return no results, say \
that plainly instead of guessing.
"""


def run_agent(
    goal: str,
    max_iterations: int = 6,
    system_prompt: Optional[str] = None,
) -> AgentResult:
    """Execute the LinkedIn + Maps prospecting loop. Routes through
    A.I.M.S. Gateway → `linkedin_maps_agent` surface (Sonnet 4-6).

    Returns a final answer + tool-call audit trail. Caller (the
    /api/v1/agent/linkedin-maps endpoint) renders this for the UI.
    """
    from aims_gateway import (   # noqa: E402
        chat_completion as _gw_chat_completion,
        model_for as _gw_model_for,
    )

    started = time.time()
    result = AgentResult()

    if not is_configured():
        result.error = (
            f"agent inactive — missing env vars: {', '.join(missing_keys())}"
        )
        result.duration_ms = (time.time() - started) * 1000
        return result

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": system_prompt or _DEFAULT_SYSTEM_PROMPT},
        {"role": "user", "content": goal},
    ]

    for i in range(max_iterations):
        result.iterations = i + 1
        resp = _gw_chat_completion(
            surface="linkedin_maps_agent",
            messages=messages,
            max_tokens=2048,
            temperature=0.3,
            extra_body={"tools": TOOL_SCHEMA, "tool_choice": "auto"},
            timeout=60,
        )
        if not resp:
            result.error = "gateway returned no response"
            break
        choice = (resp.get("choices") or [{}])[0]
        msg = choice.get("message") or {}
        finish_reason = choice.get("finish_reason")

        # If the model emitted tool calls, execute each and feed results back.
        tool_calls = msg.get("tool_calls") or []
        if tool_calls:
            messages.append(msg)   # assistant message with tool_calls
            for call in tool_calls:
                fn_name = (call.get("function") or {}).get("name", "")
                fn_args_raw = (call.get("function") or {}).get("arguments", "{}")
                try:
                    fn_args = json.loads(fn_args_raw) if isinstance(fn_args_raw, str) else fn_args_raw
                except json.JSONDecodeError:
                    fn_args = {}
                impl = _TOOL_DISPATCH.get(fn_name)
                if impl is None:
                    tool_result = {"error": f"unknown tool: {fn_name}"}
                else:
                    try:
                        tool_result = impl(**fn_args)
                    except Exception as exc:
                        tool_result = {"error": f"{fn_name} raised: {exc}"}
                result.tool_calls.append({
                    "iteration": i + 1,
                    "tool": fn_name,
                    "args": fn_args,
                    "result_preview": json.dumps(tool_result)[:400],
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.get("id", ""),
                    "content": json.dumps(tool_result),
                })
            continue   # next iteration — model sees tool results

        # No tool calls — model produced a final answer.
        content = msg.get("content")
        result.final_answer = (content or "").strip()
        result.duration_ms = (time.time() - started) * 1000
        return result

    # Hit max_iterations without final answer.
    result.error = f"max_iterations ({max_iterations}) reached without final answer"
    result.duration_ms = (time.time() - started) * 1000
    return result
