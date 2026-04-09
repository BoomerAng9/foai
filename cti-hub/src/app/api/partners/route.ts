import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';
import { ensurePartnersTables } from '@/lib/partners/schema';
import type { PartnerRow } from '@/lib/partners/types';

/**
 * GET /api/partners — List all partners (owner-only)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json(
      { error: 'Owner access required', code: 'OWNER_ONLY' },
      { status: 403 },
    );
  }

  if (!sql) {
    return NextResponse.json({ partners: [] });
  }

  try {
    await ensurePartnersTables();
    const rows = (await sql`
      SELECT id, slug, name, tagline, description, logo_url, hero_image_url,
             website_url, status, tags, created_at, updated_at
      FROM partners
      WHERE status <> 'archived'
      ORDER BY created_at ASC
    `) as unknown as PartnerRow[];
    return NextResponse.json({ partners: rows });
  } catch (err) {
    console.error('[Partners] GET error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to fetch partners' }, { status: 500 });
  }
}

/**
 * POST /api/partners — Create a new partner (owner-only)
 * Body: { slug, name, tagline?, description?, logo_url?, hero_image_url?,
 *         website_url?, tags? }
 */
interface CreatePartnerBody {
  slug?: string;
  name?: string;
  tagline?: string;
  description?: string;
  logo_url?: string;
  hero_image_url?: string;
  website_url?: string;
  tags?: string[];
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json(
      { error: 'Owner access required', code: 'OWNER_ONLY' },
      { status: 403 },
    );
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: CreatePartnerBody;
  try {
    body = (await request.json()) as CreatePartnerBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const slug = (body.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const name = (body.name || '').trim();

  if (!slug || !name) {
    return NextResponse.json(
      { error: 'slug and name are required' },
      { status: 400 },
    );
  }

  try {
    await ensurePartnersTables();

    // Check for duplicate slug
    const existing = await sql`SELECT id FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: `A partner with slug "${slug}" already exists` },
        { status: 409 },
      );
    }

    const inserted = (await sql`
      INSERT INTO partners (slug, name, tagline, description, logo_url, hero_image_url, website_url, tags)
      VALUES (
        ${slug},
        ${name},
        ${body.tagline ?? ''},
        ${body.description ?? ''},
        ${body.logo_url ?? ''},
        ${body.hero_image_url ?? ''},
        ${body.website_url ?? ''},
        ${body.tags ?? []}
      )
      RETURNING id, slug, name, tagline, description, logo_url, hero_image_url,
                website_url, status, tags, created_at, updated_at
    `) as unknown as PartnerRow[];

    return NextResponse.json({ partner: inserted[0] }, { status: 201 });
  } catch (err) {
    console.error('[Partners] POST error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 });
  }
}
