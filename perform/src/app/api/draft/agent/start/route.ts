/**
 * POST /api/draft/agent/start
 * =============================
 * Starts a Claude Managed Agent draft session for the gamified Draft
 * Night experience. NO GAMBLING — fantasy-style points only (see
 * lib/draft/fantasy-scoring.ts).
 *
 * Body:
 *   {
 *     mode: 'auto' | 'pick-team' | 'war-room',
 *     userTeam?: string,
 *     chaosFactor?: number,  // 0-100, default 30
 *     rounds?: number        // default 7
 *   }
 *
 * Response:
 *   { ok: true, session: DraftSession }
 *
 * Auth: requireAuth (Firebase) — only signed-in users can spin agents.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import {
  managedAgentsAvailable,
  createDraftAgent,
  createDraftEnvironment,
  startDraftSession,
} from '@/lib/draft/managed-agent-draft';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!managedAgentsAvailable()) {
    return NextResponse.json(
      { error: 'Managed Agents not configured — set ANTHROPIC_API_KEY' },
      { status: 503 },
    );
  }

  let body: {
    mode?: string;
    userTeam?: string;
    chaosFactor?: number;
    rounds?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const mode = body.mode === 'auto' || body.mode === 'pick-team' || body.mode === 'war-room'
    ? body.mode
    : 'auto';
  const chaosFactor = Math.max(0, Math.min(100, body.chaosFactor ?? 30));
  const rounds = Math.max(1, Math.min(7, body.rounds ?? 7));

  if ((mode === 'pick-team' || mode === 'war-room') && !body.userTeam) {
    return NextResponse.json({ error: 'userTeam required for this mode' }, { status: 400 });
  }

  const agent = await createDraftAgent(mode, body.userTeam, chaosFactor);
  if (!agent.agentId) {
    return NextResponse.json({ error: agent.error || 'Agent creation failed' }, { status: 500 });
  }

  const env = await createDraftEnvironment();
  // Environment is optional — proceed even on failure (some accounts don't need one).

  const session = await startDraftSession(agent.agentId, env.environmentId ?? undefined, {
    mode,
    userTeam: body.userTeam,
    chaosFactor,
    rounds,
  });

  if ('error' in session) {
    return NextResponse.json({ error: session.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, session });
}
