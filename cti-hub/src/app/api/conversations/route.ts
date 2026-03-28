import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { createConversation, getConversations, getMessages, addMessage, archiveConversation } from '@/lib/memory/store';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) return null;
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const conversationId = request.nextUrl.searchParams.get('id');

  if (conversationId) {
    const messages = await getMessages(conversationId);
    return NextResponse.json({ messages });
  }

  const conversations = await getConversations(userId);
  return NextResponse.json({ conversations });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  if (body.action === 'message') {
    const msg = await addMessage(
      body.conversation_id,
      userId,
      body.role || 'user',
      body.content,
      body.agent_name,
      body.metadata,
    );
    return NextResponse.json({ message: msg });
  }

  if (body.action === 'archive') {
    await archiveConversation(body.conversation_id, userId);
    return NextResponse.json({ ok: true });
  }

  const conversation = await createConversation(userId, body.title);
  return NextResponse.json({ conversation });
}
