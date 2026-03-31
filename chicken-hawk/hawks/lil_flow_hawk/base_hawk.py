"""
Base Lil_Hawk — shared framework for all Lil_Hawk microservices.

Each Lil_Hawk extends this with their specific system prompt and capabilities.
The base provides: health check, /run endpoint, structured response, error handling.
"""

import os
import time
import uuid
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")
DEFAULT_MODEL = os.getenv("LLM_MODEL", "nvidia/nemotron-3-super-120b-a12b:free")


class RunRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=32768)
    session_id: Optional[str] = None
    context: Optional[str] = None


class RunResponse(BaseModel):
    hawk: str
    content: str
    trace_id: str
    elapsed_ms: float
    model: str
    metadata: dict = {}


def create_hawk_app(
    hawk_name: str,
    system_prompt: str,
    description: str = "",
    model: str = DEFAULT_MODEL,
) -> FastAPI:
    """Create a Lil_Hawk FastAPI app with standard endpoints."""

    app = FastAPI(title=hawk_name, description=description)

    @app.get("/health")
    async def health():
        return {"status": "ok", "hawk": hawk_name}

    @app.post("/run", response_model=RunResponse)
    async def run(request: RunRequest):
        start = time.time()
        trace_id = str(uuid.uuid4())[:8]

        messages = [
            {"role": "system", "content": system_prompt},
        ]
        if request.context:
            messages.append({"role": "system", "content": f"Context: {request.context}"})
        messages.append({"role": "user", "content": request.message})

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_KEY}",
                        "Content-Type": "application/json",
                        "X-OpenRouter-Title": f"FOAI {hawk_name}",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.3,
                        "max_tokens": 4000,
                    },
                )

            if resp.status_code != 200:
                raise HTTPException(502, f"LLM returned {resp.status_code}")

            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            elapsed = (time.time() - start) * 1000

            return RunResponse(
                hawk=hawk_name,
                content=content,
                trace_id=trace_id,
                elapsed_ms=round(elapsed, 1),
                model=data.get("model", model),
            )

        except httpx.TimeoutException:
            raise HTTPException(504, "LLM request timed out")
        except Exception as e:
            raise HTTPException(500, str(e))

    # Also accept /chat for compatibility with dispatch
    @app.post("/chat")
    async def chat(request: RunRequest):
        result = await run(request)
        return {"response": result.content, "hawk": result.hawk, "trace_id": result.trace_id}

    return app
