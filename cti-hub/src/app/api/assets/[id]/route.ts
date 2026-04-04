import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

/**
 * DELETE /api/assets/[id] — delete an asset (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const { id } = await params;
  const assetId = parseInt(id, 10);
  if (isNaN(assetId)) {
    return NextResponse.json({ error: 'Invalid asset ID' }, { status: 400 });
  }

  // Only allow deleting own assets
  const rows = await sql`
    DELETE FROM user_assets
    WHERE id = ${assetId} AND user_id = ${auth.userId}
    RETURNING id
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Asset not found or not owned by you' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id: assetId });
}
