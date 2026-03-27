"""Content_Ang — foai.cloud SEO content generation Boomer_Ang.

Generates SEO content via OpenRouter minimax/minimax-m2.7.
Reports heartbeat via /agent/status on Money Engine.
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, Query
from google.cloud import firestore
from openai import OpenAI
from pydantic import BaseModel

MONEY_ENGINE_URL = os.getenv(
    "MONEY_ENGINE_URL",
    "https://money-engine-api-939270059361.us-central1.run.app",
)
DEFAULT_TENANT = os.getenv("DEFAULT_TENANT", "cti")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "minimax/minimax-m2.7")
PORT = int(os.getenv("PORT", "8080"))


def _get_llm() -> OpenAI:
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ["OPENROUTER_API_KEY"],
    )


async def _heartbeat(status: str = "online", task: str = "idle"):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{MONEY_ENGINE_URL}/agent/status",
                json={
                    "name": "Content_Ang",
                    "status": status,
                    "current_task": task,
                    "tenant_id": DEFAULT_TENANT,
                },
            )
    except httpx.HTTPError:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _heartbeat("online", "startup_complete")
    yield
    await _heartbeat("offline", "shutting_down")


app = FastAPI(
    title="Content_Ang",
    description="foai.cloud SEO content generation — Boomer_Ang deployed by ACHEEVY.",
    version="0.1.0",
    lifespan=lifespan,
)


class ContentRequest(BaseModel):
    topic: str
    keywords: list[str]
    content_type: str = "blog_post"
    tenant_id: str = DEFAULT_TENANT


class ContentResponse(BaseModel):
    id: str
    topic: str
    content_type: str
    content: str
    model: str
    created_at: str


@app.get("/health")
async def health():
    return {"status": "ok", "service": "content-ang", "agent": "Content_Ang", "version": "0.1.0"}


@app.post("/generate", response_model=ContentResponse, status_code=201)
async def generate_content(req: ContentRequest):
    """Generate SEO content via OpenRouter."""
    await _heartbeat("active", f"generating:{req.content_type}:{req.topic}")

    prompt = (
        f"Write a high-quality SEO {req.content_type} for foai.cloud about: {req.topic}\n"
        f"Target keywords: {', '.join(req.keywords)}\n"
        "Requirements:\n"
        "- Engaging, authoritative tone\n"
        "- Natural keyword integration\n"
        "- Clear headings and structure\n"
        "- Call to action referencing ai-managed-solutions.cloud\n"
    )

    llm = _get_llm()
    completion = llm.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    content = completion.choices[0].message.content

    db = firestore.Client(project="foai-aims")
    now = datetime.now(timezone.utc).isoformat()
    doc_ref = (
        db.collection("content")
        .document(req.tenant_id)
        .collection("items")
        .document()
    )
    doc_ref.set({
        "topic": req.topic,
        "keywords": req.keywords,
        "content_type": req.content_type,
        "content": content,
        "model": OPENROUTER_MODEL,
        "created_at": now,
    })

    await _heartbeat("active", "content_generated")
    return ContentResponse(
        id=doc_ref.id,
        topic=req.topic,
        content_type=req.content_type,
        content=content,
        model=OPENROUTER_MODEL,
        created_at=now,
    )


@app.get("/content")
async def list_content(
    tenant_id: str = Query(default=DEFAULT_TENANT),
    limit: int = Query(default=20, le=100),
):
    """List generated content from Firestore."""
    db = firestore.Client(project="foai-aims")
    docs = (
        db.collection("content")
        .document(tenant_id)
        .collection("items")
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )
    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        results.append(data)
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
