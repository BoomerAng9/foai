import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';
import type { PartnerDocumentRow } from '@/lib/partners/types';
import { deletePartnerFile } from '@/lib/partners/storage';

/**
 * DELETE /api/partners/[slug]/documents/[docId]
 * ===============================================
 * Owner-only. Removes the partner_documents row AND the file bytes
 * from the Smelter OS storage path. Safe if the file has already
 * been removed from disk.
 */
export async function DELETE(
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
      SELECT d.id, d.smelter_os_path
      FROM partner_documents d
      INNER JOIN partners p ON p.id = d.partner_id
      WHERE d.id = ${docId} AND p.slug = ${slug}
      LIMIT 1
    `) as unknown as Pick<PartnerDocumentRow, 'id' | 'smelter_os_path'>[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = rows[0];
    const partnersSegment = doc.smelter_os_path.lastIndexOf('partners/');
    if (partnersSegment !== -1) {
      const relative = doc.smelter_os_path.slice(partnersSegment);
      try {
        await deletePartnerFile(relative);
      } catch (err) {
        console.warn(
          `[partners/documents/delete] failed to unlink ${relative}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    await sql`DELETE FROM partner_documents WHERE id = ${docId}`;

    return NextResponse.json({ deleted: docId });
  } catch (err) {
    console.error('[partners/documents/delete] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
