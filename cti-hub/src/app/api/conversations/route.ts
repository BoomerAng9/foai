import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { createConversation, getConversations, getMessages, addMessage, archiveConversation } from '@/lib/memory/store';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const conversationId = request.nextUrl.searchParams.get('id');

  if (conversationId) {
    const messages = await getMessages(conversationId);
    return NextResponse.json({ messages });
  }

  const conversations = await getConversations(auth.userId);
  return NextResponse.json({ conversations });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));

  if (body.action === 'message') {
    const msg = await addMessage(
      body.conversation_id,
      auth.userId,
      body.role || 'user',
      body.content,
      body.agent_name,
      body.metadata,
    );
    return NextResponse.json({ message: msg });
  }

  if (body.action === 'archive') {
    await archiveConversation(body.conversation_id, auth.userId);
    return NextResponse.json({ ok: true });
  }

  const conversation = await createConversation(auth.userId, body.title);
  return NextResponse.json({ conversation });
}
