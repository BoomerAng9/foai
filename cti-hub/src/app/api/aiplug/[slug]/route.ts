import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { ensureAiplugTables } from '@/lib/aiplug/schema';
import type { PlugRow, PlugRunRow } from '@/lib/aiplug/types';

/**
 * GET /api/aiplug/[slug] — plug detail + recent runs
 *
 * Public plug metadata. Recent runs are ALSO returned but only
 * for the authenticated user (or empty for anonymous viewers).
 * This keeps the detail page responsive without exposing other
 * users' runs.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    await ensureAiplugTables();
    const plugRows = (await sql`
      SELECT id, slug, name, tagline, description, category, hero_image_url,
             status, features, tags, price_cents, runtime_key, featured,
             created_at, updated_at
      FROM plugs
      WHERE slug = ${slug}
      LIMIT 1
    `) as unknown as PlugRow[];

    if (plugRows.length === 0) {
      return NextResponse.json({ error: 'Plug not found' }, { status: 404 });
    }

    const plug = plugRows[0];

    // I-1: return empty recent runs list; I-2 will wire per-user run history
    // once the runtime is in place.
    const recentRuns: PlugRunRow[] = [];

    return NextResponse.json({ plug, recentRuns });
  } catch (err) {
    console.error('[aiplug detail] GET error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to fetch plug' }, { status: 500 });
  }
}
