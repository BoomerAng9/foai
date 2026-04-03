import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

/**
 * GET /api/perform/nft — Generate NFT metadata for top 40 draft prospects
 * GET /api/perform/nft?id=1 — Get single player NFT metadata
 *
 * Each NFT card contains:
 * - Player name, school, position
 * - Per|Form grade, projected round, NFL comparison
 * - Scouting summary
 * - Unique token ID based on rank
 * - Per|Form + Deploy Platform branding
 */

const COLLECTION_NAME = 'Per|Form 2026 NFL Draft Collection';
const COLLECTION_DESCRIPTION = 'Official Per|Form 2026 NFL Draft prospect cards. Each card represents a real prospect graded by Scout_Ang and the Per|Form analyst team. First-round talent, digitally certified.';

function gradeToTier(grade: number): { tier: string; color: string; rarity: string } {
  if (grade >= 88) return { tier: 'Elite', color: '#E8A020', rarity: 'Legendary' };
  if (grade >= 83) return { tier: 'Blue Chip', color: '#3B82F6', rarity: 'Epic' };
  if (grade >= 78) return { tier: 'Starter', color: '#10B981', rarity: 'Rare' };
  return { tier: 'Prospect', color: '#8B5CF6', rarity: 'Common' };
}

function buildNFTMetadata(player: any, tokenId: number) {
  const tier = gradeToTier(parseFloat(player.grade));

  return {
    name: `${player.name} — Per|Form Draft Card #${tokenId}`,
    description: `${player.position} | ${player.school} | ${tier.tier} Tier | Grade: ${player.grade} | Projected Round ${player.projected_round}\n\n${player.key_stats || ''}\n\nNFL Comparison: ${player.nfl_comparison || 'N/A'}\n\nScouted by Scout_Ang on The Deploy Platform.`,
    image: `https://deploy.foai.cloud/api/perform/nft/card/${tokenId}`,
    external_url: `https://deploy.foai.cloud/plug/perform`,
    attributes: [
      { trait_type: 'Player', value: player.name },
      { trait_type: 'School', value: player.school },
      { trait_type: 'Position', value: player.position },
      { trait_type: 'Grade', value: parseFloat(player.grade), display_type: 'number' },
      { trait_type: 'Projected Round', value: player.projected_round, display_type: 'number' },
      { trait_type: 'Overall Rank', value: player.overall_rank, display_type: 'number' },
      { trait_type: 'Tier', value: tier.tier },
      { trait_type: 'Rarity', value: tier.rarity },
      { trait_type: 'NFL Comparison', value: player.nfl_comparison || 'N/A' },
      { trait_type: 'Draft Class', value: '2026' },
      { trait_type: 'Collection', value: COLLECTION_NAME },
      { trait_type: 'Analyst', value: 'Scout_Ang' },
      { trait_type: 'Platform', value: 'Per|Form by The Deploy Platform' },
    ],
    properties: {
      tier: tier.tier,
      tier_color: tier.color,
      rarity: tier.rarity,
      collection: COLLECTION_NAME,
      draft_class: 2026,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

    const playerId = req.nextUrl.searchParams.get('id');
    const all = req.nextUrl.searchParams.get('all');

    if (playerId) {
      // Single player NFT metadata
      const players = await sql`SELECT * FROM perform_players WHERE id = ${parseInt(playerId)} AND class = '2026'`;
      if (players.length === 0) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      return NextResponse.json(buildNFTMetadata(players[0], parseInt(playerId)));
    }

    // Full collection — top 40
    const players = await sql`SELECT * FROM perform_players WHERE class = '2026' AND overall_rank <= 40 ORDER BY overall_rank ASC`;

    if (players.length === 0) {
      return NextResponse.json({
        error: 'No players in database. Call POST /api/perform/seed-board first.',
        hint: 'Seed the 2026 draft board to generate NFT metadata.',
      }, { status: 404 });
    }

    const collection = {
      name: COLLECTION_NAME,
      description: COLLECTION_DESCRIPTION,
      total_supply: players.length,
      draft_class: 2026,
      tiers: {
        elite: players.filter(p => parseFloat(p.grade) >= 88).length,
        blue_chip: players.filter(p => parseFloat(p.grade) >= 83 && parseFloat(p.grade) < 88).length,
        starter: players.filter(p => parseFloat(p.grade) >= 78 && parseFloat(p.grade) < 83).length,
        prospect: players.filter(p => parseFloat(p.grade) < 78).length,
      },
      cards: players.map((p, i) => buildNFTMetadata(p, p.id)),
    };

    return NextResponse.json(collection);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'NFT metadata generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
