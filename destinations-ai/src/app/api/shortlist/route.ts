import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sql, requireDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ShortlistMutationSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const DeleteSchema = z.object({
  destinationId: z.string().min(1).max(64),
});

/**
 * GET /api/shortlist — authenticated user's saved destinations, newest first.
 */
export async function GET(request: NextRequest) {
  const guard = requireDb();
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const rows = await sql!<Array<{
    destinationId: string;
    note: string | null;
    addedAt: Date;
  }>>`
    SELECT destination_id, note, added_at
    FROM user_shortlists
    WHERE user_id = ${auth.user.uid}
    ORDER BY added_at DESC
  `;

  return NextResponse.json({ data: rows });
}

/**
 * POST /api/shortlist
 * Body: { destinationId: string; note?: string }
 * Idempotent — UNIQUE(user_id, destination_id) makes a repeat a no-op.
 */
export async function POST(request: NextRequest) {
  const guard = requireDb();
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const parsed = ShortlistMutationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { destinationId, note } = parsed.data;

  const destCheck = await sql!<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM destinations WHERE destination_id = ${destinationId}) AS exists
  `;
  if (!destCheck[0]?.exists) {
    return NextResponse.json({ error: 'destination not found' }, { status: 404 });
  }

  await sql!`
    INSERT INTO user_shortlists (user_id, destination_id, note)
    VALUES (${auth.user.uid}, ${destinationId}, ${note ?? null})
    ON CONFLICT (user_id, destination_id) DO UPDATE SET note = EXCLUDED.note
  `;

  return NextResponse.json({ data: { destinationId } }, { status: 201 });
}

/**
 * DELETE /api/shortlist
 * Body: { destinationId: string }
 */
export async function DELETE(request: NextRequest) {
  const guard = requireDb();
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { destinationId } = parsed.data;

  await sql!`
    DELETE FROM user_shortlists
    WHERE user_id = ${auth.user.uid} AND destination_id = ${destinationId}
  `;

  return NextResponse.json({ data: { destinationId } });
}
