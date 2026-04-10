import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

/**
 * POST /api/pipeline/trigger
 * Authenticated proxy that calls /api/pipeline/run with the pipeline key.
 * This way the PIPELINE_AUTH_KEY never reaches the client.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.ok) return authResult.response;

  const pipelineKey = process.env.PIPELINE_AUTH_KEY;
  if (!pipelineKey) {
    return NextResponse.json({ error: 'Pipeline not configured' }, { status: 503 });
  }

  try {
    const origin = request.nextUrl.origin;
    const res = await fetch(`${origin}/api/pipeline/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pipelineKey}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'Pipeline trigger failed' }, { status: 500 });
  }
}
