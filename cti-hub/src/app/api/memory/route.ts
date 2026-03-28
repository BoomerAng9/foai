import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { recallAll } from '@/lib/memory/recall';
import { storeMemory } from '@/lib/memory/store';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) return null;
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const query = request.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ error: 'q param required' }, { status: 400 });

  const results = await recallAll(userId, query);
  return NextResponse.json({ results });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { content, summary, source_type } = await request.json();
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const memory = await storeMemory(userId, content, summary, source_type);
  return NextResponse.json({ memory });
}
