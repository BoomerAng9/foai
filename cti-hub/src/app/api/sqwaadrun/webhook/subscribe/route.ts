import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { safeCompare } from '@/lib/auth-guard';
import crypto from 'crypto';

/**
 * POST /api/sqwaadrun/webhook/subscribe
 * ========================================
 * Paperform sends webhook on Sqwaadrun plan purchase.
 * Flow: Paperform → this endpoint → Neon provisioning → API key generation.
 *
 * Auth: X-Webhook-Secret header must match PAPERFORM_WEBHOOK_SECRET.
 *
 * Paperform Stepper config:
 *   1. Create form with fields: email, name, plan_tier (hunter/hawker/commander)
 *   2. Add Stepper "Send webhook" on submission:
 *      POST https://cti.foai.cloud/api/sqwaadrun/webhook/subscribe
 *      Header: X-Webhook-Secret = <PAPERFORM_WEBHOOK_SECRET>
 *      Body: raw JSON (full submission)
 */

const WEBHOOK_SECRET = process.env.PAPERFORM_WEBHOOK_SECRET || '';

const VALID_TIERS: Record<string, { name: string; missions_monthly: number; price_cents: number }> = {
  hunter:    { name: 'Hunter',              missions_monthly: 5000,   price_cents: 2900 },
  hawker:    { name: 'Hawker',              missions_monthly: 100000, price_cents: 14900 },
  commander: { name: 'Sqwaadrun Commander', missions_monthly: -1,     price_cents: 0 },
};

async function ensureTable() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS sqwaadrun_subscriptions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      email TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      plan_tier TEXT NOT NULL,
      api_key TEXT NOT NULL UNIQUE,
      missions_monthly INTEGER NOT NULL DEFAULT 5000,
      missions_used INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      paperform_submission_id TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS sq_sub_email_idx ON sqwaadrun_subscriptions (email)`;
  await sql`CREATE INDEX IF NOT EXISTS sq_sub_apikey_idx ON sqwaadrun_subscriptions (api_key)`;
}

function generateApiKey(tier: string): string {
  const secret = crypto.randomBytes(24).toString('hex');
  return `sq_${tier}_${secret}`;
}

export async function POST(request: NextRequest) {
  // Auth
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }
  const secret = request.headers.get('x-webhook-secret') || '';
  if (!safeCompare(secret, WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  try {
    await ensureTable();

    const body = await request.json();
    const data = body.data || body;

    // Extract fields from Paperform submission
    const email = (data.email || data.Email || '').toString().trim().toLowerCase();
    const name = (data.name || data.Name || data.company || '').toString().trim();
    const tierRaw = (data.plan_tier || data.plan || data.tier || 'hunter').toString().trim().toLowerCase();
    const submissionId = (body.submission_id || body.id || '').toString();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const tier = VALID_TIERS[tierRaw] ? tierRaw : 'hunter';
    const tierConfig = VALID_TIERS[tier];

    // Check for existing subscription
    const existing = await sql`
      SELECT id, api_key, plan_tier, status FROM sqwaadrun_subscriptions
      WHERE email = ${email} AND status = 'active'
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Upgrade existing subscription
      const upgraded = tierRaw !== existing[0].plan_tier;
      if (upgraded) {
        await sql`
          UPDATE sqwaadrun_subscriptions
          SET plan_tier = ${tier}, missions_monthly = ${tierConfig.missions_monthly},
              updated_at = now()
          WHERE id = ${existing[0].id}
        `;
      }
      return NextResponse.json({
        ok: true,
        action: upgraded ? 'upgraded' : 'existing',
        subscription: {
          id: existing[0].id,
          api_key: existing[0].api_key,
          plan: tierConfig.name,
          missions_monthly: tierConfig.missions_monthly,
        },
      });
    }

    // Create new subscription
    const apiKey = generateApiKey(tier);
    const [sub] = await sql`
      INSERT INTO sqwaadrun_subscriptions (email, name, plan_tier, api_key, missions_monthly, paperform_submission_id)
      VALUES (${email}, ${name}, ${tier}, ${apiKey}, ${tierConfig.missions_monthly}, ${submissionId})
      RETURNING id, email, plan_tier, api_key, missions_monthly, created_at
    `;

    console.log(`[sqwaadrun] New subscription: ${email} → ${tier} (${sub.id})`);

    return NextResponse.json({
      ok: true,
      action: 'created',
      subscription: {
        id: sub.id,
        api_key: sub.api_key,
        plan: tierConfig.name,
        missions_monthly: sub.missions_monthly,
      },
    });
  } catch (err) {
    console.error('[sqwaadrun webhook] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
  }
}
