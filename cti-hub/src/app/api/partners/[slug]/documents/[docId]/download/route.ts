import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';
import type { PartnerDocumentRow } from '@/lib/partners/types';
import { readPartnerFile } from '@/lib/partners/storage';

/**
 * GET /api/partners/[slug]/documents/[docId]/download
 * =====================================================
 * Owner-only streaming download. Resolves the doc row, reads the
 * bytes from the Smelter OS storage path, streams them back with
 * the recorded MIME type.
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ slug: string; docId: string }>;
  },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json(
      { error: 'Owner access required', code: 'OWNER_ONLY' },
      { status: 403 },
    );
  }

  const { slug, docId } = await params;

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const rows = (await sql`
      SELECT d.id, d.partner_id, d.name, d.kind, d.mime_type, d.size_bytes,
             d.storage_url, d.smelter_os_path, d.tags, d.description,
             d.uploaded_by, d.uploaded_at
      FROM partner_documents d
      INNER JOIN partners p ON p.id = d.partner_id
      WHERE d.id = ${docId} AND p.slug = ${slug}
      LIMIT 1
    `) as unknown as PartnerDocumentRow[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = rows[0];

    const partnersSegment = doc.smelter_os_path.lastIndexOf('partners/');
    if (partnersSegment === -1) {
      return NextResponse.json(
        { error: 'Stored path is malformed' },
        { status: 500 },
      );
    }
    const relative = doc.smelter_os_path.slice(partnersSegment);

    const { bytes } = await readPartnerFile(relative);

    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': doc.mime_type || 'application/octet-stream',
        'Content-Length': String(doc.size_bytes),
        'Content-Disposition': `inline; filename="${doc.name.replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('[partners/documents/download] error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'Failed to read document' },
      { status: 500 },
    );
  }
}
