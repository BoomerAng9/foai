import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { getRecentMessages, getActiveTasks, runAutonomousCycle } from '@/lib/agents/autonomous';

// GET — get recent autonomous agent activity
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    messages: getRecentMessages(30),
    tasks: getActiveTasks(),
  });
}

// POST — trigger an autonomous cycle (owner only)
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  // Run cycle in background (don't await — return immediately)
  runAutonomousCycle().catch(err =>
    console.error('[Autonomous] Cycle failed:', err instanceof Error ? err.message : err)
  );

  return NextResponse.json({ triggered: true, message: 'Autonomous cycle started' });
}
