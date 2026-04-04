import { NextRequest, NextResponse } from 'next/server';
import { getTeamColors } from '@/lib/helmets/team-colors';
import { getFacemaskForPosition, FacemaskType } from '@/lib/helmets/facemasks';

function facemaskSvg(type: FacemaskType): string {
  const c = '#555';
  const w = 2.5;

  if (type === 'open') {
    return `
      <path d="M28,42 Q18,44 12,52" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
      <path d="M28,50 Q20,52 14,58" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
      <path d="M12,52 L14,58" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
      <path d="M14,58 Q16,64 24,66" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
    `;
  }

  if (type === 'skill') {
    return `
      <path d="M28,40 Q16,42 10,50" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
      <path d="M28,47 Q18,48 12,54" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
      <path d="M28,54 Q20,55 14,60" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
      <path d="M10,50 L12,54 L14,60" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
      <path d="M14,60 Q18,66 26,68" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
    `;
  }

  // cage
  return `
    <path d="M28,38 Q14,40 8,48" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
    <path d="M28,43 Q16,44 10,51" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
    <path d="M28,48 Q18,49 12,55" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
    <path d="M28,53 Q20,54 14,59" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
    <path d="M28,58 Q22,59 16,63" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
    <path d="M8,48 L10,51 L12,55 L14,59 L16,63" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
    <path d="M16,63 Q20,68 28,70" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
  `;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ school: string }> }
) {
  const { school: rawSchool } = await params;
  const school = decodeURIComponent(rawSchool);
  const position = request.nextUrl.searchParams.get('position') || 'WR';

  const colors = getTeamColors(school);
  const maskType = getFacemaskForPosition(position);
  const uid = 'h';

  const stripeSvg = colors.stripe
    ? `<path d="M42,10 Q52,7 62,10 L60,12 Q52,9.5 44,12 Z" fill="${colors.stripe}" opacity="0.9"/>`
    : '';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${uid}-visor" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#1a1a1a" stop-opacity="0.95"/>
      <stop offset="35%" stop-color="#2a2a2a" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#444444" stop-opacity="0.7"/>
      <stop offset="65%" stop-color="#2a2a2a" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#111111" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="${uid}-shine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="${uid}-hl" cx="0.4" cy="0.3" r="0.6">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Shell -->
  <path d="M30,18 Q50,8 75,16 Q92,22 95,42 Q96,55 90,65 Q85,72 75,75 L70,75 L60,72 Q45,70 35,68 L30,66 Q22,62 20,52 Q18,40 22,28 Q24,22 30,18 Z" fill="${colors.primary}"/>
  <path d="M30,18 Q50,8 75,16 Q92,22 95,42 Q96,55 90,65 Q85,72 75,75 L70,75 L60,72 Q45,70 35,68 L30,66 Q22,62 20,52 Q18,40 22,28 Q24,22 30,18 Z" fill="url(#${uid}-hl)"/>

  <!-- Stripe -->
  ${stripeSvg}

  <!-- Ear accent -->
  <ellipse cx="72" cy="52" rx="6" ry="10" fill="${colors.secondary}" opacity="0.7"/>

  <!-- Visor -->
  <path d="M28,38 Q30,32 42,30 Q55,28 60,32 L58,46 Q52,52 40,54 Q32,54 28,50 Z" fill="url(#${uid}-visor)"/>
  <path d="M32,34 Q38,30 50,30 L48,38 Q40,42 34,42 Z" fill="url(#${uid}-shine)"/>

  <!-- Jaw -->
  <path d="M28,54 Q30,62 36,68 Q42,72 50,72 L50,70 Q42,70 37,66 Q32,62 30,56 Z" fill="${colors.primary}"/>
  <path d="M28,54 Q30,62 36,68 Q42,72 50,72 L50,70 Q42,70 37,66 Q32,62 30,56 Z" fill="url(#${uid}-hl)"/>

  <!-- Facemask -->
  ${facemaskSvg(maskType)}

  <!-- Outline -->
  <path d="M30,18 Q50,8 75,16 Q92,22 95,42 Q96,55 90,65 Q85,72 75,75 L70,75 L60,72 Q45,70 35,68 L30,66 Q22,62 20,52 Q18,40 22,28 Q24,22 30,18 Z" stroke="rgba(255,255,255,0.1)" stroke-width="0.5" fill="none"/>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
