"""Enhance prompt API endpoints."""

import logging

from fastapi import APIRouter
from pydantic import BaseModel

from ii_agent.core.config.enhance_prompt_config import EnhancePromptConfig
from ii_agent.integrations.enhance_prompt import create_enhance_prompt_client
from ii_agent.server.api.deps import CurrentUser
from ii_agent.utils.ntntn_converter import needs_clarification, ntntn_translate
from ii_agent.utils.sme_ang_generator import clarification_question_for
from ii_agent.utils.technical_terminology import (
    build_terminology_guidance,
    classify_categories,
    detect_build_intent,
    detect_scope_tier,
    extract_technical_terms,
    get_terminology_catalog,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/enhance-prompt", tags=["Enhance Prompt"])


class EnhancePromptRequest(BaseModel):
    prompt: str
    context: str | None = None
    use_terminology_engine: bool = True


class PromptCategory(BaseModel):
    key: str
    label: str
    description: str
    score: int


class TerminologyEntry(BaseModel):
    term: str
    category: str
    preferred_phrase: str
    definition: str
    aliases: list[str]
    matched_signals: list[str]


class PromptAnalysis(BaseModel):
    terminology_engine_enabled: bool = True
    build_intent_detected: bool
    scope_tier: str
    categories: list[PromptCategory]
    clarification_required: bool
    clarification_question: str | None = None


class EnhancePromptResponse(BaseModel):
    original_prompt: str
    enhanced_prompt: str
    reasoning: str | None = None
    analysis: PromptAnalysis
    terminology: list[TerminologyEntry]


class TerminologyCatalogEntry(BaseModel):
    term: str
    preferred_phrase: str
    definition: str
    aliases: list[str]


class TerminologyCatalogCategory(BaseModel):
    key: str
    label: str
    description: str
    terms: list[TerminologyCatalogEntry]


class TerminologyCatalogResponse(BaseModel):
    categories: list[TerminologyCatalogCategory]


def _build_prompt_analysis(source_text: str) -> tuple[PromptAnalysis, list[TerminologyEntry]]:
    terminology_matches = [TerminologyEntry(**match) for match in extract_technical_terms(source_text)]
    categories = [PromptCategory(**match) for match in classify_categories(source_text)]
    technical_prompt = ntntn_translate(source_text)
    clarification_required = needs_clarification(source_text, technical_prompt)
    clarification_question = (
        clarification_question_for(source_text) if clarification_required else None
    )

    analysis = PromptAnalysis(
        terminology_engine_enabled=True,
        build_intent_detected=detect_build_intent(source_text),
        scope_tier=detect_scope_tier(source_text),
        categories=categories,
        clarification_required=clarification_required,
        clarification_question=clarification_question,
    )
    return analysis, terminology_matches


def _build_bypass_analysis() -> PromptAnalysis:
    return PromptAnalysis(
        terminology_engine_enabled=False,
        build_intent_detected=False,
        scope_tier='component',
        categories=[],
        clarification_required=False,
        clarification_question=None,
    )


def _build_internal_enhanced_prompt(prompt: str, context: str | None, source_text: str) -> str:
    sections = [ntntn_translate(prompt)]
    terminology_guidance = build_terminology_guidance(source_text)
    if terminology_guidance:
        sections.append(terminology_guidance)
    if context:
        sections.append(f"Additional context:\n- {context.strip()}")
    return "\n\n".join(section for section in sections if section.strip())


@router.post("", response_model=EnhancePromptResponse)
async def enhance_prompt(request: EnhancePromptRequest, current_user: CurrentUser):
    """Enhance a prompt for better AI responses."""
    source_text = "\n".join(
        segment.strip() for segment in (request.prompt, request.context or "") if segment and segment.strip()
    )
    terminology_engine_enabled = request.use_terminology_engine
    analysis = _build_bypass_analysis()
    terminology: list[TerminologyEntry] = []
    internal_enhanced_prompt = request.prompt

    if terminology_engine_enabled:
        analysis, terminology = _build_prompt_analysis(source_text or request.prompt)
        internal_enhanced_prompt = _build_internal_enhanced_prompt(
            request.prompt,
            request.context,
            source_text or request.prompt,
        )

    enhance_prompt_config = EnhancePromptConfig()
    client = create_enhance_prompt_client(enhance_prompt_config)
    if not client:
        return EnhancePromptResponse(
            original_prompt=request.prompt,
            enhanced_prompt=internal_enhanced_prompt,
            reasoning=(
                "Enhanced with internal NtNtN terminology engine"
                if terminology_engine_enabled
                else "Terminology engine disabled; returning original prompt"
            ),
            analysis=analysis,
            terminology=terminology,
        )

    merged_context = request.context or None
    terminology_guidance = build_terminology_guidance(source_text or request.prompt)
    if terminology_engine_enabled and terminology_guidance:
        merged_context = (
            f"{merged_context}\n\n{terminology_guidance}" if merged_context else terminology_guidance
        )

    result = await client.enhance(internal_enhanced_prompt, merged_context)
    return EnhancePromptResponse(
        original_prompt=result.original_prompt,
        enhanced_prompt=result.enhanced_prompt,
        reasoning=result.reasoning,
        analysis=analysis,
        terminology=terminology,
    )


@router.get("/terminology", response_model=TerminologyCatalogResponse)
async def get_terminology(current_user: CurrentUser):
    """Return the internal technical terminology catalog."""
    return TerminologyCatalogResponse(**get_terminology_catalog())
