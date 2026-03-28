import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { createSource, getSources, deleteSource } from '@/lib/memory/sources';

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

  const sources = await getSources(userId);
  return NextResponse.json({ sources });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, source_type, content, url, metadata } = await request.json();
  if (!name || !source_type) return NextResponse.json({ error: 'name and source_type required' }, { status: 400 });

  const source = await createSource(userId, name, source_type, content, url, undefined, metadata);
  return NextResponse.json({ source });
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteSource(id, userId);
  return NextResponse.json({ ok: true });
}
