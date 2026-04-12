import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

/* ── Ensure table exists (idempotent) ─────────────────────────── */

let tableReady = false;

async function ensureTable() {
  if (tableReady || !sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS circuit_box_toggles (
      user_id   TEXT NOT NULL,
      component TEXT NOT NULL,
      enabled   BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, component)
    )
  `;
  tableReady = true;
}

/* ── GET — return all toggle states for the user ──────────────── */

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!sql) return NextResponse.json({ toggles: {} });

  try {
    await ensureTable();

    const rows = await sql`
      SELECT component, enabled FROM circuit_box_toggles
      WHERE user_id = ${auth.userId}
    `;

    const toggles: Record<string, boolean> = {};
    for (const r of rows) {
      toggles[r.component] = r.enabled;
    }

    return NextResponse.json({ toggles });
  } catch {
    return NextResponse.json({ toggles: {} });
  }
}

/* ── POST — set a component's toggle state ────────────────────── */

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body?.component || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'Missing component or enabled field' }, { status: 400 });
  }

  try {
    await ensureTable();

    await sql`
      INSERT INTO circuit_box_toggles (user_id, component, enabled, updated_at)
      VALUES (${auth.userId}, ${body.component}, ${body.enabled}, now())
      ON CONFLICT (user_id, component)
      DO UPDATE SET enabled = ${body.enabled}, updated_at = now()
    `;

    return NextResponse.json({ ok: true, component: body.component, enabled: body.enabled });
  } catch {
    return NextResponse.json({ error: 'Failed to save toggle state' }, { status: 500 });
  }
}
