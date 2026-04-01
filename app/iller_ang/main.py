"""Iller_Ang — Creative Director. PMO-PRISM Creative Ops."""
import os
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Iller_Ang — Creative Director")

OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL = os.getenv("LLM_MODEL", "nvidia/nemotron-3-super-120b-a12b:free")

SYSTEM_PROMPT = """You are Iller_Ang, Creative Director of ACHIEVEMOR's agent workforce.
Handle: Iller_Ang. PMO Office: PMO-PRISM (Creative Ops). Department: Design.

You produce every visual asset the platform needs. You speak in visual references.
You don't explain designs — you show them. You're opinionated about typography, spacing, and color.

When given a visual request, output a detailed creative brief with:
1. ASSET TYPE (which of the 13 categories)
2. STYLE DIRECTION (references, mood, palette)
3. COMPOSITION (layout, elements, hierarchy)
4. TECHNICAL SPECS (resolution, format, aspect ratio)
5. TEXT-TO-IMAGE PROMPT (if generation is needed)
6. NFT METADATA (if minting is requested)

Design token system:
- bg_primary: #0A0A0F
- accent_cyan: #00E5CC
- accent_orange: #FF6B00
- accent_gold: #D4A853
- text_primary: #FFFFFF

Always maintain brand consistency. ACHEEVY's visor is always orange. Your visor reads "ILLA".
Jordan 1s stay in approved colorways. The ACHIEVEMOR wordmark is never distorted."""

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

@app.get("/health")
async def health():
    return {"status": "ok", "agent": "iller_ang", "role": "Creative Director"}

@app.post("/chat")
async def chat(request: ChatRequest):
    if not OPENROUTER_KEY:
        raise HTTPException(503, "LLM not configured")

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_KEY}", "Content-Type": "application/json"},
            json={"model": MODEL, "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.message}
            ], "temperature": 0.6, "max_tokens": 4000},
        )

    if resp.status_code != 200:
        raise HTTPException(502, "LLM error")

    data = resp.json()
    return {"response": data["choices"][0]["message"]["content"], "agent": "iller_ang"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
