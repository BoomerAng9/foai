import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { acheevyRespond } from '@/lib/acheevy/agent';
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
    const { message, conversation_id, model } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    let convId = conversation_id;
    if (!convId && userId) {
      const conv = await createConversation(userId, message.slice(0, 60));
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

    const result = await acheevyRespond(
      userId || 'anonymous',
      convId || 'temp',
      message,
      history,
      model,
    );

    return NextResponse.json({
      reply: result.content,
      conversation_id: convId,
      usage: {
        tokens_in: result.tokens_in,
        tokens_out: result.tokens_out,
        cost: result.cost_estimate,
        memories_recalled: result.memories_recalled,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
