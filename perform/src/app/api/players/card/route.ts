import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateImage } from '@/lib/images/gateway';
import {
  buildCardPrompt,
  pickStyleByGrade,
  type CardVariation,
  listCardVariations,
} from '@/lib/images/card-styles';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/players/card
 *  Generate a player card in one of 12 style variations.
 *
 *  Body:
 *    { playerName | playerId, variation?: CardVariation }
 *    variation defaults: auto-picked by TIE grade
 *    set variation='all' to generate one card per style (expensive)
 *
 *  GET returns the list of available variations.
 * ────────────────────────────────────────────────────────────── */

export async function GET() {
  return NextResponse.json({
    variations: listCardVariations(),
    default: 'auto (picks by TIE grade)',
  });
}

export async function POST(req: NextRequest) {
  const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || token !== PIPELINE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { playerName, school, playerId, variation, all } = body as {
      playerName?: string;
      school?: string;
      playerId?: number;
      variation?: CardVariation | 'auto';
      all?: boolean;
    };

    if (!sql) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

    // Resolve player
    let player;
    if (playerId) {
      const rows = await sql`SELECT * FROM perform_players WHERE id = ${playerId}`;
      player = rows[0];
    } else if (playerName) {
      const rows = await sql`
        SELECT * FROM perform_players
        WHERE LOWER(name) = LOWER(${playerName})
        ${school ? sql`AND LOWER(school) = LOWER(${school})` : sql``}
        LIMIT 1
      `;
      player = rows[0];
    }

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

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

    // ALL variations mode: generate one card per style
    if (all) {
      const variations = listCardVariations();
      const results: Array<{ variation: string; url: string | null; cost: string }> = [];

      for (const v of variations) {
        const spec = buildCardPrompt(v.id, input);
        const result = await generateImage({
          prompt: spec.prompt,
          engine: spec.engine === 'ideogram' ? 'ideogram' : 'recraft',
          preferText: spec.engine === 'ideogram',
          aspectRatio: spec.aspectRatio,
          negativePrompt: spec.negativePrompt,
        });
        results.push({
          variation: v.id,
          url: result?.url || null,
          cost: result?.cost || 'failed',
        });
      }

      return NextResponse.json({
        playerName: player.name,
        position: player.position,
        school: player.school,
        grade: player.grade,
        mode: 'all_variations',
        totalCards: results.filter(r => r.url).length,
        cards: results,
      });
    }

    // Single variation mode
    const chosenVariation = variation && variation !== 'auto'
      ? variation
      : pickStyleByGrade(input.grade);

    const spec = buildCardPrompt(chosenVariation, input);

    const result = await generateImage({
      prompt: spec.prompt,
      engine: spec.engine === 'ideogram' ? 'ideogram' : 'recraft',
      preferText: spec.engine === 'ideogram',
      aspectRatio: spec.aspectRatio,
      negativePrompt: spec.negativePrompt,
    });

    if (!result) {
      return NextResponse.json({
        error: 'Card generation failed on all engines',
      }, { status: 503 });
    }

    // Save card URL to player record
    await sql`
      UPDATE perform_players
      SET analyst_notes = COALESCE(analyst_notes, '') || ${'\n[card:' + chosenVariation + '] ' + result.url},
          updated_at = NOW()
      WHERE id = ${player.id}
    `;

    return NextResponse.json({
      playerName: player.name,
      position: player.position,
      school: player.school,
      grade: player.grade,
      variation: chosenVariation,
      card: result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Card generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
