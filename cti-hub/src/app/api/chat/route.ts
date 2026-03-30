import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { acheevyRespondStream } from '@/lib/acheevy/agent';
import { createConversation, getMessages } from '@/lib/memory/store';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) return null;
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const { message, conversation_id, model, skill_context } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    let convId = conversation_id;
    if (!convId) {
      const conv = await createConversation(userId || 'anonymous', message.slice(0, 60));
      convId = conv?.id;
    }

    let history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    if (convId) {
      const msgs = await getMessages(convId);
      history = (msgs as Array<{ role: string; content: string }>).map((m) => ({
        role: m.role === 'acheevy' ? 'assistant' as const : m.role as 'user' | 'system',
        content: m.content,
      }));
    }

    // If skill context is provided, prepend it to the message as system-level context
    const enrichedMessage = skill_context
      ? `[SKILL CONTEXT - Apply this framework to your response]\n${skill_context}\n\n[USER MESSAGE]\n${message}`
      : message;

    const result = await acheevyRespondStream(
      userId || 'anonymous',
      convId || 'temp',
      enrichedMessage,
      history,
      model,
    );

    return new Response(result.stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Conversation-Id': convId || '',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
