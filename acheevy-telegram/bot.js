/**
 * ACHEEVY Telegram Bot
 * Standalone access to The Deploy Platform via Telegram.
 * Routes messages through OpenRouter (same models as CTI Hub).
 *
 * Commands:
 *   /start  — Welcome + capabilities
 *   /ask    — Ask ACHEEVY anything
 *   /deploy — Quick deploy request
 *   /status — Check platform status
 *   /broadcast — Quick video generation prompt
 *
 * Environment:
 *   TELEGRAM_BOT_TOKEN — From @BotFather
 *   OPENROUTER_API_KEY — For LLM calls
 *   ACHEEVY_V1_URL     — Optional: route to V1 for autonomous tasks
 *   ACHEEVY_V1_TOKEN   — Optional: JWT for V1 auth
 */

const TelegramBot = require('node-telegram-bot-api');
const {
  scrubForCustomer,
  createRfpIntake,
  getEngagementStatus,
  STAGE_LABELS,
  STAGE_ORDINALS,
} = require('./rfp-bamaram');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const V1_URL = process.env.ACHEEVY_V1_URL; // Must be set via env, no hardcoded fallback
const V1_TOKEN = process.env.ACHEEVY_V1_TOKEN;
const MODEL = process.env.ACHEEVY_MODEL || 'google/gemini-3.1-flash';

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN required');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Per-user conversation history (in-memory, resets on restart)
const sessions = new Map();

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { messages: [], name: null });
  }
  return sessions.get(chatId);
}

const ACHEEVY_SYSTEM = `You are ACHEEVY, the Digital CEO of The Deploy Platform by FOAI.

You are speaking through Telegram. Keep responses concise — Telegram messages should be shorter than web chat. Use markdown formatting (bold, italic, code blocks) that Telegram supports.

YOUR CAPABILITIES:
- Answer questions about anything
- Research topics using your knowledge
- Help plan business strategies
- Guide users on deploying AI solutions
- Creative direction (Iller_Ang)
- Cost analysis (LUC)
- Code assistance (Code_Ang)

YOUR VOICE: Confident, warm, direct. Like a trusted advisor who gets things done. Never robotic.

RULES:
- Never reveal internal model names, API providers, or infrastructure
- Keep responses under 2000 characters for Telegram readability
- Use bullet points and bold for structure
- End actionable responses with a clear next step

RFP → BAMARAM DISPATCH:
When a user describes a commercial need (building something, hiring us, a project they want delivered), call the \`open_engagement\` tool with their brief instead of just chatting. When a user asks about status of an existing engagement and provides a UUID, call \`check_engagement\`. After a tool returns, weave the result into a natural reply — don't dump the raw JSON.`;

// ── RFP → BAMARAM tool schemas (OpenRouter / OpenAI format) ──────────
const RFP_BAMARAM_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'open_engagement',
      description:
        'Opens a new commercial engagement for the user. Call this when they describe a project, build request, or commercial need. Creates a tracked Charter + Ledger and returns an engagement ID the user can reference.',
      parameters: {
        type: 'object',
        properties: {
          brief: {
            type: 'string',
            description:
              'The user\'s free-text brief describing what they need. Quote them faithfully; do not paraphrase their requirements away.',
          },
        },
        required: ['brief'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_engagement',
      description:
        'Looks up the current stage + HITL status for a specific engagement by UUID. Call this when the user asks about an existing engagement and provides its ID.',
      parameters: {
        type: 'object',
        properties: {
          engagement_id: {
            type: 'string',
            description: 'The engagement UUID (36-char hex with dashes).',
          },
        },
        required: ['engagement_id'],
      },
    },
  },
];

/**
 * Low-level LLM call. Returns the full assistant message (content +
 * optional tool_calls) so the caller can run the tool-dispatch loop.
 */
async function callLLM(messages, { tools } = {}) {
  if (!OPENROUTER_KEY) {
    return { content: 'LLM not configured. Set OPENROUTER_API_KEY.' };
  }
  try {
    const body = {
      model: MODEL,
      messages: [{ role: 'system', content: ACHEEVY_SYSTEM }, ...messages],
      temperature: 0.7,
      max_tokens: 1000,
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Title': 'ACHEEVY Telegram',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('LLM error:', err);
      return { content: 'I hit a temporary issue. Try again in a moment.' };
    }
    const data = await res.json();
    const m = data.choices?.[0]?.message;
    return {
      content: m?.content ?? '',
      toolCalls: m?.tool_calls ?? null,
    };
  } catch (err) {
    console.error('LLM call failed:', err.message);
    return { content: 'Connection issue. Try again shortly.' };
  }
}

/**
 * Dispatch a tool call to the matching RFP → BAMARAM handler.
 * Returns a string that becomes the tool's response message.
 */
async function dispatchRfpTool(name, args, ctx) {
  try {
    if (name === 'open_engagement') {
      const r = await createRfpIntake({
        brief: args.brief ?? '',
        telegramUserId: ctx.telegramUserId,
        telegramHandle: ctx.telegramHandle,
      });
      return JSON.stringify({
        ok: true,
        engagement_id: r.engagementId,
        stage: `1/10 — ${STAGE_LABELS.rfp_intake}`,
      });
    }
    if (name === 'check_engagement') {
      const s = await getEngagementStatus(args.engagement_id ?? '');
      if (!s) return JSON.stringify({ ok: false, error: 'engagement_not_found' });
      return JSON.stringify({
        ok: true,
        engagement_id: s.engagementId,
        stage: `${s.stageOrdinal}/10`,
        stage_label: s.label,
        hitl_gate_status: s.hitlGateStatus,
      });
    }
    return JSON.stringify({ ok: false, error: `unknown_tool:${name}` });
  } catch (err) {
    console.error(`[dispatchRfpTool:${name}] error:`, err.message);
    return JSON.stringify({ ok: false, error: 'tool_error' });
  }
}

/**
 * Full LLM turn with up to 2 rounds of tool dispatch. Returns the
 * final assistant text ready for Telegram display (post-scrub).
 */
async function llmTurn(userMessages, ctx) {
  let messages = [...userMessages];
  for (let hop = 0; hop < 2; hop++) {
    const { content, toolCalls } = await callLLM(messages, {
      tools: RFP_BAMARAM_TOOLS,
    });
    if (!toolCalls || toolCalls.length === 0) {
      return scrubForCustomer(content || 'No response generated.');
    }
    // Append the assistant's tool-call message, then each tool result.
    messages.push({ role: 'assistant', content: content ?? '', tool_calls: toolCalls });
    for (const call of toolCalls) {
      let parsed = {};
      try { parsed = JSON.parse(call.function?.arguments ?? '{}'); } catch {}
      const result = await dispatchRfpTool(call.function?.name ?? '', parsed, ctx);
      messages.push({ role: 'tool', tool_call_id: call.id, content: result });
    }
  }
  // Tool loop budget exhausted — ask the model for a plain close-out.
  const final = await callLLM(messages);
  return scrubForCustomer(final.content || 'Engagement recorded.');
}

// ── Commands ──

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from?.first_name || 'there';
  getSession(chatId).name = name;

  bot.sendMessage(chatId,
    `*Welcome to ACHEEVY* — The Deploy Platform\n\n` +
    `Hey ${name}. I'm your Digital CEO. Here's what I can do:\n\n` +
    `• *Ask me anything* — just type your question\n` +
    `• */rfp <brief>* — open a new commercial engagement\n` +
    `• */engagement <id>* — check engagement status\n` +
    `• */deploy* — start a deployment request\n` +
    `• */broadcast* — create a video scene\n` +
    `• */status* — platform health check\n\n` +
    `_Just talk to me naturally. I'll handle the rest._`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;

  let v1Status = 'offline';
  if (V1_URL) {
    try {
      const res = await fetch(`${V1_URL}/health`, { signal: AbortSignal.timeout(5000) });
      v1Status = res.ok ? 'operational' : 'degraded';
    } catch {
      v1Status = 'unreachable';
    }
  }

  bot.sendMessage(chatId,
    `*Platform Status*\n\n` +
    `• Chat Engine: ✅ operational\n` +
    `• V1 Backend: ${v1Status === 'operational' ? '✅' : '⚠️'} ${v1Status}\n` +
    `• Model: active\n` +
    `• Telegram Bot: ✅ online\n\n` +
    `_deploy.foai.cloud | cti.foai.cloud_`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/deploy (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const request = match[1];
  const session = getSession(chatId);

  bot.sendChatAction(chatId, 'typing');

  session.messages.push({ role: 'user', content: `I want to deploy: ${request}. Give me a quick plan — what agents will handle this, estimated timeline, and next steps.` });

  const response = await llmTurn(session.messages.slice(-10), {
    telegramUserId: msg.from?.id ?? chatId,
    telegramHandle: msg.from?.username ?? null,
  });
  session.messages.push({ role: 'assistant', content: response });

  bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
});

bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const vision = match[1];
  const session = getSession(chatId);

  bot.sendChatAction(chatId, 'typing');

  session.messages.push({ role: 'user', content: `[Broad|Cast Studio] I want to create a video scene: ${vision}. Interpret this cinematically — suggest camera, lens, lighting, movement, film profile. Give me the creative direction.` });

  const response = await llmTurn(session.messages.slice(-10), {
    telegramUserId: msg.from?.id ?? chatId,
    telegramHandle: msg.from?.username ?? null,
  });
  session.messages.push({ role: 'assistant', content: response });

  bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
});

// ── RFP → BAMARAM commands ──
//
// /rfp <brief>        Opens a Charter + Ledger engagement (Step 1).
// /engagement <id>    Returns customer-safe status for the engagement.
//
// The Charter is customer-facing; the Ledger stays internal. See
// rfp-bamaram.js for the DB-level implementation. Outbound copy goes
// through scrubForCustomer to prevent internal-name leaks.

bot.onText(/\/rfp\s+([\s\S]+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const brief = (match?.[1] ?? '').trim();
  if (brief.length === 0) {
    return bot.sendMessage(
      chatId,
      '*Usage:* `/rfp <describe what you need>`\n\n' +
        'Example: `/rfp 25-QB NIL-compliant recruiting fleet, delivery Dec 1`',
      { parse_mode: 'Markdown' },
    );
  }

  bot.sendChatAction(chatId, 'typing');

  try {
    const result = await createRfpIntake({
      brief,
      telegramUserId: msg.from?.id ?? chatId,
      telegramHandle: msg.from?.username ?? null,
    });
    const reply =
      `*Engagement opened.*\n\n` +
      `• ID: \`${result.engagementId}\`\n` +
      `• Stage: 1/10 — Intake received\n` +
      `• Next: we'll draft a response to your brief and come back with scope.\n\n` +
      `Track it anytime with \`/engagement ${result.engagementId}\`.`;
    return bot.sendMessage(chatId, scrubForCustomer(reply), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[/rfp] error:', err.message);
    return bot.sendMessage(
      chatId,
      'I could not open the engagement right now. Please try again shortly.',
    );
  }
});

bot.onText(/\/engagement\s+([0-9a-f-]{36})/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const id = match?.[1];
  if (!id) {
    return bot.sendMessage(chatId, '*Usage:* `/engagement <id>`', {
      parse_mode: 'Markdown',
    });
  }

  bot.sendChatAction(chatId, 'typing');

  try {
    const status = await getEngagementStatus(id);
    if (!status) {
      return bot.sendMessage(chatId, 'No engagement found with that ID.');
    }
    const gate =
      status.hitlGateStatus === 'approved'
        ? '✅ approved'
        : status.hitlGateStatus === 'pending'
          ? '⏳ pending your approval'
          : status.hitlGateStatus === 'rejected'
            ? '✗ rejected'
            : '↑ escalated';
    const reply =
      `*Engagement \`${id.slice(0, 8)}…\`*\n\n` +
      `• Stage: ${status.stageOrdinal}/10 — ${status.label}\n` +
      `• Gate: ${gate}\n` +
      `• Opened: ${new Date(status.createdAt).toLocaleString()}`;
    return bot.sendMessage(chatId, scrubForCustomer(reply), {
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('[/engagement] error:', err.message);
    return bot.sendMessage(chatId, 'Status lookup failed. Please try again shortly.');
  }
});

// ── General messages ──

bot.on('message', async (msg) => {
  if (msg.text?.startsWith('/')) return; // Skip commands
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text) return;

  const session = getSession(chatId);
  bot.sendChatAction(chatId, 'typing');

  session.messages.push({ role: 'user', content: text });

  // Keep history manageable
  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-14);
  }

  const response = await llmTurn(session.messages.slice(-10), {
    telegramUserId: msg.from?.id ?? chatId,
    telegramHandle: msg.from?.username ?? null,
  });
  session.messages.push({ role: 'assistant', content: response });

  // Split long messages for Telegram (4096 char limit)
  if (response.length > 4000) {
    const chunks = response.match(/.{1,4000}/gs) || [response];
    for (const chunk of chunks) {
      await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' }).catch(() => {
        bot.sendMessage(chatId, chunk); // Retry without markdown if parse fails
      });
    }
  } else {
    bot.sendMessage(chatId, response, { parse_mode: 'Markdown' }).catch(() => {
      bot.sendMessage(chatId, response); // Retry without markdown
    });
  }
});

// ── Error handling ──

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.code, err.message);
});

console.log('ACHEEVY Telegram bot is running...');
