import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';
import { ensurePartnersTables } from '@/lib/partners/schema';
import type {
  PartnerRow,
  PartnerPageRow,
  PartnerDocumentRow,
} from '@/lib/partners/types';

/**
 * GET /api/partners/[slug] — Partner detail + pages + documents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json(
      { error: 'Owner access required', code: 'OWNER_ONLY' },
      { status: 403 },
    );
  }

  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    await ensurePartnersTables();

    const partnerRows = (await sql`
      SELECT id, slug, name, tagline, description, logo_url, hero_image_url,
             website_url, status, tags, created_at, updated_at
      FROM partners
      WHERE slug = ${slug}
      LIMIT 1
    `) as unknown as PartnerRow[];

    if (partnerRows.length === 0) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const partner = partnerRows[0];

    const pages = (await sql`
      SELECT id, partner_id, slug, title, body_markdown, position, visibility,
             created_at, updated_at
      FROM partner_pages
      WHERE partner_id = ${partner.id}
      ORDER BY position ASC, created_at ASC
    `) as unknown as PartnerPageRow[];

    const documents = (await sql`
      SELECT id, partner_id, name, kind, mime_type, size_bytes, storage_url,
             smelter_os_path, tags, description, uploaded_by, uploaded_at
      FROM partner_documents
      WHERE partner_id = ${partner.id}
      ORDER BY uploaded_at DESC
    `) as unknown as PartnerDocumentRow[];

    return NextResponse.json({ partner, pages, documents });
  } catch (err) {
    console.error('[Partners detail] GET error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to fetch partner' }, { status: 500 });
  }
}

/**
 * PUT /api/partners/[slug] — Update partner fields
 * Body: partial PartnerRow (any subset of editable fields)
 */
interface UpdatePartnerBody {
  name?: string;
  tagline?: string;
  description?: string;
  logo_url?: string;
  hero_image_url?: string;
  website_url?: string;
  status?: string;
  tags?: string[];
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json(
      { error: 'Owner access required', code: 'OWNER_ONLY' },
      { status: 403 },
    );
  }

  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: UpdatePartnerBody;
  try {
    body = (await request.json()) as UpdatePartnerBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    await ensurePartnersTables();

    const updated = (await sql`
      UPDATE partners
      SET
        name           = COALESCE(${body.name ?? null}, name),
        tagline        = COALESCE(${body.tagline ?? null}, tagline),
        description    = COALESCE(${body.description ?? null}, description),
        logo_url       = COALESCE(${body.logo_url ?? null}, logo_url),
        hero_image_url = COALESCE(${body.hero_image_url ?? null}, hero_image_url),
        website_url    = COALESCE(${body.website_url ?? null}, website_url),
        status         = COALESCE(${body.status ?? null}, status),
        tags           = COALESCE(${body.tags ?? null}, tags),
        updated_at     = now()
      WHERE slug = ${slug}
      RETURNING id, slug, name, tagline, description, logo_url, hero_image_url,
                website_url, status, tags, created_at, updated_at
    `) as unknown as PartnerRow[];

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    return NextResponse.json({ partner: updated[0] });
  } catch (err) {
    console.error('[Partners detail] PUT error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 });
  }
}
