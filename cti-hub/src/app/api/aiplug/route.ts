import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { ensureAiplugTables } from '@/lib/aiplug/schema';
import type { PlugRow } from '@/lib/aiplug/types';

/**
 * GET /api/aiplug — list available aiPLUGs
 *
 * Public endpoint (no auth). Returns plugs with status='ready' or
 * 'beta' for display in the launcher grid. Archived and drafts are
 * filtered out. Featured plugs come first.
 */
export async function GET(_request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ plugs: [] });
  }

  try {
    await ensureAiplugTables();
    const rows = (await sql`
      SELECT id, slug, name, tagline, description, category, hero_image_url,
             status, features, tags, price_cents, runtime_key, featured,
             created_at, updated_at
      FROM plugs
      WHERE status IN ('ready', 'beta')
      ORDER BY featured DESC, created_at ASC
    `) as unknown as PlugRow[];
    return NextResponse.json({ plugs: rows });
  } catch (err) {
    console.error('[aiplug] GET error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to fetch plugs' }, { status: 500 });
  }
}
