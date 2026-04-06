import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generatePlayerCardImage, type CardStyle } from '@/lib/images/card-generator';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/players/card
 *  Generate a player card image via best available engine
 *  (Ideogram 3.0 → Recraft V4 → fallback)
 *
 *  Body: { playerName, school, style? }
 *  or:   { playerId, style? }
 * ────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || token !== PIPELINE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { playerName, school, playerId, style = 'gold' } = body as {
      playerName?: string;
      school?: string;
      playerId?: number;
      style?: CardStyle;
    };

    if (!sql) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

    // Resolve player data
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

    // Generate card
    const card = await generatePlayerCardImage(
      player.name,
      player.position,
      player.school,
      Number(player.grade),
      player.tie_grade || 'Ungraded',
      Number(player.projected_round),
      player.nfl_comparison || undefined,
      style,
    );

    if (!card) {
      return NextResponse.json({
        error: 'No image engine available. Set IDEOGRAM_API_KEY or RECRAFT_API_KEY.',
      }, { status: 503 });
    }

    // Save card URL to player record
    await sql`
      UPDATE perform_players
      SET analyst_notes = COALESCE(analyst_notes, '') || ${'\n[card] ' + card.engine + ': ' + card.url},
          updated_at = NOW()
      WHERE id = ${player.id}
    `;

    return NextResponse.json({
      playerName: player.name,
      position: player.position,
      school: player.school,
      grade: player.grade,
      card,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Card generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
