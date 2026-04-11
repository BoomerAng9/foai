import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateImage } from '@/lib/images/gateway';
import { savePlayerCard } from '@/lib/images/storage';
import {
  buildCardPrompt,
  pickStyleByGrade,
  type CardVariation,
  listCardVariations,
} from '@/lib/images/card-styles';
import { safeCompare } from '@/lib/auth-guard';

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
  if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
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

        // Persist to public/generated/card/
        let publicUrl: string | null = null;
        if (result?.url) {
          const slug = `${player.name}-${v.id}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const savedPath = await savePlayerCard(result.url, slug);
          publicUrl = savedPath ? `https://perform.foai.cloud${savedPath}` : result.url;
        }

        results.push({
          variation: v.id,
          url: publicUrl,
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

    // Single variation mode — generates BOTH locked and reveal states
    const chosenVariation = variation && variation !== 'auto'
      ? variation
      : pickStyleByGrade(input.grade);

    const slugBase = `${player.name}-${chosenVariation}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Generate LOCKED state (classified dossier aesthetic, brand colors, no identity)
    const lockedSpec = buildCardPrompt(chosenVariation, { ...input, state: 'locked' });
    const lockedResult = await generateImage({
      prompt: lockedSpec.prompt,
      engine: lockedSpec.engine === 'ideogram' ? 'ideogram' : 'recraft',
      preferText: lockedSpec.engine === 'ideogram',
      aspectRatio: lockedSpec.aspectRatio,
      negativePrompt: lockedSpec.negativePrompt,
    });

    // Generate REVEAL state (actual team colors, identity shown)
    const revealSpec = buildCardPrompt(chosenVariation, { ...input, state: 'reveal' });
    const revealResult = await generateImage({
      prompt: revealSpec.prompt,
      engine: revealSpec.engine === 'ideogram' ? 'ideogram' : 'recraft',
      preferText: revealSpec.engine === 'ideogram',
      aspectRatio: revealSpec.aspectRatio,
      negativePrompt: revealSpec.negativePrompt,
    });

    if (!lockedResult && !revealResult) {
      return NextResponse.json({
        error: 'Card generation failed on all engines for both states',
      }, { status: 503 });
    }

    // Save both to permanent storage
    const lockedPath = lockedResult
      ? await savePlayerCard(lockedResult.url, `${slugBase}-locked`)
      : null;
    const revealPath = revealResult
      ? await savePlayerCard(revealResult.url, `${slugBase}-reveal`)
      : null;

    const lockedUrl = lockedPath ? `https://perform.foai.cloud${lockedPath}` : lockedResult?.url;
    const revealUrl = revealPath ? `https://perform.foai.cloud${revealPath}` : revealResult?.url;

    // Save card URLs to player record
    await sql`
      UPDATE perform_players
      SET analyst_notes = COALESCE(analyst_notes, '') || ${'\n[card:' + chosenVariation + '] locked=' + lockedUrl + ' reveal=' + revealUrl},
          updated_at = NOW()
      WHERE id = ${player.id}
    `;

    return NextResponse.json({
      playerName: player.name,
      position: player.position,
      school: player.school,
      grade: player.grade,
      variation: chosenVariation,
      card: {
        locked: {
          url: lockedUrl,
          savedPath: lockedPath,
          engine: lockedResult?.engine,
          cost: lockedResult?.cost,
        },
        reveal: {
          url: revealUrl,
          savedPath: revealPath,
          engine: revealResult?.engine,
          cost: revealResult?.cost,
        },
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Card generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
