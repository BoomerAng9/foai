import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/nft/card/[id] — Generate SVG card image for a draft prospect NFT
 * Returns an SVG image that can be used as the NFT artwork.
 *
 * TIE Brand Colors: gold=#D4A853, silver=#C0C0C0, dark=#0A0A0F
 */

function gradeColor(grade: number): string {
  if (grade >= 88) return '#D4A853';
  if (grade >= 83) return '#3B82F6';
  if (grade >= 78) return '#10B981';
  return '#8B5CF6';
}

function tierLabel(grade: number): string {
  if (grade >= 88) return 'ELITE';
  if (grade >= 83) return 'BLUE CHIP';
  if (grade >= 78) return 'STARTER';
  return 'PROSPECT';
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!sql) return new Response('DB not configured', { status: 503 });

    const players = await sql`SELECT * FROM perform_players WHERE id = ${parseInt(id)} AND class = '2026'`;
    if (players.length === 0) return new Response('Player not found', { status: 404 });

    const p = players[0];
    const grade = parseFloat(p.grade);
    const color = gradeColor(grade);
    const tier = tierLabel(grade);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0A0A0F"/>
      <stop offset="100%" style="stop-color:#1A1A2F"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${color}"/>
      <stop offset="100%" style="stop-color:${color}80"/>
    </linearGradient>
  </defs>

  <!-- Card background -->
  <rect width="400" height="560" fill="url(#bg)" rx="12"/>

  <!-- Border -->
  <rect x="2" y="2" width="396" height="556" fill="none" stroke="${color}40" stroke-width="2" rx="10"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="400" height="4" fill="url(#accent)" rx="12"/>

  <!-- Per|Form logo area -->
  <text x="24" y="36" font-family="monospace" font-size="10" font-weight="700" fill="${color}" letter-spacing="0.15em">PER|FORM 2026</text>
  <text x="376" y="36" font-family="monospace" font-size="10" fill="rgba(255,255,255,0.3)" text-anchor="end">#${String(p.overall_rank).padStart(2, '0')}</text>

  <!-- Tier badge -->
  <rect x="24" y="50" width="${tier.length * 10 + 20}" height="22" fill="${color}20" rx="2"/>
  <text x="34" y="65" font-family="monospace" font-size="9" font-weight="700" fill="${color}" letter-spacing="0.2em">${tier}</text>

  <!-- Player name -->
  <text x="24" y="110" font-family="sans-serif" font-size="28" font-weight="800" fill="white" letter-spacing="-0.02em">${p.name}</text>

  <!-- Position + School -->
  <text x="24" y="136" font-family="monospace" font-size="14" fill="rgba(255,255,255,0.5)">${p.position} · ${p.school}</text>

  <!-- Grade circle -->
  <circle cx="340" cy="120" r="36" fill="none" stroke="${color}" stroke-width="3"/>
  <text x="340" y="126" font-family="sans-serif" font-size="24" font-weight="800" fill="${color}" text-anchor="middle">${grade}</text>
  <text x="340" y="142" font-family="monospace" font-size="8" fill="rgba(255,255,255,0.3)" text-anchor="middle">GRADE</text>

  <!-- Divider -->
  <line x1="24" y1="170" x2="376" y2="170" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <!-- Stats -->
  <text x="24" y="200" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.3)" letter-spacing="0.15em">KEY STATS</text>
  <text x="24" y="220" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.6)">${(p.key_stats || '').slice(0, 55)}</text>
  <text x="24" y="238" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.6)">${(p.key_stats || '').slice(55, 110)}</text>

  <!-- NFL Comparison -->
  <text x="24" y="280" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.3)" letter-spacing="0.15em">NFL COMPARISON</text>
  <text x="24" y="300" font-family="sans-serif" font-size="16" font-weight="600" fill="${color}">${p.nfl_comparison || 'N/A'}</text>

  <!-- Projected Round -->
  <text x="24" y="340" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.3)" letter-spacing="0.15em">PROJECTED</text>
  <text x="24" y="365" font-family="sans-serif" font-size="32" font-weight="800" fill="white">Round ${p.projected_round}</text>

  <!-- Scouting summary -->
  ${p.scouting_summary ? `
  <text x="24" y="410" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.3)" letter-spacing="0.15em">PER|FORM ANALYST ASSESSMENT</text>
  <text x="24" y="430" font-family="sans-serif" font-size="11" fill="rgba(255,255,255,0.4)">${(p.scouting_summary || '').slice(0, 60)}</text>
  <text x="24" y="446" font-family="sans-serif" font-size="11" fill="rgba(255,255,255,0.4)">${(p.scouting_summary || '').slice(60, 120)}</text>
  ` : ''}

  <!-- Bottom branding -->
  <line x1="24" y1="500" x2="376" y2="500" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <text x="24" y="525" font-family="monospace" font-size="8" fill="rgba(255,255,255,0.15)" letter-spacing="0.2em">TIE · PER|FORM · FOAI.CLOUD</text>
  <text x="376" y="525" font-family="monospace" font-size="8" fill="rgba(255,255,255,0.15)" text-anchor="end" letter-spacing="0.1em">PER|FORM ANALYST</text>
  <text x="24" y="545" font-family="monospace" font-size="8" fill="${color}60" letter-spacing="0.15em">NFT #${p.id} · DRAFT CLASS 2026</text>
</svg>`;

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return new Response('Card generation failed', { status: 500 });
  }
}
