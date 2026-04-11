import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const MODEL = 'google/gemini-3.1-flash';

const ACHEEVY_SYSTEM = `You are ACHEEVY, the Digital CEO of The Deploy Platform. You are responding through an external channel (Telegram, WhatsApp, Discord, or Email). Keep responses concise and actionable. Use markdown where supported. Never reveal internal tools or model names.`;

/**
 * POST /api/channels/webhook — Unified webhook for all channel integrations
 *
 * Body varies by platform:
 *   Telegram: { platform: 'telegram', message: { chat: { id }, text, from } }
 *   WhatsApp: { platform: 'whatsapp', entry: [...] }
 *   Discord:  { platform: 'discord', content, channel_id, author }
 *   Email:    { platform: 'email', from, subject, body }
 */
const WEBHOOK_SECRET = process.env.CHANNELS_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  // Verify shared secret — blocks unauthorized callers from using
  // this endpoint as a free LLM proxy or prompt injection vector.
  if (WEBHOOK_SECRET) {
    const secret = req.headers.get('x-webhook-secret') || '';
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    // No secret configured — reject all requests in production
    return NextResponse.json(
      { error: 'Webhook not configured. Set CHANNELS_WEBHOOK_SECRET.' },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const platform = body.platform || detectPlatform(body);

    let userMessage = '';
    let replyTo = '';

    switch (platform) {
      case 'telegram':
        userMessage = body.message?.text || '';
        replyTo = body.message?.chat?.id?.toString() || '';
        break;
      case 'whatsapp':
        userMessage = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || '';
        replyTo = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || '';
        break;
      case 'discord':
        userMessage = body.content || '';
        replyTo = body.channel_id || '';
        break;
      case 'email':
        userMessage = `Subject: ${body.subject || 'No subject'}\n\n${body.body || ''}`;
        replyTo = body.from || '';
        break;
      default:
        return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
    }

    if (!userMessage.trim()) {
      return NextResponse.json({ ok: true, message: 'No content to process' });
    }

    // Generate ACHEEVY response
    const response = await generateResponse(userMessage);

    return NextResponse.json({
      ok: true,
      platform,
      reply_to: replyTo,
      response,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// WhatsApp verification challenge
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ status: 'webhook active' });
}

function detectPlatform(body: any): string {
  if (body.message?.chat?.id) return 'telegram';
  if (body.entry?.[0]?.changes) return 'whatsapp';
  if (body.channel_id && body.content) return 'discord';
  if (body.from && body.subject) return 'email';
  return 'unknown';
}

async function generateResponse(message: string): Promise<string> {
  if (!OPENROUTER_KEY) return 'Service temporarily unavailable.';

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: ACHEEVY_SYSTEM },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!res.ok) return 'I hit a temporary issue. Try again in a moment.';
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  } catch {
    return 'Connection issue. Please try again.';
  }
}
