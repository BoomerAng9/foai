import { NextResponse, type NextRequest } from 'next/server';
import { sql, requireDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { IntentionSetSchema, type Intention } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/intentions — authenticated user's intention set, ordered.
 */
export async function GET(request: NextRequest) {
  const guard = requireDb();
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const rows = await sql!<Array<{
    intentionId: string;
    phrase: string;
    weight: number;
    displayOrder: number;
  }>>`
    SELECT intention_id, phrase, weight, display_order
    FROM user_intentions
    WHERE user_id = ${auth.user.uid}
    ORDER BY display_order ASC, created_at ASC
  `;

  const intentions: Intention[] = rows.map((r) => ({
    intentionId: r.intentionId,
    phrase: r.phrase,
    weight: r.weight,
    displayOrder: r.displayOrder,
  }));

  return NextResponse.json({ data: intentions });
}

/**
 * POST /api/intentions
 * Body: { intentions: Intention[] } — full replacement of the user's set.
 *
 * Runs in a transaction so the user never sees a partial state if the
 * rewrite fails midway.
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

  const parsed = IntentionSetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { intentions } = parsed.data;

  try {
    await sql!.begin(async (tx) => {
      await tx`DELETE FROM user_intentions WHERE user_id = ${auth.user.uid}`;
      for (const [i, intent] of intentions.entries()) {
        await tx`
          INSERT INTO user_intentions (user_id, phrase, weight, display_order)
          VALUES (${auth.user.uid}, ${intent.phrase}, ${intent.weight}, ${intent.displayOrder ?? i})
        `;
      }
    });

    return NextResponse.json({ data: { count: intentions.length } });
  } catch (err) {
    console.error('[api/intentions] replace failed', err);
    return NextResponse.json({ error: 'failed to save intentions' }, { status: 500 });
  }
}
