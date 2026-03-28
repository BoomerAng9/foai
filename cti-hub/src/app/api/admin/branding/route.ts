import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedRequest, requireRole } from '@/lib/server-auth';
import { applyRateLimit } from '@/lib/rate-limit';
import { sql } from '@/lib/insforge';

export const revalidate = 300;

const defaultBranding = {
  system_name: 'GRAMMAR',
  tagline: 'Governed Action Runtime',
  primary_color: '#00A3FF',
  accent_color: '#A855F7',
  logo_url: '',
  favicon_url: '',
};

export async function GET() {
  try {
    if (!sql) {
      return NextResponse.json({ data: defaultBranding }, {
        headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
      });
    }

    const rows = await sql`SELECT * FROM system_config WHERE id = 'global' LIMIT 1`;
    const data = rows[0] ?? defaultBranding;

    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ data: defaultBranding }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedRequest(request);
    if (!authResult.ok) return authResult.response;

    const roleResponse = requireRole(authResult.context, ['admin', 'operator']);
    if (roleResponse) return roleResponse;

    const rateLimitResponse = applyRateLimit(request, 'branding-update', {
      maxRequests: 10,
      windowMs: 10 * 60 * 1000,
      subject: authResult.context.user.uid,
    });
    if (rateLimitResponse) return rateLimitResponse;

    if (!sql) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const payload = await request.json();

    await sql`
      UPDATE system_config SET
        system_name = ${payload.systemName},
        tagline = ${payload.tagline},
        primary_color = ${payload.primaryColor},
        accent_color = ${payload.accentColor},
        logo_url = ${payload.logoUrl},
        favicon_url = ${payload.faviconUrl},
        updated_at = NOW()
      WHERE id = 'global'
    `;

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save branding config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
