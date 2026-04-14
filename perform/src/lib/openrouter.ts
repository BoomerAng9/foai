const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const DEFAULT_MODEL = 'google/gemini-3.1-flash';

export async function chatCompletion(opts: {
  model?: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'Per|Form Platform',
    },
    body: JSON.stringify({
      model: opts.model || DEFAULT_MODEL,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 2000,
      stream: opts.stream ?? false,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  return res;
}

/**
 * Strip reasoning-model artifacts from generated content:
 * - `<think>...</think>` blocks (Qwen / DeepSeek R1 / o1-style models)
 * - Stray `<think>` or `</think>` tags left after partial streams
 * - Leading "Thought:" or "Reasoning:" prefixes some models emit
 * - XML-like scaffolding that leaked from the prompt template
 */
export function stripReasoningArtifacts(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // Full think blocks (greedy across newlines)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Orphan open/close tags
  cleaned = cleaned.replace(/<\/?think>/gi, '');
  // Leading "Thought:" / "Reasoning:" labels
  cleaned = cleaned.replace(/^\s*(Thought|Reasoning|Thinking)\s*:\s*/i, '');
  // Collapse 3+ consecutive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

export async function generateText(
  systemPrompt: string,
  userMessage: string,
  model: string = DEFAULT_MODEL,
): Promise<string> {
  const res = await chatCompletion({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '';
  return stripReasoningArtifacts(raw);
}

export async function streamCompletion(opts: {
  model?: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}) {
  return chatCompletion({ ...opts, stream: true });
}
