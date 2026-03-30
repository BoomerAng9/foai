import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const orgId = request.nextUrl.searchParams.get('orgId');
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  // Policies table doesn't exist yet — return empty
  return NextResponse.json({ policies: [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { organization_id, name, description, type, rules, is_active } = body;

  if (!organization_id || !name) {
    return NextResponse.json({ error: 'organization_id and name are required' }, { status: 400 });
  }

  // Mock — return a generated policy
  const policy = {
    id: crypto.randomUUID(),
    organization_id,
    name,
    description: description ?? '',
    type: type ?? 'operational',
    rules: rules ?? [],
    is_active: is_active ?? true,
    created_at: new Date().toISOString(),
  };

  return NextResponse.json({ policy }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { id, updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  // Mock — return the merged result
  const policy = {
    id,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json({ policy });
}
