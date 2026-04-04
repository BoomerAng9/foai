import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

/* ── Auto-create table ────────────────────────────────────────────── */

let tableReady = false;

async function ensureTable() {
  if (tableReady || !sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS affiliate_campaigns (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      partner_name  TEXT NOT NULL,
      campaign_name TEXT NOT NULL,
      tracking_url  TEXT NOT NULL DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'active',
      clicks        INTEGER NOT NULL DEFAULT 0,
      conversions   INTEGER NOT NULL DEFAULT 0,
      revenue       NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  tableReady = true;
}

/**
 * GET /api/affiliates — List affiliate partners and their campaigns
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required', code: 'OWNER_ONLY' }, { status: 403 });
  }

  if (!sql) {
    return NextResponse.json({ campaigns: [] });
  }

  try {
    await ensureTable();
    const campaigns = await sql`
      SELECT id, partner_name, campaign_name, tracking_url, status,
             clicks, conversions, revenue::float, created_at
      FROM affiliate_campaigns
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ campaigns });
  } catch (err) {
    console.error('[Affiliates] GET error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

/**
 * POST /api/affiliates — Create a new campaign
 * Body: { campaign_name, partner_name, tracking_url, start_date? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required', code: 'OWNER_ONLY' }, { status: 403 });
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const body = await request.json();
  const { campaign_name, partner_name, tracking_url } = body;

  if (!campaign_name || !partner_name || !tracking_url) {
    return NextResponse.json(
      { error: 'campaign_name, partner_name, and tracking_url are required' },
      { status: 400 },
    );
  }

  try {
    await ensureTable();
    const rows = await sql`
      INSERT INTO affiliate_campaigns (partner_name, campaign_name, tracking_url)
      VALUES (${partner_name}, ${campaign_name}, ${tracking_url})
      RETURNING id, partner_name, campaign_name, tracking_url, status, clicks, conversions, revenue::float, created_at
    `;
    return NextResponse.json({ campaign: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[Affiliates] POST error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
