/**
 * Grok LLM Client — xAI API (OpenAI-compatible)
 *
 * Endpoint: https://api.x.ai/v1/chat/completions
 * Auth: process.env.XAI_API_KEY
 *
 * This is the xAI / Grok LLM API — NOT the X/Twitter posting API.
 * For X posting, see @/lib/social/x-poster.ts
 */

const GROK_API_BASE = 'https://api.x.ai/v1';

interface GrokMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GrokResponse {
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
  };
  error?: {
    message?: string;
  };
}

const LUC_URL = process.env.LUC_URL || 'http://localhost:8081';

function getGrokHeaders(): Record<string, string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY is not configured. Set it in your environment.');
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

export function getGrokModel(preference?: string): string {
  // Allow override via env or explicit preference
  if (preference) return preference;
  return process.env.GROK_MODEL || 'grok-4.20-beta';
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

export async function createGrokChatCompletion(input: {
  messages: GrokMessage[];
  model?: string;
  userId?: string;
  service?: string;
  temperature?: number;
}) {
  const model = getGrokModel(input.model);

  const response = await fetch(`${GROK_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getGrokHeaders(),
    body: JSON.stringify({
      model,
      messages: input.messages,
      temperature: input.temperature ?? 0.4,
      user: input.userId,
    }),
  });

  const payload = (await response.json()) as GrokResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `Grok request failed with status ${response.status}`);
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Grok returned an empty response.');
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
