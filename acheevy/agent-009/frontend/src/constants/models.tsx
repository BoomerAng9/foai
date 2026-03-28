import { IModel } from '@/typings/settings'

// Define available models for each provider
export const PROVIDER_MODELS: { [key: string]: IModel[] } = {
    anthropic: [
        {
            id: 'claude-sonnet-4-5-20250929',
            model: 'claude-sonnet-4-5-20250929',
            api_type: 'anthropic'
        },
        {
            id: 'claude-sonnet-4-20250514',
            model: 'claude-sonnet-4-20250514',
            api_type: 'anthropic'
        },
        {
            id: 'claude-opus-4-20250514',
            model: 'claude-opus-4-20250514',
            api_type: 'anthropic'
        },
        {
            id: 'claude-3-7-sonnet-20250219',
            model: 'claude-3-7-sonnet-20250219',
            api_type: 'anthropic'
        }
    ],
    openai: [
        {
            id: 'gpt-5',
            model: 'gpt-5',
            api_type: 'openai'
        },
        {
            id: 'gpt-5-codex',
            model: 'gpt-5-codex',
            api_type: 'openai'
        },
        {
            id: 'gpt-4.1',
            model: 'gpt-4.1',
            api_type: 'openai'
        },
        {
            id: 'gpt-4.5',
            model: 'gpt-4.5',
            api_type: 'openai'
        },
        {
            id: 'o3',
            model: 'o3',
            api_type: 'openai'
        },
        {
            id: 'o3-mini',
            model: 'o3-mini',
            api_type: 'openai'
        },
        {
            id: 'o4-mini',
            model: 'o4-mini',
            api_type: 'openai'
        },
        {
            id: 'custom',
            model: 'custom',
            api_type: 'openai'
        }
    ],
    gemini: [
        {
            id: 'gemini-2.5-flash',
            model: 'gemini-2.5-flash',
            api_type: 'gemini'
        },
        {
            id: 'gemini-2.5-pro',
            model: 'gemini-2.5-pro',
            api_type: 'gemini'
        }
    ],
    openrouter: [
        {
            id: 'anthropic/claude-sonnet-4-20250514',
            model: 'anthropic/claude-sonnet-4-20250514',
            api_type: 'custom',
            base_url: 'https://openrouter.ai/api/v1',
            description: 'Claude Sonnet 4 via OpenRouter'
        },
        {
            id: 'anthropic/claude-opus-4-20250514',
            model: 'anthropic/claude-opus-4-20250514',
            api_type: 'custom',
            base_url: 'https://openrouter.ai/api/v1',
            description: 'Claude Opus 4 via OpenRouter'
        },
        {
            id: 'openai/gpt-5',
            model: 'openai/gpt-5',
            api_type: 'custom',
            base_url: 'https://openrouter.ai/api/v1',
            description: 'GPT-5 via OpenRouter'
        },
        {
            id: 'openai/o3',
            model: 'openai/o3',
            api_type: 'custom',
            base_url: 'https://openrouter.ai/api/v1',
            description: 'o3 reasoning model via OpenRouter'
        },
        {
            id: 'google/gemini-2.5-pro',
            model: 'google/gemini-2.5-pro',
            api_type: 'custom',
            base_url: 'https://openrouter.ai/api/v1',
            description: 'Gemini 2.5 Pro via OpenRouter'
        },
        {
            id: 'google/gemini-2.5-flash',
            model: 'google/gemini-2.5-flash',
            api_type: 'custom',
            base_url: 'https://openrouter.ai/api/v1',
            description: 'Gemini 2.5 Flash via OpenRouter'
        },
        {
            id: 'deepseek/deepseek-r1',
            model: 'deepseek/deepseek-r1',
            api_type: 'custom',
            base_url: 'https://openrouter.ai/api/v1',
            description: 'DeepSeek R1 reasoning model via OpenRouter'
        },
        {
            id: 'meta-llama/llama-4-maverick',
            model: 'meta-llama/llama-4-maverick',
            api_type: 'custom',
            base_url: 'https://openrouter.ai/api/v1',
            description: 'Llama 4 Maverick via OpenRouter'
        },
        {
            id: 'inception/mercury-coder-small-beta',
            model: 'inception/mercury-coder-small-beta',
            api_type: 'custom',
            base_url: 'https://openrouter.ai/api/v1',
            description: 'Mercury Coder Small — fast coding model'
        },
        {
            id: 'inception/mercury-2-large',
            model: 'inception/mercury-2-large',
            api_type: 'custom',
            base_url: 'https://openrouter.ai/api/v1',
            description: 'Mercury 2 Large — high-capability reasoning'
        },
        {
            id: 'qwen/qwen3-235b-a22b',
            model: 'qwen/qwen3-235b-a22b',
            api_type: 'custom',
            base_url: 'https://openrouter.ai/api/v1',
            description: 'Qwen 3 235B MoE via OpenRouter'
        }
    ],
    custom: []
}

export const PROVIDERS_NAME: { [key: string]: string } = {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    gemini: 'Gemini',
    openrouter: 'OpenRouter',
    vertex: 'Vertex',
    azure: 'Azure',
    custom: 'Custom'
}
