import { NextRequest, NextResponse } from 'next/server';
import { acheevy } from '@/core_runtime/acheevy';
import { agentFleet } from '@/core_runtime/agent_fleet';
import { applyRateLimit } from '@/lib/rate-limit';
import { requireAuthenticatedRequest, requireRole } from '@/lib/server-auth';

type LaunchMode = 'preview' | 'execute';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const roleResponse = requireRole(authResult.context, ['admin', 'operator']);
    if (roleResponse) {
      return roleResponse;
    }

    const rateLimitResponse = applyRateLimit(request, 'runtime-launch', {
      maxRequests: 20,
      windowMs: 5 * 60 * 1000,
      subject: authResult.context.user.uid,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();
    const intent = typeof body.intent === 'string' ? body.intent.trim() : '';
    const orgId = typeof body.orgId === 'string' && body.orgId.trim()
      ? body.orgId.trim()
      : authResult.context.profile?.default_org_id || 'demo-org';
    const mode: LaunchMode = body.mode === 'execute' ? 'execute' : 'preview';

    if (!intent) {
      return NextResponse.json({ error: 'intent is required' }, { status: 400 });
    }

    const huddle = await acheevy.huddle(intent, orgId);
    const snapshot = agentFleet.getSnapshot(orgId, huddle.state.normalized_intent);

    if (mode === 'preview') {
      return NextResponse.json({
        mode,
        snapshot,
        plan: huddle.plan,
        state: huddle.state,
      });
    }

    const execution = await acheevy.execute(huddle.plan, huddle.state, huddle.context);
    return NextResponse.json({
      mode,
      snapshot,
      plan: huddle.plan,
      state: execution.state,
      success: execution.success,
      bundle: execution.success ? execution.bundle : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Runtime launch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
