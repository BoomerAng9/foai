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

function getOpenRouterHeaders() {
  const apiKey = process.env.OPENROUTER_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter is not configured. Set OPENROUTER_KEY.');
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.DOMAIN_CLIENT || 'http://localhost:3080',
    'X-OpenRouter-Title': 'GRAMMAR',
  };
}

export function getOpenRouterModel(inputMode: 'text' | 'voice' = 'text') {
  const textModel = process.env.OPENROUTER_TEXT_MODEL || 'openai/gpt-4o-mini';
  const voiceModel = process.env.OPENROUTER_VOICE_MODEL || textModel;
  return inputMode === 'voice' ? voiceModel : textModel;
}

export async function createOpenRouterChatCompletion(input: {
  messages: OpenRouterMessage[];
  model?: string;
  inputMode?: 'text' | 'voice';
  userId?: string;
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
      session_id: `grammar-${input.inputMode || 'text'}-chat`,
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

  return {
    id: payload.id,
    model: payload.model || model,
    content,
    usage: payload.usage,
    raw: payload,
  };
}