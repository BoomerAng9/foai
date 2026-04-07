import { NextRequest, NextResponse } from 'next/server';
import { getForm, listSubmissions, paperformAvailable } from '@/lib/paperform/client';

/* ──────────────────────────────────────────────────────────────
 *  GET /api/forms/[slug]
 *  Query:
 *    withSubmissions=1 — also return latest submissions (auth required)
 *
 *  Returns: { form, submissions?, available }
 * ────────────────────────────────────────────────────────────── */

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const withSubmissions = url.searchParams.get('withSubmissions') === '1';

  if (!paperformAvailable()) {
    return NextResponse.json(
      { error: 'Paperform not configured', available: false },
      { status: 503 },
    );
  }

  const form = await getForm(slug);
  if (!form) {
    return NextResponse.json({ error: `Form ${slug} not found` }, { status: 404 });
  }

  let submissions = undefined;
  if (withSubmissions) {
    submissions = await listSubmissions(slug, { limit: 25 });
  }

  return NextResponse.json({ form, submissions, available: true });
}
