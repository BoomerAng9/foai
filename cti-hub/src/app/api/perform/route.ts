import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const ANALYSIS_MODEL = 'google/gemma-4-26b-a4b-it';

/**
 * POST /api/perform — Per|Form sports analytics endpoint
 *
 * Actions:
 *   scout     — Generate scouting report for a player
 *   draft     — NFL Draft analysis and rankings
 *   breakdown — Play-by-play breakdown from description
 *   podcast   — Generate podcast script from analysis
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { action, query, playerName, team, position } = await req.json();

    if (!action) {
      return NextResponse.json({ error: 'action required (scout|draft|breakdown|podcast)' }, { status: 400 });
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'scout':
        systemPrompt = `You are a professional NFL scout working for Per|Form, the sports analytics division of The Deploy Platform. Generate a comprehensive scouting report.\n\nFORMAT:\n- Player Overview (size, speed, athleticism)\n- Strengths (3-5 bullet points with specific examples)\n- Weaknesses (2-3 areas for improvement)\n- NFL Comparison (which NFL player they remind you of)\n- Draft Grade (A+ through F scale)\n- Projected Round\n- Fit Analysis (which NFL teams would benefit)\n\nBe specific. Use football terminology. Grade honestly — not every prospect is elite.`;
        userPrompt = `Scout report for ${playerName || query}${team ? ` from ${team}` : ''}${position ? `, ${position}` : ''}.`;
        break;

      case 'draft':
        systemPrompt = `You are a draft analyst for Per|Form. Provide NFL Draft analysis with specific rankings, team needs, and mock draft predictions.\n\nFORMAT:\n- Top prospects at the queried position or overall\n- Team needs analysis\n- Value picks and sleepers\n- Trade scenarios\n\nBe bold with predictions. Back them with reasoning.`;
        userPrompt = query || 'Give me your latest mock draft top 10 with analysis.';
        break;

      case 'breakdown':
        systemPrompt = `You are a film analyst for Per|Form. Break down plays, formations, and tendencies from game descriptions.\n\nFORMAT:\n- Formation & Personnel\n- Pre-snap Read\n- Play Design\n- Execution Grade\n- Key Matchups\n- What Worked / What Failed`;
        userPrompt = query || 'Break down a typical RPO concept from shotgun spread.';
        break;

      case 'podcast':
        systemPrompt = `You are a podcast script writer for Per|Form. Generate a 3-5 minute podcast script with:\n- Cold open hook (10 seconds)\n- Topic introduction (30 seconds)\n- Main analysis (2-3 minutes)\n- Hot take or prediction (30 seconds)\n- Outro with call to action (15 seconds)\n\nWrite in conversational tone. Include [PAUSE], [EMPHASIS], [GRAPHIC: description] cues for production.`;
        userPrompt = query || `Write a podcast segment about ${playerName || 'the latest NFL Draft prospect rankings'}.`;
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Analysis generation failed' }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      action,
      content,
      model_used: 'analyst', // Never expose actual model name
      tokens: data.usage?.total_tokens || 0,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
