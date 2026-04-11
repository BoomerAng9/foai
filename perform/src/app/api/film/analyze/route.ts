import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/openrouter';
import { safeCompare } from '@/lib/auth-guard';

interface FilmRequest {
  playerName: string;
  source?: 'youtube' | 'web' | 'upload';
  analysisType?: string;
  youtubeUrl?: string;
}

const BRAVE_KEY = process.env.BRAVE_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    // Allow pipeline key OR authenticated user session
    const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const hasPipelineAuth = PIPELINE_KEY && safeCompare(token, PIPELINE_KEY);

    if (!hasPipelineAuth) {
      const { requireAuth } = await import('@/lib/auth-guard');
      const authResult = await requireAuth(req);
      if (!authResult.ok) return authResult.response;
    }

    const body: FilmRequest = await req.json();
    const { playerName, source = 'youtube' } = body;

    if (!playerName?.trim()) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    // Step 1: Search for game film/highlights for this player
    let filmContext = '';
    try {
      const query = source === 'youtube'
        ? `${playerName} college football game highlights film 2025 2026`
        : `${playerName} college football scouting report film breakdown 2026`;

      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`,
        { headers: { 'X-Subscription-Token': BRAVE_KEY, 'Accept': 'application/json' } },
      );
      if (res.ok) {
        const data = await res.json();
        filmContext = (data.web?.results ?? [])
          .map((r: { title?: string; description?: string }) => `${r.title}: ${r.description}`)
          .join('\n');
      }
    } catch {}

    // Step 2: Generate scouting breakdown using gathered context
    const systemPrompt = `You are a veteran NFL scout with 30 years of experience breaking down film. You are analyzing ${playerName} for the 2026 NFL Draft.

Write a detailed film breakdown based on the available information. Structure your analysis as:

1. OVERVIEW — Who is this player, what position, what school, what makes them special
2. STRENGTHS — 3-4 specific strengths you see on film, with examples of plays/situations
3. CONCERNS — 2-3 areas that need improvement, be honest but constructive
4. NFL PROJECTION — What kind of NFL player will they be, what scheme fits them best
5. GRADE — Give a 0-100 grade and explain why

Write like a real scout — specific, concise, opinionated. Reference actual football concepts (gap schemes, Cover 3, RPO, press-man, etc). Do NOT use generic filler. Do NOT reveal any internal tools or formulas.

ALWAYS use full position names: Quarterback, Running Back, Wide Receiver, etc. NEVER abbreviate.`;

    const analysis = await generateText(
      systemPrompt,
      `Here is the latest information available on ${playerName}:\n\n${filmContext}\n\nProvide your complete film breakdown and grade for ${playerName}.`,
    );

    // Extract grade from the analysis
    const gradeMatch = analysis.match(/(\d{2,3})\s*(?:\/\s*100|out of 100)/i) || analysis.match(/grade[:\s]*(\d{2,3})/i);
    const grade = gradeMatch ? parseInt(gradeMatch[1]) : 78;

    return NextResponse.json({
      analysis,
      plays: [],
      grade: Math.min(99, Math.max(40, grade)),
      meta: { source, playerName, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
