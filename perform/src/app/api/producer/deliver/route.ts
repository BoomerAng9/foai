import { NextRequest, NextResponse } from 'next/server';
import { safeCompare } from '@/lib/auth-guard';
import { runDeliveryCycle, type PodcasterClient } from '@/lib/producer/engine';
import { DEFAULT_PREFERENCES } from '@/lib/podcasters/delivery-preferences';

/**
 * POST /api/producer/deliver
 *
 * Triggers a delivery cycle for a specific podcaster.
 * Called by Cloud Run Jobs on schedule, or manually for testing.
 *
 * Auth: PIPELINE_AUTH_KEY (server-to-server only, never user-facing)
 */
export async function POST(request: NextRequest) {
  const authKey = process.env.PIPELINE_AUTH_KEY;
  const provided = request.headers.get('x-pipeline-key');

  if (!authKey || !provided || !safeCompare(provided, authKey)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.userId || !body.team) {
      return NextResponse.json({ error: 'userId and team required' }, { status: 400 });
    }

    const client: PodcasterClient = {
      userId: body.userId,
      email: body.email || '',
      podcastName: body.podcastName || '',
      team: body.team,
      vertical: body.vertical || 'NFL',
      tier: body.tier || 'bmc',
      deliveryPreferences: body.deliveryPreferences || DEFAULT_PREFERENCES,
    };

    const result = await runDeliveryCycle(client);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Producer] Delivery failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'delivery failed' }, { status: 500 });
  }
}
