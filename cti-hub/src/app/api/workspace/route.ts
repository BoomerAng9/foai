import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { getAdminAuth } from '@/lib/firebase-admin';

async function getCallerId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) return null;
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * GET /api/workspace — List current user's jobs
 * POST /api/workspace — Create a new job record
 * PATCH /api/workspace — Update a job (status, output)
 */
export async function GET(request: NextRequest) {
  const userId = await getCallerId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
  const rows = await sql`
    SELECT * FROM workspace_jobs
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return NextResponse.json({ jobs: rows });
}

export async function POST(request: NextRequest) {
  const userId = await getCallerId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { job_type, input } = await request.json();
  if (!job_type) return NextResponse.json({ error: 'job_type required' }, { status: 400 });

  const rows = await sql`
    INSERT INTO workspace_jobs (user_id, job_type, status, input)
    VALUES (${userId}, ${job_type}, 'running', ${JSON.stringify(input || {})})
    RETURNING *
  `;

  return NextResponse.json({ job: rows[0] });
}

export async function PATCH(request: NextRequest) {
  const userId = await getCallerId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { id, status, output, model_used, tokens_in, tokens_out, cost_usd } = await request.json();
  if (!id) return NextResponse.json({ error: 'job id required' }, { status: 400 });

  const rows = await sql`
    UPDATE workspace_jobs SET
      status = COALESCE(${status ?? null}, status),
      output = COALESCE(${output ? JSON.stringify(output) : null}::jsonb, output),
      model_used = COALESCE(${model_used ?? null}, model_used),
      tokens_in = COALESCE(${tokens_in ?? null}, tokens_in),
      tokens_out = COALESCE(${tokens_out ?? null}, tokens_out),
      cost_usd = COALESCE(${cost_usd ?? null}, cost_usd),
      completed_at = CASE WHEN ${status ?? null} IN ('done', 'failed') THEN NOW() ELSE completed_at END
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;

  return NextResponse.json({ job: rows[0] ?? null });
}
