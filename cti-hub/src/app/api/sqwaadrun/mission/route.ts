import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/sqwaadrun/mission
 * Dispatches a mission to the Sqwaadrun gateway. Accepts either:
 *   { intent, targets[], config }  — natural-language intent
 *   { type, targets[], config }    — typed mission
 */
export async function POST(req: NextRequest) {
  const baseUrl = process.env.SQWAADRUN_GATEWAY_URL || 'http://localhost:7700';
  const apiKey = process.env.SQWAADRUN_API_KEY || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const endpoint = body.type ? '/mission' : '/scrape';

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const result = await res.json();
    return NextResponse.json(result, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'gateway unreachable' },
      { status: 503 },
    );
  }
}
