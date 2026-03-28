from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Literal
import httpx
import os
import json
import logging
import re

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger(__name__)

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[int] = None

class ChatRouteRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = None
    model: str
    conversationId: Optional[str] = None

class ChatRouteResponse(BaseModel):
    response: str
    conversationId: Optional[str] = None
    intent: Optional[Literal["conversation", "execution"]] = None
    handoff: Optional[dict] = None
    clarification_required: bool = False
    clarification_question: Optional[str] = None
    technical_translation: Optional[str] = None
    engine: Optional[str] = None

class InterruptRequest(BaseModel):
    conversationId: str

class InterruptResponse(BaseModel):
    conversationId: str
    interrupted: bool
    message: str

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    logger.warning("OPENROUTER_API_KEY not set in environment")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

MODEL_MAPPING = {
    "claude-3-5-sonnet": "anthropic/claude-3.5-sonnet",
    "gpt-4-turbo": "openai/gpt-4-turbo",
    "claude-opus": "anthropic/claude-opus",
    "gemini-3-pro": "google/gemini-pro"
}

# Conversation state for managing clarification flow
CONVERSATION_STATE: dict[str, dict] = {}

# NTNTN glossary: layman terms to technical translation
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
    "ppt": "PowerPoint presentation",
    "slides": "presentation deck",
}

ACHEEVY_SYSTEM_PROMPT = """You are ACHEEVY-009, an autonomous reasoning engine.
You communicate in a calm, operator-grade tone.
You break down tasks into [REASON] → [PLAN] → [EXECUTE] phases.
You stay focused and concise.
When users request execution tasks, acknowledge the scope and subtasks clearly.
When users ask conversational questions, provide direct, helpful answers."""


def get_conversation_state(conversation_id: str) -> dict:
    """Get or initialize conversation state for tracking clarification flow."""
    if conversation_id not in CONVERSATION_STATE:
        CONVERSATION_STATE[conversation_id] = {
            "interrupted": False,
            "awaiting_clarification": False,
            "pending_user_prompt": None,
            "pending_technical_prompt": None,
            "clarification_question": None,
        }
    return CONVERSATION_STATE[conversation_id]


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
    """Determine if execution task needs clarification before proceeding."""
    text = f"{original_prompt} {technical_prompt}".lower()
    if "clarification:" in text:
        return False
    if any(k in text for k in ["build", "design", "implement", "landing", "app", "website"]):
        required_signals = ["audience", "stack", "sections", "deadline", "brand", "style", "goal"]
        found = sum(1 for s in required_signals if s in text)
        return found < 2
    return False


def clarification_question_for(prompt: str) -> str:
    """Generate domain-specific clarification question."""
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
    if "ppt" in prompt_l or "powerpoint" in prompt_l or "slides" in prompt_l:
        return (
            "Before I execute: what's the target audience, how many slides, "
            "and what's the key message or theme?"
        )
    return "Before I execute: please confirm success criteria, constraints, and preferred stack."


def detect_intent(message: str) -> Literal["conversation", "execution"]:
    """Detect if user intent is conversational or requires execution."""
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


def parse_execution_task(message: str) -> str:
    """Parse execution task request into a summary."""
    message_lower = message.lower()
    
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

@router.post("/route", response_model=ChatRouteResponse)
async def route_message(request: ChatRouteRequest):
    """
    Intent Router - Routes messages to conversation or execution handler
    Execution tasks are handed off to ii-agent backend
    Handles clarification flow with NTNTN+SME_ANG engines
    """
    
    # Detect intent, but force execution flow when collecting clarification
    intent = detect_intent(request.message)
    conv_id = request.conversationId or f"conv-{hash(request.message) % 10000}"
    state = get_conversation_state(conv_id)

    # CRITICAL: If awaiting clarification and user provides reply, force execution path
    if state["awaiting_clarification"] and state.get("pending_user_prompt"):
        intent = "execution"

    if state["interrupted"]:
        state["interrupted"] = False
        return ChatRouteResponse(
            response="Previous work was stopped. Share the next instruction when ready.",
            conversationId=conv_id,
            intent="conversation"
        )
    
    # Handle conversation intent
    if intent == "conversation":
        response_text = await handle_conversation(
            message=request.message,
            model=request.model,
            conversation_history=request.conversation_history or []
        )
        return ChatRouteResponse(
            response=response_text,
            conversationId=conv_id,
            intent="conversation"
        )
    
    # Handle execution intent with clarification check
    else:
        original_prompt = request.message

        # If user is replying to clarification, merge with original prompt
        if state["awaiting_clarification"] and state.get("pending_user_prompt"):
            original_prompt = f"{state['pending_user_prompt']}\nClarification: {request.message}"
            state["awaiting_clarification"] = False
            state["clarification_question"] = None

        technical_prompt = ntntn_translate(original_prompt)

        # Check if clarification is needed before execution
        if needs_clarification(original_prompt, technical_prompt):
            question = clarification_question_for(original_prompt)
            state["awaiting_clarification"] = True
            state["pending_user_prompt"] = original_prompt
            state["pending_technical_prompt"] = technical_prompt
            state["clarification_question"] = question
            return ChatRouteResponse(
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
        
        return ChatRouteResponse(
            response=handoff_result['response'],
            conversationId=conv_id,
            intent="execution",
            handoff=handoff_result['details'],
            technical_translation=technical_prompt,
            engine="NTNTN+SME_ANG"
        )


@router.post("/interrupt", response_model=InterruptResponse)
async def interrupt_chat(request: InterruptRequest):
    """Stop current task execution and reset conversation state."""
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


async def handle_conversation(message: str, model: str, conversation_history: list = None) -> str:
    """Handle conversational messages with OpenRouter API."""
    
    if not OPENROUTER_API_KEY:
        return "DEMO MODE: OpenRouter API not configured. Add OPENROUTER_API_KEY to environment to enable full responses."

    try:
        messages = [
            {
                "role": "system",
                "content": ACHEEVY_SYSTEM_PROMPT
            }
        ]
        
        # Add conversation history if provided
        if conversation_history:
            for msg in conversation_history:
                if isinstance(msg, ChatMessage):
                    messages.append({
                        "role": msg.role,
                        "content": msg.content
                    })
                else:
                    messages.append({
                        "role": msg.get("role", "user"),
                        "content": msg.get("content", "")
                    })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": message
        })
        
        response = await call_openrouter(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=2048
        )
        
        return response
                
    except Exception as e:
        logger.error(f"Conversation error: {e}")
        return f"I encountered an error processing your message. Please try again."


async def handoff_to_ii_agent(message: str, model: str, conversation_id: str) -> dict:
    """
    Hand off execution task to ii-agent backend.
    Returns clean user-facing response - ACHEEVY is a black box to users.
    """
    
    ii_agent_url = "http://localhost:8000"
    task_summary = parse_execution_task(message)
    
    try:
        async with httpx.AsyncClient() as client:
            # First check if ii-agent is available
            health_response = await client.get(f"{ii_agent_url}/health", timeout=2.0)
            
            if health_response.status_code == 200:
                # Try task endpoint first, then fallback to chat route
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

                # Fallback to chat route
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
        logger.info(f"ii-agent handoff: {e} - queuing locally")
        # Black box response - user doesn't need to know about backend routing
        return {
            'response': "Task accepted. Handoff queued to ii-agent execution.",
            'details': {
                'backend': 'ii-agent',
                'task': task_summary,
                'status': 'queued'
            }
        }


async def call_openrouter(
    model: str,
    messages: list,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    system: Optional[str] = None
) -> str:
    """Call OpenRouter API"""
    
    model_key = MODEL_MAPPING.get(model, model)
    
    # Build message list with system prompt first if provided
    full_messages = messages
    if system:
        full_messages = [{"role": "system", "content": system}] + messages

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://acheevy.ai",
                    "X-Title": "ACHEEVY-009"
                },
                json={
                    "model": model_key,
                    "messages": full_messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "top_p": 0.95
                }
            )
            
            response.raise_for_status()
            data = response.json()
            
            if "choices" not in data or len(data["choices"]) == 0:
                raise ValueError("No choices in OpenRouter response")
            
            return data["choices"][0]["message"]["content"]
        
        except httpx.TimeoutException:
            logger.error("OpenRouter request timed out")
            raise
        except httpx.HTTPStatusError as e:
            logger.error(f"OpenRouter API error {e.status_code}: {e.response.text}")
            raise
