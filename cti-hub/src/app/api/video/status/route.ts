import { NextRequest, NextResponse } from 'next/server';
import { checkShotStatus } from '@/lib/video/pipeline';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id param required' }, { status: 400 });

  try {
    const status = await checkShotStatus(id);
    return NextResponse.json(status);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Status check failed' }, { status: 500 });
  }
}
