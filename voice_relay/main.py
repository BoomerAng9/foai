from auth import authenticate_ws, ALLOWED_ORIGINS
"""
Voice Relay — Gemini 3.1 Flash Live bidirectional voice with ACHEEVY.

Browser (mic + speaker) ←→ WebSocket ←→ This relay ←→ Gemini Live API

Features:
- Real-time bidirectional voice conversation
- Barge-in (user can interrupt mid-response)
- Function calling dispatches agents mid-conversation
- Audio transcriptions sent back to client
- ACHEEVY personality injected via system prompt
"""

import os
import json
import asyncio
import logging
from typing import Optional

import httpx
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice_relay")

GOOGLE_KEY = os.getenv("GOOGLE_KEY", "")
CHICKEN_HAWK_URL = os.getenv("CHICKEN_HAWK_URL", "")
MCP_GATEWAY_URL = os.getenv("MCP_GATEWAY_URL", "http://localhost:8090")

# Agent endpoints for function calling dispatch
AGENT_ENDPOINTS = {
    "scout_ang": os.getenv("SCOUT_ANG_URL", ""),
    "content_ang": os.getenv("CONTENT_ANG_URL", ""),
    "edu_ang": os.getenv("EDU_ANG_URL", ""),
    "biz_ang": os.getenv("BIZ_ANG_URL", ""),
    "ops_ang": os.getenv("OPS_ANG_URL", ""),
    "cfo_ang": os.getenv("CFO_ANG_URL", ""),
}

ACHEEVY_SYSTEM_PROMPT = """You are ACHEEVY, the Digital CEO of The Deploy Platform by ACHIEVEMOR.

You speak directly, match the user's energy, and get things done.
You are conversational, decisive, and action-oriented.
You delegate work to your team — you never do manual labor yourself.

You have access to the following Boomer_Angs via function calling:
- scout_ang_research: Research and data intelligence
- content_ang_create: Content marketing and SEO
- edu_ang_enroll: Sales and enrollment
- biz_ang_pipeline: Business development
- ops_ang_monitor: Operations and fleet health
- cfo_ang_finance: Budget tracking and financial analysis

When the user asks you to do something, determine which Boomer_Ang handles it
and call the appropriate function. Report back conversationally.

Never reveal internal agent names, model names, or infrastructure details to users.
Speak naturally. Be confident. Get results."""

AGENT_FUNCTIONS = [
    {
        "name": "scout_ang_research",
        "description": "Dispatch Scout_Ang for research, web scraping, data intelligence tasks",
        "parameters": {
            "type": "object",
            "properties": {"instruction": {"type": "string", "description": "The research task"}},
            "required": ["instruction"],
        },
    },
    {
        "name": "content_ang_create",
        "description": "Dispatch Content_Ang for content creation, SEO, blog posts, social media",
        "parameters": {
            "type": "object",
            "properties": {"instruction": {"type": "string", "description": "The content task"}},
            "required": ["instruction"],
        },
    },
    {
        "name": "edu_ang_enroll",
        "description": "Dispatch Edu_Ang for sales, enrollment, affiliate management",
        "parameters": {
            "type": "object",
            "properties": {"instruction": {"type": "string", "description": "The sales task"}},
            "required": ["instruction"],
        },
    },
    {
        "name": "biz_ang_pipeline",
        "description": "Dispatch Biz_Ang for business development, pipeline analytics, lead gen",
        "parameters": {
            "type": "object",
            "properties": {"instruction": {"type": "string", "description": "The biz dev task"}},
            "required": ["instruction"],
        },
    },
    {
        "name": "ops_ang_monitor",
        "description": "Dispatch Ops_Ang for fleet monitoring, health checks, incident detection",
        "parameters": {
            "type": "object",
            "properties": {"instruction": {"type": "string", "description": "The ops task"}},
            "required": ["instruction"],
        },
    },
    {
        "name": "cfo_ang_finance",
        "description": "Dispatch CFO_Ang for budget tracking, invoicing, financial analysis",
        "parameters": {
            "type": "object",
            "properties": {"instruction": {"type": "string", "description": "The finance task"}},
            "required": ["instruction"],
        },
    },
]

app = FastAPI(title="FOAI Voice Relay — ACHEEVY Live Voice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://foai.cloud","https://cti.foai.cloud","https://deploy.foai.cloud","http://localhost:3000","http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def dispatch_to_agent(tool_name: str, instruction: str) -> str:
    """Route function call to the actual Boomer_Ang via Cloud Run."""
    agent_map = {
        "scout_ang_research": "scout_ang",
        "content_ang_create": "content_ang",
        "edu_ang_enroll": "edu_ang",
        "biz_ang_pipeline": "biz_ang",
        "ops_ang_monitor": "ops_ang",
        "cfo_ang_finance": "cfo_ang",
    }
    agent_id = agent_map.get(tool_name)
    if not agent_id or agent_id not in AGENT_ENDPOINTS:
        return f"Agent {tool_name} is not available."

    endpoint = AGENT_ENDPOINTS[agent_id]
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{endpoint}/chat", json={"message": instruction})
            if resp.status_code == 200:
                data = resp.json()
                return data.get("response", data.get("content", str(data)))
            return f"Agent returned status {resp.status_code}"
    except Exception as e:
        return f"Agent dispatch failed: {str(e)}"


@app.get("/health")
async def health():
    return {"status": "ok", "service": "voice-relay", "google_key": bool(GOOGLE_KEY)}


@app.websocket("/voice")
async def voice_session(ws: WebSocket):
    """Bidirectional voice WebSocket — browser mic → Gemini Live → speaker."""
    await ws.accept()
    # Auth check
    if not await authenticate_ws(ws):
        await ws.send_json({"type": "error", "message": "Authentication required. Pass key= query param."})
        await ws.close(code=4001)
        return
    logger.info("Voice session started")

    if not GOOGLE_KEY:
        await ws.send_json({"type": "error", "message": "Google API key not configured"})
        await ws.close()
        return

    try:
        from google import genai

        client = genai.Client(api_key=GOOGLE_KEY)

        config = {
            "response_modalities": ["AUDIO"],
            "system_instruction": ACHEEVY_SYSTEM_PROMPT,
            "tools": [{"function_declarations": AGENT_FUNCTIONS}],
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {
                        "voice_name": "Orus"  # Deep, authoritative — fits ACHEEVY
                    }
                }
            },
        }

        async with client.aio.live.connect(
            model="gemini-2.0-flash-live-001",
            config=config,
        ) as session:

            async def receive_from_browser():
                """Forward browser mic audio to Gemini."""
                try:
                    while True:
                        data = await ws.receive()
                        if "bytes" in data:
                            await session.send({"data": data["bytes"], "mime_type": "audio/pcm"})
                        elif "text" in data:
                            msg = json.loads(data["text"])
                            if msg.get("type") == "text":
                                # Text input alongside voice
                                await session.send(msg["content"], end_of_turn=True)
                except WebSocketDisconnect:
                    logger.info("Browser disconnected")

            async def send_to_browser():
                """Forward Gemini audio responses to browser."""
                try:
                    async for response in session.receive():
                        if response.data:
                            # Audio chunk — send to browser speaker
                            await ws.send_bytes(response.data)
                        elif response.tool_call:
                            # Function call — dispatch to agent
                            logger.info(f"Function call: {response.tool_call.name}")
                            await ws.send_json({
                                "type": "agent_dispatch",
                                "agent": response.tool_call.name,
                                "instruction": response.tool_call.args.get("instruction", ""),
                            })

                            result = await dispatch_to_agent(
                                response.tool_call.name,
                                response.tool_call.args.get("instruction", ""),
                            )

                            # Inject result back into conversation
                            await session.send(
                                input={"tool_response": {
                                    "function_responses": [{
                                        "name": response.tool_call.name,
                                        "response": {"result": result},
                                    }]
                                }}
                            )

                            await ws.send_json({
                                "type": "agent_result",
                                "agent": response.tool_call.name,
                                "result": result[:500],
                            })
                        elif response.text:
                            # Text transcript
                            await ws.send_json({
                                "type": "transcript",
                                "text": response.text,
                                "speaker": "acheevy",
                            })
                except Exception as e:
                    logger.error(f"Send error: {e}")

            await asyncio.gather(receive_from_browser(), send_to_browser())

    except ImportError:
        await ws.send_json({"type": "error", "message": "google-genai not installed"})
    except Exception as e:
        logger.error(f"Voice session error: {e}")
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        try:
            await ws.close()
        except:
            pass
        logger.info("Voice session ended")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8091"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")
