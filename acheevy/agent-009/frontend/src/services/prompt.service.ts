import axiosInstance from '@/lib/axios'

interface EnhancePromptPayload {
    prompt: string
    context?: string
    use_terminology_engine?: boolean
}

export interface PromptCategory {
    key: string
    label: string
    description: string
    score: number
}

export interface TerminologyEntry {
    term: string
    category: string
    preferred_phrase: string
    definition: string
    aliases: string[]
    matched_signals: string[]
}

export interface PromptAnalysis {
    terminology_engine_enabled: boolean
    build_intent_detected: boolean
    scope_tier: string
    categories: PromptCategory[]
    clarification_required: boolean
    clarification_question?: string | null
}

export interface EnhancePromptResponse {
    original_prompt: string
    enhanced_prompt: string
    reasoning?: string
    analysis: PromptAnalysis
    terminology: TerminologyEntry[]
}

class PromptService {
    async enhancePrompt(
        payload: EnhancePromptPayload
    ): Promise<EnhancePromptResponse> {
        const response = await axiosInstance.post<EnhancePromptResponse>(
            `/enhance-prompt`,
            payload
        )
        return response.data
    }
}

export const promptService = new PromptService()
