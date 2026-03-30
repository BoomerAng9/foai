import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const EDU_ANG_BASE = 'https://edu-ang-939270059361.us-central1.run.app';

/**
 * POST /api/enrollments/links — Create a new affiliate link
 * Body: { category, base_url, sku, course_name }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required', code: 'OWNER_ONLY' }, { status: 403 });
  }

  const body = await request.json();
  const { category, base_url, sku, course_name } = body;

  if (!category || !base_url || !sku || !course_name) {
    return NextResponse.json(
      { error: 'category, base_url, sku, and course_name are all required' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${EDU_ANG_BASE}/links/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ category, base_url, sku, course_name }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: 'Upstream service error' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to reach upstream service' },
      { status: 502 },
    );
  }
}
