import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const SCOUT_ANG_BASE = process.env.SCOUT_ANG_URL || '';

/**
 * GET /api/seats — Proxy to Scout_Ang /seats?tenant_id=cti
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required', code: 'OWNER_ONLY' }, { status: 403 });
  }

  const limit = request.nextUrl.searchParams.get('limit') || '100';
  const institution = request.nextUrl.searchParams.get('institution') || '';

  try {
    const url = new URL('/seats', SCOUT_ANG_BASE);
    url.searchParams.set('tenant_id', 'cti');
    url.searchParams.set('limit', limit);
    if (institution) url.searchParams.set('institution', institution);

    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'External service temporarily unavailable' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'External service temporarily unavailable' },
      { status: 502 }
    );
  }
}

/**
 * POST /api/seats — Trigger a new scrape via Scout_Ang /scrape
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required', code: 'OWNER_ONLY' }, { status: 403 });
  }

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // empty body is fine
    }

    const res = await fetch(`${SCOUT_ANG_BASE}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ tenant_id: 'cti', ...body }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'External service temporarily unavailable' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'External service temporarily unavailable' },
      { status: 502 }
    );
  }
}
