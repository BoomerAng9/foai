const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const GEMMA4_MODEL = 'google/gemma-3-27b-it:free';

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
      model: opts.model || GEMMA4_MODEL,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 2000,
      stream: opts.stream ?? false,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  return res;
}

export async function generateText(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function streamCompletion(opts: {
  model?: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}) {
  return chatCompletion({ ...opts, stream: true });
}
