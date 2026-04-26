/**
 * GET /api/sqwaadrun/my-key?session_id=cs_...
 *
 * One-time retrieval of the plaintext `sqr_live_*` API key issued when
 * a customer completed Stripe Checkout. The webhook handler stashes
 * the plaintext in `sqwaadrun_key_handoffs` keyed by stripe_session_id.
 *
 * First call returns { apiKey }. The row's `plaintext_key` is NULLed
 * and `retrieved_at` set. Subsequent calls return { apiKey: null }.
 *
 * Authenticated via Firebase ID token; user_id on the handoff row
 * must match the caller to prevent key theft across customers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { sql } from '@/lib/insforge';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing Authorization Bearer token' },
      { status: 401 },
    );
  }
  const idToken = authHeader.slice(7);

  let userId: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    userId = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired ID token' },
      { status: 401 },
    );
  }

  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json(
      { error: 'session_id query param required' },
      { status: 400 },
    );
  }

  if (!sql) {
    return NextResponse.json(
      { error: 'Database unavailable' },
      { status: 503 },
    );
  }

  const rows = await sql<
    {
      plaintext_key: string | null;
      user_id: string;
      retrieved_at: string | null;
      api_key_row_id: string;
    }[]
  >`
    SELECT plaintext_key, user_id, retrieved_at, api_key_row_id
    FROM sqwaadrun_key_handoffs
    WHERE stripe_session_id = ${sessionId}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ apiKey: null, status: 'not_found' });
  }
  if (row.user_id !== userId) {
    return NextResponse.json(
      { error: 'Session does not belong to this user' },
      { status: 403 },
    );
  }
  if (row.retrieved_at) {
    return NextResponse.json({
      apiKey: null,
      status: 'already_retrieved',
      retrievedAt: row.retrieved_at,
    });
  }
  if (!row.plaintext_key) {
    return NextResponse.json({ apiKey: null, status: 'cleared' });
  }

  // Burn the handoff — NULL the plaintext and stamp retrieved_at atomically
  await sql`
    UPDATE sqwaadrun_key_handoffs
    SET plaintext_key = NULL,
        retrieved_at = NOW()
    WHERE stripe_session_id = ${sessionId}
      AND retrieved_at IS NULL
  `;

  return NextResponse.json({
    apiKey: row.plaintext_key,
    apiKeyRowId: row.api_key_row_id,
    status: 'delivered',
  });
}
