import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const EDU_ANG_BASE = 'https://edu-ang-939270059361.us-central1.run.app';

/**
 * GET /api/enrollments — Fetch affiliate links for the default category (mindedge)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required', code: 'OWNER_ONLY' }, { status: 403 });
  }

  const category = request.nextUrl.searchParams.get('category') || 'mindedge';

  try {
    const res = await fetch(`${EDU_ANG_BASE}/links/${encodeURIComponent(category)}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'External service temporarily unavailable' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'External service temporarily unavailable' },
      { status: 502 },
    );
  }
}

/**
 * POST /api/enrollments — Record an enrollment conversion
 * Body: { sku, course, revenue, source_utm }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required', code: 'OWNER_ONLY' }, { status: 403 });
  }

  const body = await request.json();
  const { sku, course, revenue, source_utm } = body;

  if (!sku || !course) {
    return NextResponse.json({ error: 'sku and course are required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${EDU_ANG_BASE}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ sku, course, revenue: revenue || 0, source_utm: source_utm || '' }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'External service temporarily unavailable' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'External service temporarily unavailable' },
      { status: 502 },
    );
  }
}
