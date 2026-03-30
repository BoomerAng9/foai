import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

const EDU_ANG_BASE = 'https://edu-ang-939270059361.us-central1.run.app';

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
 * POST /api/enrollments/links — Create a new affiliate link
 * Body: { category, base_url, sku, course_name }
 */
export async function POST(request: NextRequest) {
  const userId = await getCallerId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        { error: 'Upstream error', detail: text },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to reach edu-ang service', detail: String(err) },
      { status: 502 },
    );
  }
}
