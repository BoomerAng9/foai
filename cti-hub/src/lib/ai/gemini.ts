/**
 * Gemini AI client — direct Google AI Studio integration.
 *
 * Bypasses OpenRouter entirely for chat completions. Paid API tier
 * means Google does NOT train on our content (per ToS).
 *
 * Uses @google/generative-ai SDK (already installed).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_KEY = process.env.GOOGLE_KEY || '';

// Gemini 3.1 Flash — latest, cheapest paid Gemini model.
// Native function calling, multimodal, 1M context.
export const GEMINI_CHAT_MODEL = 'gemini-3.1-flash';

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!GOOGLE_KEY) throw new Error('GOOGLE_KEY not configured');
    _genAI = new GoogleGenerativeAI(GOOGLE_KEY);
  }
  return _genAI;
}

interface GeminiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GeminiChatResult {
  content: string;
  model: string;
}

/**
 * Single-turn chat completion via Gemini.
 * Handles system prompt + message history in the format the rest of
 * the codebase already uses (OpenRouter-style role/content pairs).
 */
export async function geminiChatCompletion(input: {
  messages: GeminiMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<GeminiChatResult> {
  const modelName = input.model || GEMINI_CHAT_MODEL;
  const genAI = getGenAI();

  // Extract system instruction from messages
  const systemParts = input.messages.filter(m => m.role === 'system');
  const systemInstruction = systemParts.map(m => m.content).join('\n\n') || undefined;

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      maxOutputTokens: input.maxTokens || 2000,
      temperature: input.temperature ?? 0.4,
    },
  });

  // Convert to Gemini history format (user/model alternating)
  const nonSystem = input.messages.filter(m => m.role !== 'system');
  const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const msg of nonSystem.slice(0, -1)) {
    history.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  const lastMessage = nonSystem[nonSystem.length - 1];
  if (!lastMessage) throw new Error('No messages provided');

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  const text = result.response.text();

  if (!text) throw new Error('Gemini returned an empty response');

  return { content: text, model: modelName };
}
