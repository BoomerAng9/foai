import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouterChatCompletion, getOpenRouterModel } from '@/lib/ai/openrouter';
import { getRequestAuthToken, requireAuthenticatedRequest } from '@/lib/server-auth';
import { applyRateLimit } from '@/lib/rate-limit';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT = `You are the CTI HUB agent console. You help users with:
- MindEdge enrollment tracking and affiliate link management
- Open Seat university course scraping and contracting
- Agent fleet status and operations
- Platform health and metrics
Be concise and action-oriented.`;

function normalizeMessages(payload: unknown): ChatMessage[] | null {
  if (!Array.isArray(payload)) return null;

  const messages = payload.filter((item): item is ChatMessage => {
    if (!item || typeof item !== 'object') return false;
    const c = item as Record<string, unknown>;
    return (c.role === 'user' || c.role === 'assistant' || c.role === 'system')
      && typeof c.content === 'string'
      && c.content.trim().length > 0;
  });

  return messages.length > 0 ? messages : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = normalizeMessages(body.messages);
    const authToken = getRequestAuthToken(request);

    let userId: string | undefined;
    if (authToken) {
      const authResult = await requireAuthenticatedRequest(request);
      if (authResult.ok) userId = authResult.context.user.uid;
    }

    const rateLimitResponse = applyRateLimit(request, 'chat', {
      maxRequests: userId ? 30 : 10,
      windowMs: 5 * 60 * 1000,
      subject: userId || authToken || undefined,
    });
    if (rateLimitResponse) return rateLimitResponse;

    if (!messages) {
      return NextResponse.json({ error: 'messages is required' }, { status: 400 });
    }

    if (!process.env.OPENROUTER_KEY && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'No LLM API key configured.' }, { status: 503 });
    }

    const finalMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    const model = typeof body.model === 'string' && body.model.trim()
      ? body.model
      : getOpenRouterModel('text');

    const completion = await createOpenRouterChatCompletion({
      messages: finalMessages,
      model,
      inputMode: 'text',
      userId,
    });

    return NextResponse.json({
      reply: completion.content,
      model: completion.model,
      provider: 'OpenRouter',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Chat API error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
