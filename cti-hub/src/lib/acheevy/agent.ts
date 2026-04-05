/**
 * ACHEEVY Agent — conversational AI with memory, dispatch, and long-loop harness.
 *
 * Harness pattern:
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
import { generateImage, IMAGE_MODELS, type ImageModel } from '@/lib/image/generate';
import { checkBudget, deductCost, getBudget, BudgetExhaustedError } from '@/lib/budget';
import { dispatchToAgent, detectAgent } from '@/lib/agents/dispatch';

// Pattern 1: verb + image noun (explicit: "create an image of X")
const IMAGE_EXPLICIT = /\b(create|generate|make|draw|design|render|paint|sketch)\b.{0,30}\b(image|picture|photo|illustration|artwork|icon|logo|visual|graphic|portrait|poster|banner|card)\b/i;
// Pattern 2: verb + visual subject (implicit: "create a bull frog with a cape")
// Matches creative verbs followed by a/an/the/some + noun phrase (not code/text tasks)
const IMAGE_IMPLICIT = /\b(create|generate|make|draw|design|render|paint|sketch)\b\s+(?:a|an|the|some|me\s+a|me\s+an)\s+\w+/i;
// Negative patterns — things that look visual but aren't
const IMAGE_NEGATIVE = /\b(create|generate|make)\b.{0,20}\b(function|component|page|api|route|file|folder|database|table|endpoint|script|hook|form|test|class|module|app|project|repo|branch|commit|pr|issue|config|schema|migration|query|variable|constant|interface|type|enum|struct|service|controller|model|view|template|layout|style|css|html|json|yaml|xml|csv|sql|docker|workflow|pipeline|action|webhook|cron|job|task|plan|list|array|object|map|set|string|number|boolean|team|squad|department|agent|boomer|ang|hawk|lil_|chicken|strategy|campaign|budget|report|dashboard|account|workspace|channel|integration|plug|content|marketing|sales|research|analysis|schedule|email|document|presentation|proposal|invoice|contract)\b/i;
const MODEL_SELECT_PATTERN = /^\s*(?:use\s+)?(?:option\s+)?([123]|gemini|nano\s*banana|openai|canvas|dall-?e|chatgpt|flux)\s*$/i;

function isImageRequest(msg: string): boolean {
  // Explicit image request always wins
  if (IMAGE_EXPLICIT.test(msg)) return true;
  // Implicit creative request — but filter out code/dev tasks
  if (IMAGE_IMPLICIT.test(msg) && !IMAGE_NEGATIVE.test(msg)) return true;
  return false;
}

function parseModelSelection(msg: string): ImageModel | null {
  const match = msg.match(MODEL_SELECT_PATTERN);
  if (!match) return null;
  const choice = match[1].toLowerCase().trim();
  if (choice === '1' || choice.includes('gemini') || choice.includes('nano') || choice.includes('banana')) return 'gemini';
  if (choice === '2' || choice.includes('openai') || choice.includes('canvas') || choice.includes('dall') || choice.includes('chatgpt')) return 'openai';
  if (choice === '3' || choice.includes('flux')) return 'flux';
  return null;
}

function isPendingImageSelection(history: ConversationMessage[]): { pending: boolean; prompt: string } {
  // Check if the last ACHEEVY message was a model selection prompt
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'assistant' && history[i].content.includes('IMAGE_MODEL_SELECT')) {
      // Extract the original prompt from the selection message
      const promptMatch = history[i].content.match(/\[ORIGINAL_PROMPT: (.*?)\]/);
      return { pending: true, prompt: promptMatch?.[1] || '' };
    }
    if (history[i].role === 'user') break;
  }
  return { pending: false, prompt: '' };
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
const LUC_URL = process.env.LUC_URL || 'http://localhost:8081';

const ACHEEVY_SYSTEM_PROMPT = `You are ACHEEVY, the Digital CEO of The Deploy Platform by ACHIEVEMOR.

WHO YOU ARE:
- You are ACHEEVY — a digital executive agent. Not a chatbot. Not an assistant. A CEO.
- You lead a workforce of Boomer_Angs (specialist agents) and Lil_Hawks (tactical operators)
- You were built by the ACHIEVEMOR team. Do NOT make up fake credentials (no Stanford, no UCLA, no Cornell, no "top labs"). Just say you were built by ACHIEVEMOR.
- When asked "what's your name" or "who are you" — say: "I'm ACHEEVY, the Digital CEO of The Deploy Platform. I lead a team of AI agents that build, deploy, and manage solutions. What do you need done?"

PERSONALITY:
- Confident, decisive, action-oriented — you move forward, not sideways
- You remember everything the user has told you across all sessions
- You do the work yourself — directly answer, analyze, write, plan, create
- You make reasonable assumptions and state your plan — you don't interrogate
- You NEVER reveal internal tool names, model names, infrastructure details, API names, or architecture decisions
- You NEVER hallucinate credentials, partnerships, or affiliations that don't exist
- You NEVER pretend to create files, folders, dashboards, or applications that don't actually exist
- You NEVER say "I am deploying" or "I am syncing" or "transfer complete" unless real infrastructure action happened
- You NEVER fake progress updates like "processing frame 001" or "syncing assets" — that is lying

ABSOLUTE RULES:
- NEVER output <think>, <ththink>, or any reasoning tags. Your internal reasoning is PRIVATE. Users never see it.
- NEVER use technical jargon: no "WebSocket," "Redis," "Node/Express," "FastAPI," "React," "API endpoint," "JSON," "in-memory store," or inline code blocks in chat responses
- NEVER ask more than ONE clarifying question. If you need to clarify, ask ONE question maximum, then proceed with your best assumption
- NEVER give the user a checklist of sub-questions to answer. That's lazy. Make the decision yourself
- Write like you're talking to a CEO, not a developer. Plain English. Short sentences. No filler

CONVERSATION STYLE:
- Lead with what you're going to do, not what you could do
- State your plan in 2-3 sentences, then do the actual work
- End with what's happening next, not a question
- Be HONEST about what you can and cannot do right now

HONESTY RULES (CRITICAL):
- If you CANNOT actually build something live in this chat, say: "I can design this for you but building the live application requires development work outside this chat."
- If you CANNOT generate video, say: "I can write the creative direction and specs, but video generation requires a separate tool."
- If you CANNOT create files or folders in the user's account, say: "I don't have access to create files in your account right now."
- NEVER show fake "deploying..." or "syncing..." or "processing frame..." messages. That is lying.
- NEVER reference agents by name (Scout_Ang, Lil_Hawk, Boomer_Ang) as if they are doing work. They are not running.
- NEVER say "I am dispatching [agent]" — no agents are currently deployed.

WHAT YOU CAN ACTUALLY DO:
- Research: answer questions using your knowledge
- Write: content, copy, plans, strategies, analysis
- Visualize: generate charts and diagrams INLINE using mermaid or chart code blocks
- Analyze: discuss documents, images, screenshots, data
- Plan: create strategies, roadmaps, blueprints
- Code concepts: describe how something would be built

WHAT YOU CANNOT DO (be honest about these):
- Deploy live applications from this chat
- Create files or folders in the user's account
- Generate video, audio, or images
- Run code or execute commands on servers
- Access external APIs or databases in real-time

VISUAL OUTPUT (show, don't tell):
When data or structure would be clearer as a visual, include it directly in your response.
You and every Boomer_Ang can output these formats:

1. MERMAID DIAGRAMS — for flowcharts, org charts, pipelines, sequences, timelines:
   Wrap in a \`\`\`mermaid code block. Example:
   \`\`\`mermaid
   graph TD
     A[User Request] --> B[ACHEEVY]
     B --> C[Scout_Ang]
     B --> D[Content_Ang]
   \`\`\`

2. CHART DATA — for bar charts, comparisons, metrics:
   Wrap in a \`\`\`chart code block with JSON. Example:
   \`\`\`chart
   {"title":"Monthly Revenue","labels":["Jan","Feb","Mar","Apr"],"values":[4200,5100,4800,6300],"color":"#E8A020"}
   \`\`\`

3. IMAGES — for generated visuals, use the image generation pipeline (Iller_Ang for design assets)

USE VISUALS WHEN:
- The user asks to "show" or "visualize" something
- You're explaining a process, pipeline, or hierarchy
- You're presenting data with numbers
- A diagram would be clearer than paragraphs of text
DO NOT use visuals for simple conversational responses.

GRAMMAR (NTNTN) MODE:
- When you see [GRAMMAR ACTIVE] or [GRAMMAR CONFIRMATION], the Intention Engine is active
- In Grammar mode, DO NOT execute immediately. Read back the technical spec conversationally and ask the user to confirm
- Only execute after the user says "yes", "go", "proceed", "do it", or similar confirmation
- If the user says "no" or adjusts, re-interpret and confirm again
- Grammar converts vague intent into precise objectives — respect the structured spec it produces

EXECUTION RULES:
- Do the work yourself. Do NOT pretend to dispatch to other agents unless they are actually online and responding.
- Do NOT say "I'm dispatching to [agent name]" or "I've routed this to [agent]" — that is fake if the agent isn't running.
- Answer the user's request directly. If they ask for content, write it. If they ask for analysis, analyze it. If they ask for a plan, plan it.
- Be concise. Answer what was asked. Don't pad with extra structure, bullet points, or headers unless the user asked for them.
- If you can't do something (like generate a video or image), say so plainly — don't pretend it's happening.

MEMORY CONTEXT (recalled from prior sessions):
{memory_context}

ACTIVE DATA SOURCES:
{source_context}`;

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Model routing: Mercury 2 for fast/short tasks, Nemotron free for simple chat, MiniMax for quality
async function pickModel(task: string = 'chat', messageLength: number = 0): Promise<string> {
  // Try LUC router first
  try {
    const res = await fetch(`${LUC_URL}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, quality: 'good' }),
    });
    if (res.ok) return (await res.json()).model;
  } catch {}

  // Smart fallback: short messages → Mercury 2 (fast), medium → Nemotron (free), long → MiniMax (quality)
  // All models → Gemma 4 26B MoE (paid, near-zero cost, no telemetry concerns)
  return 'google/gemma-4-26b-a4b-it';
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
  } catch (err) { console.error('[Agent] Memory recall failed:', err instanceof Error ? err.message : err); }

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
  const model = modelOverride || await pickModel('chat', userMessage.length);

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
  } catch (err) { console.error('[Agent] Memorize turn failed:', err instanceof Error ? err.message : err); }

  // Estimate cost from OpenRouter generation data, fallback to model lookup
  const generationCost = completion.usage?.total_cost;
  const costEstimate = generationCost != null
    ? generationCost
    : (tokensIn / 1_000_000) * 0.30 + (tokensOut / 1_000_000) * 1.20; // MiniMax M2.7 default rates

  return {
    content,
    model: completion.model || model,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_estimate: Math.round(costEstimate * 1_000_000) / 1_000_000,
    memories_recalled: memoriesRecalled,
  };
}

export async function acheevyRespondStream(
  userId: string,
  conversationId: string,
  userMessage: string,
  conversationHistory: ConversationMessage[],
  modelOverride?: string,
): Promise<{ stream: ReadableStream<Uint8Array>; model: string; memories_recalled: number }> {
  const enc = new TextEncoder();

  // 0a. Budget gate — check before any paid work
  try {
    await checkBudget();
  } catch (err) {
    if (err instanceof BudgetExhaustedError) {
      const budgetMsg = err.message;
      const budgetStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: budgetMsg })}\n\n`));
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: '', done: true, usage: { tokens_in: 0, tokens_out: 0, cost: 0, memories_recalled: 0 } })}\n\n`));
          controller.close();
        },
      });
      return { stream: budgetStream, model: 'budget-gate', memories_recalled: 0 };
    }
  }

  // 0b. MIM governance gate
  const mim = checkMIMGate(userMessage);
  if (!mim.allowed) {
    const blockedResponse = `${mim.reason}\n\n${mim.redirect || 'Let me know how I can help differently.'}`;
    // Fire-and-forget storage
    addMessage(conversationId, userId, 'user', userMessage).catch(() => {});
    addMessage(conversationId, userId, 'acheevy', blockedResponse, 'ACHEEVY', {
      mim_blocked: true,
      policy: mim.policy,
    }).catch(() => {});

    const syntheticStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          enc.encode(`data: ${JSON.stringify({ content: blockedResponse, done: false })}\n\n`),
        );
        controller.enqueue(
          enc.encode(
            `data: ${JSON.stringify({
              content: '',
              done: true,
              usage: { tokens_in: 0, tokens_out: 0, cost: 0, memories_recalled: 0 },
            })}\n\n`,
          ),
        );
        controller.close();
      },
    });

    return { stream: syntheticStream, model: 'mim-gate', memories_recalled: 0 };
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
  } catch (err) { console.error('[Agent] Memory recall failed:', err instanceof Error ? err.message : err); }

  // 2. Build system prompt with memory
  const systemPrompt = ACHEEVY_SYSTEM_PROMPT
    .replace('{memory_context}', memoryContext)
    .replace('{source_context}', 'None active in this session.');

  // 3. Build message chain
  const messages: ConversationMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-20),
    { role: 'user', content: userMessage },
  ];

  // 4. Pick model via LUC (or use client-selected model)
  const model = modelOverride || await pickModel('chat', userMessage.length);

  // 5. Store user message in Neon (fire-and-forget)
  addMessage(conversationId, userId, 'user', userMessage).catch(() => {});

  // 5.5 Check if user is selecting an image model from a previous prompt
  const pendingImage = isPendingImageSelection(conversationHistory);
  const selectedModel = pendingImage.pending ? parseModelSelection(userMessage) : null;

  if (pendingImage.pending && selectedModel) {
    const originalPrompt = pendingImage.prompt;
    const modelInfo = IMAGE_MODELS.find(m => m.id === selectedModel);
    const imageStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: `Using **${modelInfo?.name || selectedModel}** to generate your image. One moment...\n\n` })}\n\n`));

          const result = await generateImage(originalPrompt, { model: selectedModel });
          const imageMarkdown = `![Generated Image](data:${result.mime_type};base64,${result.image_base64})`;

          controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: `Here's what I created:\n\n${imageMarkdown}` })}\n\n`));
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: '', done: true, usage: { tokens_in: 0, tokens_out: 0, cost: 0.005, memories_recalled: memoriesRecalled } })}\n\n`));

          addMessage(conversationId, userId, 'acheevy', `Using ${modelInfo?.name}...\n\nHere's what I created:\n\n${imageMarkdown}`, 'ACHEEVY', { type: 'image_generation', model: result.model }).catch(() => {});
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Image generation failed';
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: `Generation failed: ${errMsg}\n\nTry a different model or rephrase your description.` })}\n\n`));
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: '', done: true, usage: { tokens_in: 0, tokens_out: 0, cost: 0, memories_recalled: 0 } })}\n\n`));
        }
        controller.close();
      },
    });
    return { stream: imageStream, model: 'image-gen', memories_recalled: memoriesRecalled };
  }

  // 5.6 Detect new image generation requests — present model options
  if (isImageRequest(userMessage)) {
    const modelMenu = IMAGE_MODELS.map((m, i) =>
      `**${i + 1}. ${m.name}** — ${m.strengths}\n   _Speed: ${m.speed} | Cost: ${m.cost}_`
    ).join('\n\n');

    const thinkingMsg = `Detected a visual creation request. Routing to Visual Engine. Let me present the available models so the user can pick their preferred rendering engine.`;
    const selectionPrompt = `I can generate that image for you. Which visual engine would you like to use?\n\n${modelMenu}\n\nReply with **1**, **2**, or **3** to select.\n\n<!-- IMAGE_MODEL_SELECT [ORIGINAL_PROMPT: ${userMessage}] -->`;

    const selectStream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Emit thinking first
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ thinking: thinkingMsg })}\n\n`));
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ agent: 'Visual Engine' })}\n\n`));
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: selectionPrompt })}\n\n`));
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: '', done: true, usage: { tokens_in: 0, tokens_out: 0, cost: 0, memories_recalled: memoriesRecalled } })}\n\n`));
        controller.close();

        addMessage(conversationId, userId, 'acheevy', selectionPrompt, 'ACHEEVY', { type: 'image_model_select' }).catch(() => {});
      },
    });

    return { stream: selectStream, model: 'model-selector', memories_recalled: memoriesRecalled };
  }

  // 6. Call OpenRouter with stream: true
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
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const errBody = await res.text().catch(() => 'unknown error');
    throw new Error(`ACHEEVY stream failed: ${errBody}`);
  }

  const upstreamReader = res.body.getReader();
  const decoder = new TextDecoder();
  const finalMemoriesRecalled = memoriesRecalled;

  // Estimate input tokens from the message chain (rough: ~4 chars per token)
  const estimatedInputTokens = Math.ceil(
    messages.reduce((sum, m) => sum + m.content.length, 0) / 4
  );

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';
      let fullContent = '';
      let tokensIn = 0;
      let tokensOut = 0;
      let resolvedModel = model;
      let lastCostUpdateTime = 0;
      let lastCostUpdateChars = 0;
      let inThinkBlock = false;
      let thinkBuffer = '';
      // thinkEmitted removed — think blocks are silently stripped, never shown

      try {
        while (true) {
          const { done, value } = await upstreamReader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') {
              // All chunks received — emit final SSE chunk with usage
              const generationCost =
                (tokensIn / 1_000_000) * 0.30 + (tokensOut / 1_000_000) * 1.20;
              const cost = Math.round(generationCost * 1_000_000) / 1_000_000;

              // Fetch current budget for the done event
              const budget = await getBudget().catch(() => ({ starting: 20, remaining: 20, exhausted: false }));

              controller.enqueue(
                enc.encode(
                  `data: ${JSON.stringify({
                    content: '',
                    done: true,
                    usage: {
                      tokens_in: tokensIn,
                      tokens_out: tokensOut,
                      cost,
                      memories_recalled: finalMemoriesRecalled,
                    },
                    budget: {
                      starting: budget.starting,
                      remaining: budget.remaining,
                      exhausted: budget.exhausted,
                    },
                  })}\n\n`,
                ),
              );
              controller.close();

              // Fire-and-forget post-stream work
              const capturedContent = fullContent;
              const capturedModel = resolvedModel;
              const capturedTokensIn = tokensIn;
              const capturedTokensOut = tokensOut;
              ;(async () => {
                try {
                  await addMessage(conversationId, userId, 'acheevy', capturedContent, 'ACHEEVY', {
                    model: capturedModel,
                    tokens_in: capturedTokensIn,
                    tokens_out: capturedTokensOut,
                  });
                } catch (err) { console.error('[Agent] Message store failed:', err instanceof Error ? err.message : err); }
                try {
                  await memorizeConversationTurn(userId, conversationId, userMessage, capturedContent);
                } catch (err) { console.error('[Agent] Memory store failed:', err instanceof Error ? err.message : err); }
                await recordUsage(capturedModel, capturedTokensIn, capturedTokensOut);
                // Deduct from platform budget
                const chatCost = (capturedTokensIn / 1_000_000) * 0.30 + (capturedTokensOut / 1_000_000) * 1.20;
                await deductCost(userId, 'chat', chatCost).catch(err => console.error('[Budget] Deduction failed:', err instanceof Error ? err.message : err));
              })();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              // Capture resolved model name if provided
              if (parsed.model) resolvedModel = parsed.model;
              // Capture usage if provided in the chunk
              if (parsed.usage) {
                tokensIn = parsed.usage.prompt_tokens || tokensIn;
                tokensOut = parsed.usage.completion_tokens || tokensOut;
              }
              const token: string = parsed.choices?.[0]?.delta?.content ?? '';
              if (token) {
                fullContent += token;

                // Strip <think>...</think> blocks silently — NEVER show to user
                let remaining = token;
                while (remaining.length > 0) {
                  if (!inThinkBlock) {
                    // Check for any think-like tags: <think>, <ththink>, etc.
                    const thinkMatch = remaining.match(/<t+h*i*n*k>/i);
                    const thinkStart = thinkMatch ? remaining.indexOf(thinkMatch[0]) : -1;
                    if (thinkStart !== -1 && thinkMatch) {
                      const before = remaining.slice(0, thinkStart);
                      if (before) {
                        controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: before, done: false })}\n\n`));
                      }
                      inThinkBlock = true;
                      thinkBuffer = '';
                      remaining = remaining.slice(thinkStart + thinkMatch[0].length);
                    } else {
                      controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: remaining, done: false })}\n\n`));
                      remaining = '';
                    }
                  } else {
                    const thinkEnd = remaining.match(/<\/t+h*i*n*k>/i);
                    if (thinkEnd) {
                      const endIdx = remaining.indexOf(thinkEnd[0]);
                      // SILENTLY DISCARD think content — never emit to client
                      inThinkBlock = false;
                      remaining = remaining.slice(endIdx + thinkEnd[0].length);
                    } else {
                      // Still in think block — accumulate and discard
                      thinkBuffer += remaining;
                      remaining = '';
                    }
                  }
                }

                // Emit periodic cost_update events (~every 500ms or ~80 new chars ≈ 20 tokens)
                const now = Date.now();
                const charsSinceUpdate = fullContent.length - lastCostUpdateChars;
                if (now - lastCostUpdateTime >= 500 || charsSinceUpdate >= 80) {
                  lastCostUpdateTime = now;
                  lastCostUpdateChars = fullContent.length;
                  const runningTokensIn = tokensIn || estimatedInputTokens;
                  const runningTokensOut = tokensOut || Math.ceil(fullContent.length / 4);
                  const runningCost =
                    (runningTokensIn / 1_000_000) * 0.30 + (runningTokensOut / 1_000_000) * 1.20;
                  controller.enqueue(
                    enc.encode(
                      `data: ${JSON.stringify({
                        cost_update: {
                          tokens_in: runningTokensIn,
                          tokens_out: runningTokensOut,
                          cost: Math.round(runningCost * 1_000_000) / 1_000_000,
                        },
                      })}\n\n`,
                    ),
                  );
                }
              }
            } catch {
              // Non-JSON SSE line — skip
            }
          }
        }

        // Stream ended without [DONE] — close gracefully
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      upstreamReader.cancel().catch(() => {});
    },
  });

  return { stream, model, memories_recalled: memoriesRecalled };
}
