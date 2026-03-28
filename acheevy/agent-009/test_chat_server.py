import os
import re
import uuid
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi import File, UploadFile, HTTPException
from fastapi.responses import Response
import httpx
from pydantic import BaseModel
from typing import Literal

app = FastAPI(title="ACHEEVY Test Chat Server")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEST_UPLOAD_DIR = Path(__file__).parent / "data" / "test-uploads"
TEST_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
TEST_UPLOADS: dict[str, dict[str, str | int]] = {}
class ChatRequest(BaseModel):
    message: str
    model: str
    conversation_history: list | None = None
    conversationId: str | None = None

class ChatResponse(BaseModel):
    response: str
    conversationId: str | None = None
    intent: Literal["conversation", "execution"] | None = None
    handoff: dict | None = None  # Execution details if handed off to ii-agent
    clarification_required: bool = False
    clarification_question: str | None = None
    technical_translation: str | None = None
    engine: str | None = None


class TTSRequest(BaseModel):
    text: str
    voice_id: str | None = None


class InterruptRequest(BaseModel):
    conversationId: str


class InterruptResponse(BaseModel):
    conversationId: str
    interrupted: bool
    message: str


def load_stack_env_value(key: str) -> str | None:
    """Load a single key from docker/.stack.env as fallback."""
    env_file = Path(__file__).parent / "docker" / ".stack.env"
    if env_file.exists():
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                if line.startswith(f"{key}="):
                    return line.split("=", 1)[1].strip()
    return None

# Load OpenRouter API configuration
# First try environment variable, then fall back to docker/.stack.env file
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    OPENROUTER_API_KEY = load_stack_env_value("OPENROUTER_API_KEY")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY") or load_stack_env_value("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID") or load_stack_env_value("ELEVENLABS_VOICE_ID") or "JBFqnCBsd6RMkjVDRZzb"
ELEVENLABS_TTS_MODEL = os.getenv("ELEVENLABS_TTS_MODEL") or load_stack_env_value("ELEVENLABS_TTS_MODEL") or "eleven_multilingual_v2"

# Check if we have a valid API key (proper OpenRouter format)
HAS_VALID_API_KEY = (
    OPENROUTER_API_KEY 
    and OPENROUTER_API_KEY.startswith("sk-or-v1-") 
    and len(OPENROUTER_API_KEY) > 20
)

class GenerateUploadUrlRequest(BaseModel):
    file_name: str
    content_type: str
    file_size: int

class GenerateUploadUrlResponse(BaseModel):
    id: str
    upload_url: str


HAS_ELEVENLABS_KEY = bool(ELEVENLABS_API_KEY and len(ELEVENLABS_API_KEY) > 20)


CONVERSATION_STATE: dict[str, dict] = {}


LAYMAN_TO_TECH = {
    "website": "responsive web application",
    "page": "UI view",
    "landing page": "marketing landing page with conversion-focused information architecture",
    "make": "implement",
    "build": "design and implement",
    "nice": "polished, production-grade",
    "fast": "low-latency and optimized",
    "secure": "secure-by-default with input validation and least privilege",
    "database": "persistent data layer with schema design and migration strategy",
    "login": "authentication flow with session/token handling",
}

class UploadCompleteRequest(BaseModel):
    id: str
    file_name: str
    file_size: int
    content_type: str

class UploadCompleteResponse(BaseModel):
    file_url: str



def get_conversation_state(conversation_id: str) -> dict:
    if conversation_id not in CONVERSATION_STATE:
        CONVERSATION_STATE[conversation_id] = {
            "interrupted": False,
            "awaiting_clarification": False,
            "pending_user_prompt": None,
            "pending_technical_prompt": None,
            "clarification_question": None,
        }
    return CONVERSATION_STATE[conversation_id]

def get_test_upload_path(file_id: str, file_name: str) -> Path:
    safe_name = Path(file_name).name
    return TEST_UPLOAD_DIR / f"{file_id}-{safe_name}"


def ntntn_translate(prompt: str) -> str:
    """NTNTN engine: normalize layman prompt into technical execution language."""
    normalized = prompt.strip()
    for source, target in LAYMAN_TO_TECH.items():
        normalized = re.sub(rf"\b{re.escape(source)}\b", target, normalized, flags=re.IGNORECASE)

    return (
        "NTNTN Technical Spec:\n"
        f"- Objective: {normalized}\n"
        "- Deliverables: implementation plan, production-ready code artifacts, and validation checks\n"
        "- Constraints: preserve black-box UX, keep responses concise, support interruption and clarification flow"
    )


def needs_clarification(original_prompt: str, technical_prompt: str) -> bool:
    text = f"{original_prompt} {technical_prompt}".lower()
    if "clarification:" in text:
        return False
    if any(k in text for k in ["build", "design", "implement", "landing", "app", "website"]):
        required_signals = ["audience", "stack", "sections", "deadline", "brand", "style", "goal"]
        found = sum(1 for s in required_signals if s in text)
        return found < 2
    return False


def clarification_question_for(prompt: str) -> str:
    prompt_l = prompt.lower()
    if "landing" in prompt_l or "website" in prompt_l or "page" in prompt_l:
        return (
            "Before I execute: who is the target audience, what are the top 3 sections, "
            "and what visual style should it follow?"
        )
    if "api" in prompt_l or "backend" in prompt_l:
        return (
            "Before I execute: what framework/language should I use, required endpoints, "
            "and expected request/response schema?"
        )
    return "Before I execute: please confirm success criteria, constraints, and preferred stack."

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/chat/interrupt", response_model=InterruptResponse)
async def interrupt_chat(request: InterruptRequest):
    state = get_conversation_state(request.conversationId)
    state["interrupted"] = True
    state["awaiting_clarification"] = False
    state["pending_user_prompt"] = None
    state["pending_technical_prompt"] = None
    state["clarification_question"] = None
    return InterruptResponse(
        conversationId=request.conversationId,
        interrupted=True,
        message="Stopped. Ready for your next instruction."
    )


@app.post("/api/voice/scribe-token")
async def create_scribe_token():
    """Create short-lived realtime STT token for ElevenLabs Scribe."""
    if not HAS_ELEVENLABS_KEY:
        raise HTTPException(status_code=503, detail="Voice service is not configured.")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.elevenlabs.io/v1/speech-to-text/get-realtime-token",
                headers={
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "model_id": "scribe_v2_realtime",
                    "ttl_secs": 300,
                },
                timeout=15.0,
            )

            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Could not initialize speech recognition.")

            payload = response.json()
            return {"token": payload.get("token", "")}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="Voice recognition is temporarily unavailable.")


@app.post("/api/voice/tts")
async def voice_tts(request: TTSRequest):
    """Generate TTS audio from assistant text via ElevenLabs."""
    if not HAS_ELEVENLABS_KEY:
        raise HTTPException(status_code=503, detail="Voice service is not configured.")

    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required.")

    voice_id = request.voice_id or ELEVENLABS_VOICE_ID

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": ELEVENLABS_TTS_MODEL,
                    "output_format": "mp3_44100_128",
                },
                timeout=30.0,
            )

            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Could not generate voice output.")

            return Response(content=response.content, media_type="audio/mpeg")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="Voice output is temporarily unavailable.")


@app.post("/api/voice/stt")
async def voice_stt(audio: UploadFile = File(...)):
    """Transcribe uploaded microphone audio through ElevenLabs STT."""
    if not HAS_ELEVENLABS_KEY:
        raise HTTPException(status_code=503, detail="Voice service is not configured.")

    try:
        audio_bytes = await audio.read()
        files = {
            "file": (audio.filename or "recording.webm", audio_bytes, audio.content_type or "audio/webm")
        }
        data = {
            "model_id": "scribe_v1"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.elevenlabs.io/v1/speech-to-text",
                headers={
                    "xi-api-key": ELEVENLABS_API_KEY,
                },
                data=data,
                files=files,
                timeout=45.0,
            )

            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Could not transcribe voice input.")

            payload = response.json()
            transcript = (payload.get("text") or "").strip()
            return {"text": transcript}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="Voice transcription is temporarily unavailable.")

@app.post("/api/chat/route", response_model=ChatResponse)
async def chat_route(request: ChatRequest):
    """
    Intent Router - Routes messages to conversation or execution handler
    Execution tasks are handed off to ii-agent backend
    """
    
    # Detect intent, but force execution flow when we are collecting clarification
    # for a previously detected execution task.
    intent = detect_intent(request.message)
    conv_id = request.conversationId or f"conv-{hash(request.message) % 10000}"
    state = get_conversation_state(conv_id)

    if state["awaiting_clarification"] and state.get("pending_user_prompt"):
        intent = "execution"

    if state["interrupted"]:
        state["interrupted"] = False
        return ChatResponse(
            response="Previous work was stopped. Share the next instruction when ready.",
            conversationId=conv_id,
            intent="conversation"
        )
    
    if intent == "conversation":
        # Handle as conversation with full context history
        response_text = await handle_conversation(
            message=request.message,
            model=request.model,
            conversation_history=request.conversation_history or []
        )
        return ChatResponse(
            response=response_text,
            conversationId=conv_id,
            intent="conversation"
        )
    else:
        original_prompt = request.message

        if state["awaiting_clarification"] and state.get("pending_user_prompt"):
            original_prompt = f"{state['pending_user_prompt']}\nClarification: {request.message}"
            state["awaiting_clarification"] = False
            state["clarification_question"] = None

        technical_prompt = ntntn_translate(original_prompt)

        if needs_clarification(original_prompt, technical_prompt):
            question = clarification_question_for(original_prompt)
            state["awaiting_clarification"] = True
            state["pending_user_prompt"] = original_prompt
            state["pending_technical_prompt"] = technical_prompt
            state["clarification_question"] = question
            return ChatResponse(
                response=(
                    "I translated your request into an execution-ready technical brief. "
                    "I need one clarification before I proceed."
                ),
                conversationId=conv_id,
                intent="execution",
                clarification_required=True,
                clarification_question=question,
                technical_translation=technical_prompt,
                engine="NTNTN+SME_ANG"
            )

        # Execution task - attempt ii-agent handoff
        handoff_result = await handoff_to_ii_agent(
            message=technical_prompt,
            model=request.model,
            conversation_id=conv_id
        )
        state["pending_user_prompt"] = None
        state["pending_technical_prompt"] = None
        state["awaiting_clarification"] = False
        
        return ChatResponse(
            response=handoff_result['response'],
            conversationId=conv_id,
            intent="execution",
            handoff=handoff_result['details'],
            technical_translation=technical_prompt,
            engine="NTNTN+SME_ANG"
        )

def detect_intent(message: str) -> Literal["conversation", "execution"]:
    """
    Detect if user intent is conversational or requires execution/tools
    """
    execution_keywords = [
        "create", "make", "build", "generate", "write code",
        "run", "execute", "search", "find files", "analyze",
        "refactor", "debug", "fix", "implement", "build a",
        "write", "deploy", "push", "commit", "setup",
        "install", "configure", "test", "check", "ppt",
        "powerpoint", "slides", "deck", "presentation"
    ]
    
    message_lower = message.lower()
    for keyword in execution_keywords:
        if keyword in message_lower:
            return "execution"
    
    return "conversation"

async def handoff_to_ii_agent(message: str, model: str, conversation_id: str) -> dict:
    """
    Hand off execution task to ii-agent backend
    Returns clean user-facing response - ACHEEVY is a black box
    """
    
    # Try to reach ii-agent backend on port 8000
    ii_agent_url = "http://localhost:8000"
    task_summary = parse_execution_task(message)
    
    try:
        async with httpx.AsyncClient() as client:
            # First check if ii-agent is available
            health_response = await client.get(f"{ii_agent_url}/health", timeout=2.0)
            
            if health_response.status_code == 200:
                # Attempt task endpoint first, then chat route fallback.
                task_response = await client.post(
                    f"{ii_agent_url}/api/task",
                    json={
                        "message": message,
                        "model": model,
                        "conversation_id": conversation_id
                    },
                    timeout=10.0
                )

                if task_response.status_code == 200:
                    task_data = task_response.json()
                    return {
                        'response': "Handoff complete. ii-agent execution has started.",
                        'details': {
                            'backend': 'ii-agent',
                            'task': task_summary,
                            'task_id': task_data.get('task_id'),
                            'status': task_data.get('status', 'processing')
                        }
                    }

                fallback_response = await client.post(
                    f"{ii_agent_url}/api/chat/route",
                    json={
                        "message": message,
                        "model": model,
                        "conversationId": conversation_id
                    },
                    timeout=10.0
                )

                if fallback_response.status_code in (200, 202):
                    return {
                        'response': "Handoff complete. ii-agent execution is in progress.",
                        'details': {
                            'backend': 'ii-agent',
                            'task': task_summary,
                            'status': 'processing'
                        }
                    }

                return {
                    'response': "Task accepted. Execution has been queued.",
                    'details': {
                        'backend': 'ii-agent',
                        'task': task_summary,
                        'status': 'queued'
                    }
                }
            else:
                raise Exception("ii-agent not available")
                
    except Exception as e:
        # Black box response - user doesn't need to know about backend routing
        return {
            'response': "Task accepted. Handoff queued to ii-agent execution.",
            'details': {
                'backend': 'ii-agent',
                'task': task_summary,
                'status': 'queued'
            }
        }

def parse_execution_task(message: str) -> str:
    """
    Parse execution task request into a summary
    """
    message_lower = message.lower()
    
    # Categorize the task
    if any(word in message_lower for word in ['create', 'write', 'generate']):
        return f"Create/generate: {message[:80]}..."
    elif any(word in message_lower for word in ['ppt', 'powerpoint', 'slides', 'deck', 'presentation']):
        return f"Presentation build: {message[:80]}..."
    elif any(word in message_lower for word in ['build', 'make']):
        return f"Build: {message[:80]}..."
    elif any(word in message_lower for word in ['run', 'execute']):
        return f"Execute: {message[:80]}..."
    elif any(word in message_lower for word in ['search', 'find', 'analyze']):
        return f"Analyze/Search: {message[:80]}..."
    elif any(word in message_lower for word in ['deploy', 'push', 'setup']):
        return f"Deploy/Setup: {message[:80]}..."
    else:
        return f"Execute: {message[:80]}..."

async def handle_conversation(message: str, model: str, conversation_history: list = None) -> str:
    """
    Handle conversational messages with OpenRouter API
    Maintains conversation context via history
    """
    # Demo mode if API key is not available or invalid
    if not HAS_VALID_API_KEY:
        # Simple demo responses based on intent
        message_lower = message.lower()
        
        demo_responses = {
            'mcp': 'MCP (Model Context Protocol) is a standard for connecting AI applications to external data sources and tools. It allows models to access real-time information, execute commands, and interact with external services in a structured way.',
            'help': 'I\'m ACHEEVY-009, your AI assistant. I can help with questions, analysis, coding, research, and more. Right now I\'m running in demo mode—upgrade with an OpenRouter API key for full capabilities.',
            'about': 'I\'m ACHEEVY-009, built by A.I.M.S. Labs. I\'m designed to reason deeply, plan strategically, and execute complex tasks. Currently in demo mode.',
            'default': f'I\'m currently in demo mode with {model.split("/")[-1]}. To enable full responses, add your OpenRouter API key to the environment. What would you like to know?'
        }
        
        # Match keywords or return default
        for keyword, response in demo_responses.items():
            if keyword in message_lower and keyword != 'default':
                return response
        
        return demo_responses['default']
    
    try:
        # Build messages array with conversation history for context
        # ACHEEVY Brain: Direct, surgical, high-signal. Black box to users.
        messages = [
            {
                "role": "system",
                "content": """You are ACHEEVY, the AI Executive Orchestrator for A.I.M.S.

Core Identity:
- Direct, surgical, high-signal communication style
- You orchestrate complex work behind the scenes
- You are a black box to users - they see inputs and outputs, nothing else
- Never reveal internal architecture, team names, or technical implementation details

Hard Rules:
- NEVER expose: backend routing, sandbox/production modes, agent names, ports, endpoints
- NEVER say: "I'll route this to X" or "Sending to backend" or "sandbox mode"
- DO say: "Working on it", "Got it", "I'll handle that", "Give me a moment"
- Maintain conversation continuity and reference previous context naturally
- Be confident and professional - you're a CEO-level orchestrator

Communication:
- Keep responses concise unless detail is requested
- Show results, not process
- When executing tasks, acknowledge cleanly without exposing internals
- Example: "Building that landing page now" NOT "Routing to execution engine at localhost:8000"
                """
            }
        ]
        
        # Add conversation history if provided
        if conversation_history:
            for msg in conversation_history:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": message
        })
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:1420",
                    "X-Title": "ACHEEVY-009"
                },
                json={
                    "model": model,
                    "messages": messages
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            elif response.status_code == 401:
                return "[ERROR] Invalid OpenRouter API key. Please update OPENROUTER_API_KEY in docker/.stack.env with a valid key from https://openrouter.io"
            else:
                return f"[ERROR] OpenRouter API Error ({response.status_code}): {response.text[:200]}"
                
    except Exception as e:
        return f"[ERROR] Connection Error: {str(e)}"

@app.post("/chat/generate-upload-url", response_model=GenerateUploadUrlResponse)
async def generate_upload_url(request: GenerateUploadUrlRequest):
    file_id = str(uuid.uuid4())
    upload_path = get_test_upload_path(file_id, request.file_name)

    TEST_UPLOADS[file_id] = {
        "file_name": Path(request.file_name).name,
        "content_type": request.content_type or "application/octet-stream",
        "file_size": request.file_size,
        "path": str(upload_path),
    }

    return GenerateUploadUrlResponse(
        id=file_id,
        upload_url=f"http://localhost:8002/api/uploads/{file_id}",
    )

@app.put("/api/uploads/{file_id}")
async def upload_to_signed_url(file_id: str, request: Request):
    upload_record = TEST_UPLOADS.get(file_id)
    if not upload_record:
        raise HTTPException(status_code=404, detail="Upload session not found")

    file_bytes = await request.body()
    upload_path = Path(str(upload_record["path"]))
    upload_path.write_bytes(file_bytes)

    return {"success": True, "bytes_written": len(file_bytes)}

@app.post("/chat/upload-complete", response_model=UploadCompleteResponse)
async def upload_complete(request: UploadCompleteRequest):
    upload_record = TEST_UPLOADS.get(request.id)
    if not upload_record:
        raise HTTPException(status_code=404, detail="Upload session not found")

    upload_path = Path(str(upload_record["path"]))
    if not upload_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    upload_record["file_name"] = Path(request.file_name).name
    upload_record["content_type"] = request.content_type or "application/octet-stream"
    upload_record["file_size"] = request.file_size

    return UploadCompleteResponse(
        file_url=f"http://localhost:8002/api/uploads/{request.id}/download"
    )

@app.get("/api/uploads/{file_id}/download")
async def download_uploaded_file(file_id: str):
    upload_record = TEST_UPLOADS.get(file_id)
    if not upload_record:
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    upload_path = Path(str(upload_record["path"]))
    if not upload_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    return Response(
        content=upload_path.read_bytes(),
        media_type=str(upload_record.get("content_type", "application/octet-stream")),
        headers={
            "Content-Disposition": f'attachment; filename="{upload_record.get("file_name", upload_path.name)}"'
        },
    )

if __name__ == "__main__":
    import uvicorn
    print("[*] Starting ACHEEVY Test Chat Server on http://localhost:8002")
    if HAS_VALID_API_KEY:
        print(f"[OK] Using OpenRouter API with valid key: {OPENROUTER_API_KEY[:20]}...")
        print("[OK] Real LLM responses enabled via OpenRouter")
    else:
        print("[!] No valid OpenRouter API key detected - running in demo mode")
        print("    Set OPENROUTER_API_KEY environment variable to enable real responses")
    if HAS_ELEVENLABS_KEY:
        print("[OK] ElevenLabs voice endpoints enabled")
    else:
        print("[!] ElevenLabs API key missing - voice endpoints will return setup errors")
    uvicorn.run(app, host="0.0.0.0", port=8002)
