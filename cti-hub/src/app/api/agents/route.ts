import { NextRequest, NextResponse } from 'next/server';
import { agentFleet } from '@/core_runtime/agent_fleet';
import { ntntn } from '@/core_runtime/ntntn';
import { applyRateLimit } from '@/lib/rate-limit';
import { requireAuthenticatedRequest, requireRole } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const roleResponse = requireRole(authResult.context, ['admin', 'operator']);
    if (roleResponse) {
      return roleResponse;
    }

    const rateLimitResponse = applyRateLimit(request, 'agents-snapshot', {
      maxRequests: 60,
      windowMs: 5 * 60 * 1000,
      subject: authResult.context.user.uid,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('orgId') ?? authResult.context.profile?.default_org_id ?? 'demo-org';
    const intent = searchParams.get('intent');
    const normalized = intent ? await ntntn.normalize(intent) : undefined;

    return NextResponse.json({
      snapshot: agentFleet.getSnapshot(organizationId, normalized),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to load agent fleet';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
