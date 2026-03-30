import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { createSource, getSources, deleteSource } from '@/lib/memory/sources';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const sources = await getSources(auth.userId);
  return NextResponse.json({ sources });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { name, source_type, content, url, metadata } = await request.json();
  if (!name || !source_type) return NextResponse.json({ error: 'name and source_type required' }, { status: 400 });

  const source = await createSource(auth.userId, name, source_type, content, url, undefined, metadata);
  return NextResponse.json({ source });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteSource(id, auth.userId);
  return NextResponse.json({ ok: true });
}
