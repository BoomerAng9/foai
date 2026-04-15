/**
 * POST /api/draft/agent/[id]/message
 * ====================================
 * Send a user message to a running Managed Agent draft session.
 * Use for: making a pick during war-room, proposing a trade, asking
 * an analyst question.
 *
 * Body: { message: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sendMessage } from '@/lib/draft/managed-agent-draft';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: { message?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const result = await sendMessage(id, message);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'sendMessage failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
