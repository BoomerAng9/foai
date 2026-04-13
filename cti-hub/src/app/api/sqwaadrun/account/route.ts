import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';

/**
 * GET /api/sqwaadrun/account
 * ============================
 * Returns subscription status + usage for a Sqwaadrun API key.
 * Auth: Bearer token = the sq_* API key.
 */
export async function GET(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const auth = request.headers.get('authorization') || '';
  const apiKey = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!apiKey || !apiKey.startsWith('sq_')) {
    return NextResponse.json({ error: 'Valid Sqwaadrun API key required' }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT id, email, name, plan_tier, missions_monthly, missions_used, status, created_at
      FROM sqwaadrun_subscriptions
      WHERE api_key = ${apiKey} AND status = 'active'
      LIMIT 1
    `;

    if (!rows.length) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const sub = rows[0];
    const remaining = sub.missions_monthly === -1
      ? -1  // unlimited
      : Math.max(0, sub.missions_monthly - sub.missions_used);

    return NextResponse.json({
      subscription: {
        id: sub.id,
        email: sub.email,
        plan: sub.plan_tier,
        missions_monthly: sub.missions_monthly,
        missions_used: sub.missions_used,
        missions_remaining: remaining,
        status: sub.status,
        since: sub.created_at,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 });
  }
}
