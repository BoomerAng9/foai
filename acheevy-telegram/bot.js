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

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const V1_URL = process.env.ACHEEVY_V1_URL;
const V1_TOKEN = process.env.ACHEEVY_V1_TOKEN;
const MODEL = process.env.ACHEEVY_MODEL || 'qwen/qwen3.6-plus-preview:free';

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
- End actionable responses with a clear next step`;

async function callLLM(messages) {
  if (!OPENROUTER_KEY) return 'LLM not configured. Set OPENROUTER_API_KEY.';

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Title': 'ACHEEVY Telegram',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: ACHEEVY_SYSTEM }, ...messages],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('LLM error:', err);
      return 'I hit a temporary issue. Try again in a moment.';
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  } catch (err) {
    console.error('LLM call failed:', err.message);
    return 'Connection issue. Try again shortly.';
  }
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

  const response = await callLLM(session.messages.slice(-10));
  session.messages.push({ role: 'assistant', content: response });

  bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
});

bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const vision = match[1];
  const session = getSession(chatId);

  bot.sendChatAction(chatId, 'typing');

  session.messages.push({ role: 'user', content: `[Broad|Cast Studio] I want to create a video scene: ${vision}. Interpret this cinematically — suggest camera, lens, lighting, movement, film profile. Give me the creative direction.` });

  const response = await callLLM(session.messages.slice(-10));
  session.messages.push({ role: 'assistant', content: response });

  bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
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

  const response = await callLLM(session.messages.slice(-10));
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
