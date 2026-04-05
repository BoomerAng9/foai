import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { createPlug, listPlugs } from '@/lib/plugs/engine';

/**
 * GET /api/plugs — List plugs (published marketplace or user's own)
 * POST /api/plugs — Create a new plug (owner only initially)
 */

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const mine = searchParams.get('mine') === 'true';
  const category = searchParams.get('category') || undefined;

  const plugs = mine
    ? await listPlugs({ ownerId: auth.userId })
    : await listPlugs({ published: true, category });

  return NextResponse.json({ plugs });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { name, slug, description, system_prompt, model, category, icon_url, tools, settings, price_monthly } = body;

  if (!name || !slug || !system_prompt) {
    return NextResponse.json({ error: 'name, slug, and system_prompt are required' }, { status: 400 });
  }

  // Sanitize slug
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 60);

  const plug = await createPlug(auth.userId, {
    name, slug: cleanSlug, description, system_prompt, model, category, icon_url, tools, settings, price_monthly,
  });

  if (!plug) {
    return NextResponse.json({ error: 'Failed to create plug. Slug may already exist.' }, { status: 400 });
  }

  return NextResponse.json({ plug }, { status: 201 });
}
