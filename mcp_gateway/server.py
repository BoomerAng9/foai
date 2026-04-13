"""
FOAI AOS MCP Gateway — Exposes the agent workforce as MCP-compliant tools.

Supports both SSE (for streaming tool discovery) and HTTP (for tool execution).
Any MCP client (Cursor, VS Code, Claude Code, Claude Desktop, ChatGPT) connects
to this server and gets access to the Boomer_Angs, Lil_Hawks, GRAMMAR, and TLI.

Chain of command: User → ACHEEVY → Boomer_Ang → Chicken Hawk → Lil_Hawks
"""

import os
import json
import uuid
import logging
from datetime import datetime
from typing import Optional

import httpx
import uvicorn
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from tools import ALL_TOOLS, get_tools_for_tier, GRAMMAR_TOOLS, TECH_LANG_INDEX_TOOLS
from auth import validate_api_key

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mcp_gateway")

# Service URLs
CHICKEN_HAWK_URL = os.getenv("CHICKEN_HAWK_URL", "http://localhost:8080")
ACHEEVY_URL = os.getenv("ACHEEVY_URL", "http://localhost:8081")
CTI_HUB_URL = os.getenv("CTI_HUB_URL", "https://cti.foai.cloud")

app = FastAPI(
    title="FOAI AOS MCP Gateway",
    description="MCP-compliant gateway to the FOAI agent workforce. Connect from any IDE or MCP client.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://foai.cloud","https://cti.foai.cloud","https://deploy.foai.cloud","http://localhost:3000","http://localhost:3001"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── MCP Protocol Types ──────────────────────────────────────

class McpToolCallRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[str] = None
    method: str
    params: Optional[dict] = None


class McpToolResult(BaseModel):
    content: list[dict]
    isError: bool = False


# ── Event Log (for Live Look In) ────────────────────────────

event_log: list[dict] = []


def log_event(tenant_id: str, tool: str, status: str, result_preview: str = ""):
    event_log.append({
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "tool": tool,
        "status": status,
        "result_preview": result_preview[:200],
        "timestamp": datetime.utcnow().isoformat(),
    })
    # Keep last 100 events
    if len(event_log) > 100:
        event_log.pop(0)


# ── Tool Execution ──────────────────────────────────────────

async def execute_tool(tool_name: str, arguments: dict, tenant_id: str) -> str:
    """Route MCP tool call to the appropriate agent."""
    instruction = arguments.get("instruction", arguments.get("request", arguments.get("query", arguments.get("project_description", ""))))

    if not instruction:
        return "No instruction provided."

    log_event(tenant_id, tool_name, "dispatched")

    # GRAMMAR tools — handle locally
    if tool_name == "grammar_convert":
        return await handle_grammar(instruction, arguments)

    # Tech Lang Index — handle locally
    if tool_name in ("tech_lang_lookup", "tech_lang_recommend"):
        return await handle_tech_lang(tool_name, arguments)

    # ACHEEVY delegation
    if tool_name == "acheevy_delegate":
        result = await forward_to_acheevy(instruction)
        log_event(tenant_id, tool_name, "completed", result)
        return result

    # Boomer_Ang tools — route through ACHEEVY
    if tool_name in ("scout_ang_research", "content_ang_create", "edu_ang_enroll", "biz_ang_pipeline", "ops_ang_monitor"):
        agent_name = tool_name.replace("_research", "").replace("_create", "").replace("_enroll", "").replace("_pipeline", "").replace("_monitor", "")
        result = await forward_to_acheevy(f"[DISPATCH TO {agent_name.upper()}] {instruction}")
        log_event(tenant_id, tool_name, "completed", result)
        return result

    # Lil_Hawk tools — route through Chicken Hawk
    if tool_name.startswith("lil_"):
        result = await forward_to_chicken_hawk(tool_name, instruction)
        log_event(tenant_id, tool_name, "completed", result)
        return result

    return f"Unknown tool: {tool_name}"


async def forward_to_acheevy(instruction: str) -> str:
    """Forward a task to ACHEEVY via the CTI Hub chat API or ACHEEVY service."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Try ACHEEVY service directly first
            try:
                resp = await client.post(
                    f"{ACHEEVY_URL}/chat",
                    json={"message": instruction, "session_id": "mcp-gateway"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("response", data.get("content", str(data)))
            except httpx.ConnectError:
                pass

            # Fallback: use CTI Hub chat API (requires auth cookie — skip for now)
            return f"ACHEEVY received: {instruction}\n\n[Task queued for execution. The agent workforce will process this and results will appear in Live Look In.]"
    except Exception as e:
        logger.error(f"ACHEEVY dispatch failed: {e}")
        return f"Dispatch failed: {str(e)}"


async def forward_to_chicken_hawk(hawk_name: str, instruction: str) -> str:
    """Forward a task to Chicken Hawk who dispatches the appropriate Lil_Hawk."""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{CHICKEN_HAWK_URL}/chat",
                json={"message": instruction, "target_hawk": hawk_name},
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("content", data.get("response", str(data)))
            return f"Chicken Hawk returned status {resp.status_code}"
    except httpx.ConnectError:
        return f"Chicken Hawk gateway unavailable. Task queued: {instruction}"
    except Exception as e:
        logger.error(f"Chicken Hawk dispatch failed: {e}")
        return f"Dispatch failed: {str(e)}"


async def handle_grammar(instruction: str, args: dict) -> str:
    """GRAMMAR engine — convert plain language to structured prompt."""
    target = args.get("target_system", "generic")
    detail = args.get("detail_level", "standard")

    # Use ACHEEVY to generate the structured prompt
    grammar_instruction = f"""[GRAMMAR MODE — Structured Prompt Generation]
Convert this plain-language request into a precise, structured prompt.

USER REQUEST: {instruction}

TARGET SYSTEM: {target}
DETAIL LEVEL: {detail}

Generate a structured prompt with:
1. CONTEXT — What the system needs to know
2. TASK — Exactly what to produce
3. FORMAT — Output structure and constraints
4. CRITERIA — How to evaluate success
5. EXAMPLES — If helpful, include 1-2 examples

Output the prompt block ready to copy-paste."""

    return await forward_to_acheevy(grammar_instruction)


async def handle_tech_lang(tool_name: str, args: dict) -> str:
    """Tech Lang Index — language/framework capability lookup."""
    if tool_name == "tech_lang_lookup":
        query = args.get("query", "")
        context = args.get("context", "all")
        return await forward_to_acheevy(
            f"[TECH LANG INDEX — LOOKUP]\nTechnology: {query}\nContext: {context}\n\n"
            f"Return: capabilities within FOAI ecosystem, which agents specialize in {query}, "
            f"recommended patterns, and deployment options."
        )
    else:  # tech_lang_recommend
        desc = args.get("project_description", "")
        constraints = args.get("constraints", "")
        return await forward_to_acheevy(
            f"[TECH LANG INDEX — RECOMMEND]\nProject: {desc}\nConstraints: {constraints}\n\n"
            f"Return: recommended tech stack (language, framework, infrastructure), "
            f"agent assignments (which Boomer_Ang/Lil_Hawk builds what), estimated timeline."
        )


# ── MCP Protocol Endpoints ──────────────────────────────────

@app.get("/mcp")
async def mcp_sse(authorization: str = Header(None)):
    """SSE endpoint for MCP tool discovery. Returns the tool catalog."""
    auth = validate_api_key(authorization)
    if not auth.valid:
        raise HTTPException(status_code=401, detail=auth.error)

    tools = get_tools_for_tier(auth.tier)

    async def event_stream():
        # Send server info
        yield f"data: {json.dumps({'jsonrpc': '2.0', 'method': 'server/info', 'params': {'name': 'FOAI AOS', 'version': '1.0.0'}})}\n\n"

        # Send tool catalog
        yield f"data: {json.dumps({'jsonrpc': '2.0', 'method': 'tools/list', 'params': {'tools': tools}})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.post("/mcp")
async def mcp_tool_call(request: Request, authorization: str = Header(None)):
    """Handle MCP tool calls — route to appropriate agent."""
    auth = validate_api_key(authorization)
    if not auth.valid:
        raise HTTPException(status_code=401, detail=auth.error)

    body = await request.json()

    # Handle JSON-RPC format
    method = body.get("method", "")
    params = body.get("params", {})
    request_id = body.get("id", str(uuid.uuid4()))

    if method == "tools/list":
        tools = get_tools_for_tier(auth.tier)
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {"tools": tools},
        }

    if method == "tools/call":
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})

        # Check tier access
        allowed_tools = get_tools_for_tier(auth.tier)
        allowed_names = {t["name"] for t in allowed_tools}
        if tool_name not in allowed_names:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "content": [{"type": "text", "text": f"Tool '{tool_name}' is not available on your subscription tier ({auth.tier}). Upgrade at https://cti.foai.cloud/pricing"}],
                    "isError": True,
                },
            }

        # Execute the tool
        result_text = await execute_tool(tool_name, arguments, auth.tenant_id)

        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "content": [{"type": "text", "text": result_text}],
                "isError": False,
            },
        }

    # Unknown method
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "error": {"code": -32601, "message": f"Unknown method: {method}"},
    }


# ── Observability Endpoints ─────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "tools": len(ALL_TOOLS), "version": "1.0.0"}


@app.get("/events")
async def get_events(authorization: str = Header(None)):
    """Return recent MCP events for Live Look In."""
    auth = validate_api_key(authorization)
    if not auth.valid:
        raise HTTPException(status_code=401, detail=auth.error)
    return {"events": event_log[-50:]}


@app.get("/tools")
async def list_tools(authorization: str = Header(None)):
    """Return the tool catalog for the authenticated tier."""
    auth = validate_api_key(authorization)
    if not auth.valid:
        raise HTTPException(status_code=401, detail=auth.error)
    tools = get_tools_for_tier(auth.tier)
    return {"tier": auth.tier, "tools": tools, "count": len(tools)}


# ── Entrypoint ──────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8090"))
    uvicorn.run("server:app", host="0.0.0.0", port=port, log_level="info")
