/**
 * POST /api/draft/pick
 * =====================
 * Records an NFL Draft pick event. Atomically:
 *   1. Updates `perform_players` row with `drafted_by_team`, `drafted_pick_number`,
 *      `drafted_round`, `drafted_at`, and bumps `updated_at` / `roster_updated_at`.
 *   2. The `updated_at` bump naturally invalidates any upstream URL-signed card
 *      render caches (Recraft/Ideogram asset URLs include the input hash;
 *      changing `drafted_by_team` changes the hash).
 *   3. Returns the updated player record for the caller (draft-day poller,
 *      admin panel, manual correction).
 *
 * On the next card render for this player, `buildCardPromptInputFromPlayer()`
 * in card-styles.ts will call `resolveHelmet()` which reads `drafted_by_team`
 * and returns NFL team colors → the helmet flips from college to NFL.
 *
 * Auth: PIPELINE_AUTH_KEY bearer token (same pattern as /api/seed/regrade).
 *
 * Request body:
 *   {
 *     player_id:        number,         // perform_players.id
 *     drafted_by_team:  string,         // NFL abbreviation — must match NFL_TEAMS
 *     pick_number:      number,         // 1-300
 *     round?:           number,         // 1-7, derived from pick if omitted
 *     drafted_at?:      string          // ISO timestamp, defaults to now()
 *   }
 *
 * Response 200: { ok: true, player: {...}, helmet_context: { ... } }
 * Response 400: { error: 'validation failure description' }
 * Response 401: { error: 'unauthorized' }
 * Response 404: { error: 'player not found' }
 * Response 503: { error: 'Database not configured' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, requireDb } from '@/lib/db';
import { getNflTeam } from '@/lib/draft/nfl-teams';
import { resolveHelmet } from '@/lib/images/team-helmet-resolver';
import { emitPickEvent } from '@/lib/events/rankings-emitter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function roundFromPick(pick: number): number {
  // 2026 convention — 32 picks per round 1-3, 33-36 per round 4-7 with comp picks.
  // Approximation good enough to stamp at ingest; exact round can be corrected
  // by the poller if needed.
  if (pick <= 32) return 1;
  if (pick <= 64) return 2;
  if (pick <= 100) return 3;
  if (pick <= 138) return 4;
  if (pick <= 176) return 5;
  if (pick <= 214) return 6;
  return 7;
}

export async function POST(req: NextRequest) {
  const dbCheck = requireDb();
  if (dbCheck) {
    return NextResponse.json({ error: dbCheck.error }, { status: dbCheck.status });
  }

  // Auth — same PIPELINE_AUTH_KEY pattern as /api/seed/regrade
  const auth = req.headers.get('authorization') ?? '';
  const expected = process.env.PIPELINE_AUTH_KEY ?? '';
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const player_id = Number(body.player_id);
  const drafted_by_team = typeof body.drafted_by_team === 'string' ? body.drafted_by_team.toUpperCase() : null;
  const pick_number = Number(body.pick_number);
  const round =
    typeof body.round === 'number' && body.round >= 1 && body.round <= 7
      ? body.round
      : Number.isFinite(pick_number)
        ? roundFromPick(pick_number)
        : null;
  const drafted_at =
    typeof body.drafted_at === 'string' && body.drafted_at.length > 0
      ? new Date(body.drafted_at)
      : new Date();

  // Validation
  if (!Number.isFinite(player_id) || player_id <= 0) {
    return NextResponse.json({ error: 'player_id required (positive integer)' }, { status: 400 });
  }
  if (!drafted_by_team || !getNflTeam(drafted_by_team)) {
    return NextResponse.json(
      { error: `drafted_by_team must be a valid NFL abbreviation (got ${body.drafted_by_team})` },
      { status: 400 },
    );
  }
  if (!Number.isFinite(pick_number) || pick_number < 1 || pick_number > 300) {
    return NextResponse.json({ error: 'pick_number must be an integer between 1 and 300' }, { status: 400 });
  }
  if (Number.isNaN(drafted_at.valueOf())) {
    return NextResponse.json({ error: 'drafted_at must be a valid ISO timestamp' }, { status: 400 });
  }

  // Atomic update — returns the updated row
  const updated = await sql!<Array<Record<string, unknown>>>`
    UPDATE perform_players
    SET
      drafted_by_team     = ${drafted_by_team},
      drafted_pick_number = ${pick_number},
      drafted_round       = ${round},
      drafted_at          = ${drafted_at.toISOString()},
      updated_at          = NOW()
    WHERE id = ${player_id}
    RETURNING
      id, name, school, position, jersey_number,
      grade, tie_tier,
      drafted_by_team, drafted_pick_number, drafted_round, drafted_at,
      college_color_phrase,
      updated_at
  `;

  if (updated.length === 0) {
    return NextResponse.json({ error: `player_id ${player_id} not found` }, { status: 404 });
  }

  const row = updated[0] as {
    school?: string | null;
    drafted_by_team?: string | null;
    college_color_phrase?: string | null;
  };

  // Compute the post-update helmet context so the caller (or UI hook) can
  // immediately show the NFL helmet without waiting on a separate render call.
  const helmet_context = resolveHelmet({
    school: row.school,
    drafted_by_team: row.drafted_by_team,
    college_color_phrase: row.college_color_phrase,
  });

  // Push the pick to all live SSE subscribers (rankings + big board clients)
  const u = updated[0] as Record<string, unknown>;
  emitPickEvent({
    player_id: Number(u.id),
    player_name: String(u.name ?? ''),
    position: (u.position as string | null) ?? null,
    school: (u.school as string | null) ?? null,
    drafted_by_team: drafted_by_team!,
    pick_number,
    round,
    drafted_at: drafted_at.toISOString(),
  });

  return NextResponse.json({
    ok: true,
    player: updated[0],
    helmet_context,
  });
}
