import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { checkShotStatus } from '@/lib/video/pipeline';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id param required' }, { status: 400 });

  try {
    const status = await checkShotStatus(id);
    return NextResponse.json(status);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Status check failed' }, { status: 500 });
  }
}
