/**
 * POST /api/analysts/tick
 * ========================
 * Publisher tick. Called by Cloud Run Jobs cron (or any external scheduler).
 * Flips queued posts whose publish_at has arrived into published=TRUE and
 * stamps published_at.
 *
 * Idempotent — running the tick twice in the same minute marks no
 * additional rows (the `WHERE published = FALSE` filter guards it).
 *
 * Auth: PIPELINE_AUTH_KEY bearer token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, requireDb } from '@/lib/db';
import { safeCompare } from '@/lib/auth-guard';
import { planAllNext } from '@/lib/analysts/stagger';

const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbErr = requireDb();
  if (dbErr) return NextResponse.json(dbErr, { status: dbErr.status });

  try {
    const published = (await sql!`
      UPDATE analyst_posts
      SET published = TRUE, published_at = NOW(), updated_at = NOW()
      WHERE published = FALSE AND publish_at <= NOW()
      RETURNING id, analyst_id, title, publish_at
    `) as Array<{ id: number; analyst_id: string; title: string; publish_at: Date }>;

    return NextResponse.json({
      ok: true,
      publishedCount: published.length,
      published,
      upcoming: planAllNext().map((s) => ({
        analystId: s.analystId,
        publishAt: s.publishAt.toISOString(),
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Tick failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** GET — simple health/inspection without mutating state. */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbErr = requireDb();
  if (dbErr) return NextResponse.json(dbErr, { status: dbErr.status });

  try {
    const due = (await sql!`
      SELECT id, analyst_id, title, publish_at
      FROM analyst_posts
      WHERE published = FALSE AND publish_at <= NOW()
      ORDER BY publish_at ASC
      LIMIT 100
    `) as Array<{ id: number; analyst_id: string; title: string; publish_at: Date }>;

    const queued = (await sql!`
      SELECT analyst_id, COUNT(*)::int AS queued
      FROM analyst_posts
      WHERE published = FALSE
      GROUP BY analyst_id
    `) as Array<{ analyst_id: string; queued: number }>;

    return NextResponse.json({
      dueNow: due,
      queuedByAnalyst: queued,
      upcoming: planAllNext().map((s) => ({
        analystId: s.analystId,
        publishAt: s.publishAt.toISOString(),
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Inspect failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
