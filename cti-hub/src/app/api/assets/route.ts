import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

const VALID_TYPES = ['image', 'audio', 'doc', 'video', 'plug'] as const;

async function ensureTable() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS user_assets (
      id            SERIAL PRIMARY KEY,
      user_id       TEXT NOT NULL,
      name          TEXT NOT NULL,
      type          TEXT NOT NULL CHECK (type IN ('image','audio','doc','video','plug')),
      url           TEXT,
      size_bytes    BIGINT DEFAULT 0,
      metadata      JSONB DEFAULT '{}'::jsonb,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  // Index for fast per-user lookups
  await sql`
    CREATE INDEX IF NOT EXISTS idx_user_assets_user ON user_assets (user_id, created_at DESC)
  `;
}

let tableReady = false;

async function ensureTableOnce() {
  if (tableReady) return;
  await ensureTable();
  tableReady = true;
}

/**
 * GET /api/assets — list current user's assets
 * Query params: ?type=image (optional filter)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  await ensureTableOnce();

  const typeFilter = request.nextUrl.searchParams.get('type');

  let rows;
  if (typeFilter && VALID_TYPES.includes(typeFilter as typeof VALID_TYPES[number])) {
    rows = await sql`
      SELECT id, name, type, url, size_bytes, metadata, created_at
      FROM user_assets
      WHERE user_id = ${auth.userId} AND type = ${typeFilter}
      ORDER BY created_at DESC
      LIMIT 200
    `;
  } else {
    rows = await sql`
      SELECT id, name, type, url, size_bytes, metadata, created_at
      FROM user_assets
      WHERE user_id = ${auth.userId}
      ORDER BY created_at DESC
      LIMIT 200
    `;
  }

  return NextResponse.json({ assets: rows });
}

/**
 * POST /api/assets — save a new asset
 * Body: { name, type, url?, data?, size_bytes?, metadata? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  await ensureTableOnce();

  let body: { name?: string; type?: string; url?: string; data?: string; size_bytes?: number; metadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, type, url, data, size_bytes, metadata } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!type || !VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }

  const assetUrl = url || data || '';
  const bytes = size_bytes || (data ? new Blob([data]).size : 0);
  const meta = metadata || {};

  const rows = await sql`
    INSERT INTO user_assets (user_id, name, type, url, size_bytes, metadata)
    VALUES (${auth.userId}, ${name}, ${type}, ${assetUrl}, ${bytes}, ${JSON.stringify(meta)})
    RETURNING id, name, type, url, size_bytes, metadata, created_at
  `;

  return NextResponse.json({ asset: rows[0] }, { status: 201 });
}
