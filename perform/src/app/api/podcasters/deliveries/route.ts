import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/db';

/**
 * GET /api/podcasters/deliveries — Fetch recent DMAIC-graded deliveries
 * Query params: ?limit=5
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  if (!sql) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get('limit') || '10', 10),
    50,
  );

  const user = await sql`
    SELECT id FROM podcaster_users WHERE firebase_uid = ${auth.userId}
  `;

  if (user.length === 0) {
    return NextResponse.json({ deliveries: [] });
  }

  const userId = user[0].id;

  const deliveries = await sql`
    SELECT
      id, deliverable_id, deliverable_type, tier_at_delivery,
      completeness_score, accuracy_score, formatting_passed,
      final_score, grade, action, graded_at
    FROM podcaster_deliverable_audit
    WHERE user_id = ${userId}
    ORDER BY graded_at DESC
    LIMIT ${limit}
  `;

  return NextResponse.json({ deliveries });
}
