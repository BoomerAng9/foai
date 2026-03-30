import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { recallAll } from '@/lib/memory/recall';
import { storeMemory } from '@/lib/memory/store';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const query = request.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ error: 'q param required' }, { status: 400 });

  const results = await recallAll(auth.userId, query);
  return NextResponse.json({ results });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { content, summary, source_type } = await request.json();
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const memory = await storeMemory(auth.userId, content, summary, source_type);
  return NextResponse.json({ memory });
}
