import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateImage } from '@/lib/images/gateway';
import { savePlayerCard } from '@/lib/images/storage';
import {
  buildCardPrompt,
  pickStyleByGrade,
  type CardVariation,
} from '@/lib/images/card-styles';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/players/card/batch
 *  Generates dual-state cards for the top N ranked prospects.
 *
 *  Body:
 *    { limit?: number, startRank?: number, variation?: CardVariation | 'auto' }
 *
 *  Defaults: limit=10, startRank=1, variation='auto' (by grade band)
 *  Returns per-player: { rank, name, grade, variation, locked, reveal }
 * ────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || token !== PIPELINE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sql) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(50, Math.max(1, body.limit ?? 10));
    const startRank = Math.max(1, body.startRank ?? 1);
    const forcedVariation: CardVariation | 'auto' = body.variation ?? 'auto';

    const players = await sql`
      SELECT id, name, school, position, grade, tie_grade, projected_round, trend, nfl_comparison, overall_rank
      FROM perform_players
      WHERE class_year = '2026' AND overall_rank >= ${startRank}
      ORDER BY overall_rank ASC
      LIMIT ${limit}
    `;

    const results: Array<{
      rank: number;
      name: string;
      position: string;
      school: string;
      grade: number;
      variation: string;
      locked?: { url: string | null; engine?: string; cost?: string };
      reveal?: { url: string | null; engine?: string; cost?: string };
      error?: string;
    }> = [];

    let idx = 0;
    for (const player of players) {
      idx++;
      try {
        const input = {
          name: player.name,
          position: player.position,
          school: player.school,
          jerseyNumber: '7',
          grade: Number(player.grade),
          tieGrade: player.tie_grade || 'Ungraded',
          projectedRound: Number(player.projected_round),
          nflComparison: player.nfl_comparison || undefined,
          trend: player.trend as 'rising' | 'falling' | 'steady' | undefined,
        };

        const chosen = forcedVariation === 'auto'
          ? pickStyleByGrade(input.grade)
          : forcedVariation;

        const slugBase = `${player.name}-${chosen}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // LOCKED state
        const lockedSpec = buildCardPrompt(chosen, { ...input, state: 'locked' });
        const lockedResult = await generateImage({
          prompt: lockedSpec.prompt,
          engine: lockedSpec.engine === 'ideogram' ? 'ideogram' : 'recraft',
          preferText: lockedSpec.engine === 'ideogram',
          aspectRatio: lockedSpec.aspectRatio,
          negativePrompt: lockedSpec.negativePrompt,
        });

        // REVEAL state
        const revealSpec = buildCardPrompt(chosen, { ...input, state: 'reveal' });
        const revealResult = await generateImage({
          prompt: revealSpec.prompt,
          engine: revealSpec.engine === 'ideogram' ? 'ideogram' : 'recraft',
          preferText: revealSpec.engine === 'ideogram',
          aspectRatio: revealSpec.aspectRatio,
          negativePrompt: revealSpec.negativePrompt,
        });

        const lockedPath = lockedResult
          ? await savePlayerCard(lockedResult.url, `${slugBase}-locked`)
          : null;
        const revealPath = revealResult
          ? await savePlayerCard(revealResult.url, `${slugBase}-reveal`)
          : null;

        const lockedUrl = lockedPath ? `https://perform.foai.cloud${lockedPath}` : lockedResult?.url || null;
        const revealUrl = revealPath ? `https://perform.foai.cloud${revealPath}` : revealResult?.url || null;

        // Persist both URLs to the player record
        if (lockedUrl || revealUrl) {
          await sql`
            UPDATE perform_players
            SET analyst_notes = COALESCE(analyst_notes, '') || ${'\n[card:' + chosen + '] locked=' + lockedUrl + ' reveal=' + revealUrl},
                updated_at = NOW()
            WHERE id = ${player.id}
          `;
        }

        results.push({
          rank: Number(player.overall_rank) || (startRank + idx - 1),
          name: player.name,
          position: player.position,
          school: player.school,
          grade: Number(player.grade),
          variation: chosen,
          locked: { url: lockedUrl, engine: lockedResult?.engine, cost: lockedResult?.cost },
          reveal: { url: revealUrl, engine: revealResult?.engine, cost: revealResult?.cost },
        });
      } catch (err) {
        results.push({
          rank: startRank + idx - 1,
          name: player.name,
          position: player.position,
          school: player.school,
          grade: Number(player.grade),
          variation: 'error',
          error: err instanceof Error ? err.message : 'unknown',
        });
      }
    }

    const succeeded = results.filter(r => r.locked?.url && r.reveal?.url).length;
    return NextResponse.json({
      message: `Batch complete: ${succeeded}/${results.length} dual-state cards generated`,
      limit,
      startRank,
      succeeded,
      failed: results.length - succeeded,
      results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Batch card generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
