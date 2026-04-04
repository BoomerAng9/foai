interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
  error?: {
    message?: string;
  };
}

const LUC_URL = process.env.LUC_URL || 'http://localhost:8081';

function getOpenRouterHeaders() {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter is not configured. Set OPENROUTER_API_KEY.');
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.DOMAIN_CLIENT || 'http://localhost:3000',
    'X-OpenRouter-Title': 'The Deploy Platform',
  };
}

export function getOpenRouterModel(inputMode: 'text' | 'voice' = 'text') {
  const textModel = process.env.OPENROUTER_TEXT_MODEL || 'google/gemma-4-26b-a4b-it';
  const voiceModel = process.env.OPENROUTER_VOICE_MODEL || textModel;
  return inputMode === 'voice' ? voiceModel : textModel;
}

async function lucRecordUsage(service: string, model: string, tokensIn: number, tokensOut: number) {
  try {
    await fetch(`${LUC_URL}/record/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service, model, tokens_in: tokensIn, tokens_out: tokensOut }),
    });
  } catch {
    // LUC unavailable — skip metering silently
  }
}

export async function createOpenRouterChatCompletion(input: {
  messages: OpenRouterMessage[];
  model?: string;
  inputMode?: 'text' | 'voice';
  userId?: string;
  service?: string;
}) {
  const model = input.model || getOpenRouterModel(input.inputMode || 'text');
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: getOpenRouterHeaders(),
    body: JSON.stringify({
      model,
      messages: input.messages,
      temperature: 0.4,
      user: input.userId,
    }),
  });

  const payload = (await response.json()) as OpenRouterResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenRouter request failed with status ${response.status}`);
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('OpenRouter returned an empty response.');
  }

  // Record usage in LUC
  if (payload.usage) {
    await lucRecordUsage(
      input.service || 'deploy-platform',
      payload.model || model,
      payload.usage.prompt_tokens || 0,
      payload.usage.completion_tokens || 0,
    );
  }

  return {
    id: payload.id,
    model: payload.model || model,
    content,
    usage: payload.usage,
    raw: payload,
  };
}
