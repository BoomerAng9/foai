import { NextResponse, type NextRequest } from 'next/server';
import { sql, requireDb } from '@/lib/db';
import { getAdminAuth } from '@/lib/firebase/admin';
import { WaitlistPostSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const AUTH_COOKIE = 'firebase-auth-token';

/**
 * POST /api/waitlist
 * Body: { regionId: string; email: string; source?: string }
 *
 * Auth-gated mutation. Accepts a Firebase session cookie (set by
 * /api/auth/session after client sign-in) and records the caller on
 * the named region's waitlist. Idempotent: UNIQUE(region_id, email)
 * at the DB layer returns 409 rather than duplicating.
 *
 * Unauth signups route through POST /api/waitlist/anonymous (Phase 3
 * addition — same insert shape minus user_id, more rate-limited).
 */
export async function POST(request: NextRequest) {
  const guard = requireDb();
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  // Auth — verify the session cookie.
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  }

  let userId: string;
  let userEmail: string | null = null;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(token, true);
    userId = decoded.uid;
    userEmail = decoded.email ?? null;
  } catch {
    return NextResponse.json({ error: 'invalid session' }, { status: 401 });
  }

  // Body validation.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const parsed = WaitlistPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { regionId, email, source } = parsed.data;

  // If the authenticated user has an email on file, prefer it. Otherwise
  // accept the email from the body. This prevents signing up arbitrary
  // third-party addresses under a hijacked session.
  const effectiveEmail = userEmail ?? email;
  if (userEmail && userEmail.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json(
      { error: 'email must match the authenticated user' },
      { status: 403 },
    );
  }

  // Verify the region exists — 404 rather than letting the FK raise.
  const regionCheck = await sql!<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM coming_soon_regions WHERE region_id = ${regionId}) AS exists
  `;
  if (!regionCheck[0]?.exists) {
    return NextResponse.json({ error: 'region not found' }, { status: 404 });
  }

  try {
    const result = await sql!<{ waitlistId: string; createdAt: Date }[]>`
      INSERT INTO region_waitlist (region_id, user_id, email, source)
      VALUES (${regionId}, ${userId}, ${effectiveEmail}, ${source ?? null})
      RETURNING waitlist_id AS "waitlistId", created_at AS "createdAt"
    `;

    const inserted = result[0];
    if (!inserted) {
      return NextResponse.json({ error: 'insert failed' }, { status: 500 });
    }

    return NextResponse.json(
      {
        data: {
          waitlistId: inserted.waitlistId,
          regionId,
          email: effectiveEmail,
          createdAt: inserted.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    // Postgres unique_violation = already on waitlist. Treat as success-ish.
    const isUniqueViolation =
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === '23505';

    if (isUniqueViolation) {
      return NextResponse.json(
        { error: 'already on waitlist for this region' },
        { status: 409 },
      );
    }

    console.error('[api/waitlist] insert failed', err);
    return NextResponse.json({ error: 'waitlist insert failed' }, { status: 500 });
  }
}
