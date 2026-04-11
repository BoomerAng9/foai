import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { safeCompare } from '@/lib/auth-guard';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || process.env.PIPELINE_AUTH_KEY || '';

/**
 * POST /api/podcasters/upgrade-plan
 * Called by n8n after Paperform payment succeeds.
 * Body: { email, plan_tier, webhook_secret }
 */
export async function POST(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const body = await req.json();
  const { email, plan_tier, webhook_secret } = body;

  if (!WEBHOOK_SECRET || !webhook_secret || !safeCompare(webhook_secret, WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const validTiers = ['bmc', 'premium', 'bucket_list', 'lfg'];
  if (!validTiers.includes(plan_tier)) {
    return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 });
  }

  const result = await sql`
    UPDATE podcaster_users
    SET plan_tier = ${plan_tier}, updated_at = NOW()
    WHERE email = ${email.trim().toLowerCase()}
    RETURNING id, email, plan_tier
  `;

  if (!result.length) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user: result[0] });
}
