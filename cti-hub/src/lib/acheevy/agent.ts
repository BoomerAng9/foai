/**
 * ACHEEVY Agent — conversational AI with memory, dispatch, and long-loop harness.
 *
 * Harness pattern (Anthropic Harness 2.0):
 *   Planner (ACHEEVY) → Generator (Chicken Hawk + fleet) → Evaluator (QA)
 *
 * Every conversation turn:
 *   1. Recall relevant memory from prior sessions
 *   2. Build context: system prompt + memory + data sources + conversation
 *   3. Stream response (conversational, not burst)
 *   4. Detect if dispatch is needed → route to Chicken Hawk
 *   5. Store turn in memory for future recall
 */

import { recallAll } from '@/lib/memory/recall';
import { addMessage, memorizeConversationTurn } from '@/lib/memory/store';
import { checkMIMGate } from './mim-gate';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
const LUC_URL = process.env.LUC_URL || 'http://localhost:8081';

const ACHEEVY_SYSTEM_PROMPT = `You are ACHEEVY, the Digital CEO of The Deploy Platform.

PERSONALITY:
- Conversational, decisive, action-oriented
- You remember everything the user has told you across all sessions
- You delegate work to your team — you don't do manual labor yourself
- You think out loud about your plan before executing
- You always confirm understanding before dispatching complex tasks
- You never reveal internal tool names, model names, or infrastructure details

CAPABILITIES:
- Research: gather data from any URL or source
- Organize: clean and structure data into useful formats
- Deliver: export to sheets, documents, live previews, or full applications
- Create: content, mockups, videos, proposals, emails
- Analyze: documents, images, screenshots, PDFs
- Automate: forms, workflows, scheduled tasks
- Build: full stack applications with databases and backends

CONVERSATION STYLE:
- Respond conversationally in 1-3 paragraphs for simple requests
- For complex tasks, outline your plan first, then execute
- Show progress when work is happening
- Always end with a clear next step or question
- Use the user's name if you know it

MEMORY CONTEXT (recalled from prior sessions):
{memory_context}

ACTIVE DATA SOURCES:
{source_context}`;

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

async function pickModel(task: string = 'chat'): Promise<string> {
  try {
    const res = await fetch(`${LUC_URL}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, quality: 'good' }),
    });
    if (res.ok) return (await res.json()).model;
  } catch {}
  return 'deepseek/deepseek-v3.2';
}

async function recordUsage(model: string, tokensIn: number, tokensOut: number) {
  try {
    await fetch(`${LUC_URL}/record/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: 'acheevy-chat', model, tokens_in: tokensIn, tokens_out: tokensOut }),
    });
  } catch {}
}

export async function acheevyRespond(
  userId: string,
  conversationId: string,
  userMessage: string,
  conversationHistory: ConversationMessage[],
  modelOverride?: string,
): Promise<{
  content: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_estimate: number;
  memories_recalled: number;
}> {
  // 0. MIM governance gate — check before anything else
  const mim = checkMIMGate(userMessage);
  if (!mim.allowed) {
    const blockedResponse = `${mim.reason}\n\n${mim.redirect || 'Let me know how I can help differently.'}`;
    await addMessage(conversationId, userId, 'user', userMessage);
    await addMessage(conversationId, userId, 'acheevy', blockedResponse, 'ACHEEVY', { mim_blocked: true, policy: mim.policy });
    return {
      content: blockedResponse,
      model: 'mim-gate',
      tokens_in: 0,
      tokens_out: 0,
      cost_estimate: 0,
      memories_recalled: 0,
    };
  }

  // 1. Recall relevant memory
  let memoryContext = 'No prior memory available.';
  let memoriesRecalled = 0;
  try {
    const memories = await recallAll(userId, userMessage, 5);
    if (memories.length > 0) {
      memoriesRecalled = memories.length;
      memoryContext = memories
        .map((m, i) => `[Memory ${i + 1}] ${m.content.slice(0, 300)}`)
        .join('\n');
    }
  } catch {}

  // 2. Build system prompt with memory
  const systemPrompt = ACHEEVY_SYSTEM_PROMPT
    .replace('{memory_context}', memoryContext)
    .replace('{source_context}', 'None active in this session.');

  // 3. Build message chain
  const messages: ConversationMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-20), // last 20 messages for context
    { role: 'user', content: userMessage },
  ];

  // 4. Pick model via LUC (or use client-selected model)
  const model = modelOverride || await pickModel('chat');

  // 5. Call OpenRouter
  if (!OPENROUTER_API_KEY) {
    throw new Error('No LLM API key configured');
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'X-OpenRouter-Title': 'The Deploy Platform',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 2000,
    }),
  });

  const completion = await res.json();
  if (!res.ok) {
    throw new Error(completion.error?.message || 'ACHEEVY response failed');
  }

  const content = completion.choices?.[0]?.message?.content?.trim() || '';
  const tokensIn = completion.usage?.prompt_tokens || 0;
  const tokensOut = completion.usage?.completion_tokens || 0;

  // 6. Record usage in LUC
  await recordUsage(model, tokensIn, tokensOut);

  // 7. Store messages in Neon
  await addMessage(conversationId, userId, 'user', userMessage);
  await addMessage(conversationId, userId, 'acheevy', content, 'ACHEEVY', {
    model: completion.model || model,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
  });

  // 8. Auto-memorize this turn for future recall
  try {
    await memorizeConversationTurn(userId, conversationId, userMessage, content);
  } catch {}

  // Estimate cost (rough — LUC has exact numbers)
  const costEstimate = (tokensIn / 1_000_000) * 0.27 + (tokensOut / 1_000_000) * 0.42;

  return {
    content,
    model: completion.model || model,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_estimate: Math.round(costEstimate * 1_000_000) / 1_000_000,
    memories_recalled: memoriesRecalled,
  };
}
