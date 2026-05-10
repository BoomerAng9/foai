/**
 * GET /api/rankings/stream
 * =========================
 * Server-Sent Events endpoint that pushes live rankings updates during the draft.
 *
 * Behaviour:
 *   1. On connect, sends a `snapshot` event containing the current Top 300 board.
 *   2. On every successful POST to /api/draft/pick, sends a `pick` event.
 *   3. Heartbeats every 15s to keep proxies/CDNs from closing the connection.
 *
 * Subscribers are tracked in lib/events/rankings-emitter.ts as an in-process Set;
 * cross-instance fanout is intentionally deferred — single Cloud Run instance is
 * the documented draft-week deployment.
 *
 * Auth: public, browse-first. Same preview rules as GET /api/players (preview
 * columns only — name, school, position, ranks, grade, tie_tier, projected_round).
 */

import type { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { subscribe, type RankingsEvent } from '@/lib/events/rankings-emitter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PREVIEW_COLUMNS = `
  perform_players.id,
  perform_players.name,
  perform_players.school,
  perform_players.position,
  perform_players.class_year,
  perform_players.height,
  perform_players.weight,
  perform_players.overall_rank,
  perform_players.position_rank,
  perform_players.projected_round,
  perform_players.grade,
  perform_players.tie_grade,
  perform_players.tie_tier,
  perform_players.nfl_comparison,
  perform_players.trend,
  perform_players.drafted_by_team,
  perform_players.drafted_pick_number,
  perform_players.drafted_round,
  perform_players.drafted_at,
  perform_players.attribute_ratings,
  perform_players.attribute_badges,
  perform_players.versatility_flex,
  perform_players.prime_sub_tags,
  cr.consensus_drafttek,
  cr.consensus_yahoo,
  cr.consensus_ringer,
  cr.consensus_avg,
  cr.consensus_pff,
  cr.consensus_espn,
  cr.consensus_nflcom
`.replace(/\s+/g, ' ').trim();

const CONSENSUS_JOIN_SQL = `
  LEFT JOIN LATERAL (
    SELECT
      MAX(rank) FILTER (WHERE source = 'drafttek')      AS consensus_drafttek,
      MAX(rank) FILTER (WHERE source = 'yahoo')         AS consensus_yahoo,
      MAX(rank) FILTER (WHERE source = 'ringer')        AS consensus_ringer,
      MAX(rank) FILTER (WHERE source = 'consensus_avg') AS consensus_avg,
      MAX(rank) FILTER (WHERE source = 'pff')           AS consensus_pff,
      MAX(rank) FILTER (WHERE source = 'espn')          AS consensus_espn,
      MAX(rank) FILTER (WHERE source = 'nflcom')        AS consensus_nflcom
    FROM perform_consensus_ranks
    WHERE player_id = perform_players.id
  ) cr ON TRUE
`;

function sseFormat(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(_req: NextRequest): Promise<Response> {
  if (!sql) {
    return new Response('Database not configured', { status: 503 });
  }

  // Pull the snapshot first so we can include it in the initial frame
  const snapshot = await sql.unsafe(
    `SELECT ${PREVIEW_COLUMNS} FROM perform_players ${CONSENSUS_JOIN_SQL} WHERE overall_rank IS NOT NULL ORDER BY overall_rank ASC LIMIT 300`,
  );

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false;

      const send = (chunk: string): void => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          isClosed = true;
        }
      };

      // Initial snapshot
      send(sseFormat('snapshot', { count: snapshot.length, players: snapshot, ts: Date.now() }));

      // Subscribe to live events
      const unsubscribe = subscribe((event: RankingsEvent) => {
        send(sseFormat(event.type, event));
      });

      // Heartbeat every 15s — protects against idle-connection timeout on CDNs
      const heartbeat = setInterval(() => {
        send(sseFormat('heartbeat', { ts: Date.now() }));
      }, 15_000);

      // Teardown when the client disconnects (controller errors on enqueue)
      // Also fire when the runtime aborts the request
      const teardown = (): void => {
        isClosed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      };

      // Best-effort cleanup if the client goes away
      _req.signal.addEventListener('abort', teardown);
    },
    cancel() {
      // Stream cancellation triggers the abort above
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
