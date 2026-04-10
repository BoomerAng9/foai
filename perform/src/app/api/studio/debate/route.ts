import { NextRequest, NextResponse } from 'next/server';
import { ANALYSTS, type AnalystPersona } from '@/lib/analysts/personas';

interface DebateRequest {
  topic: string;
  format: 'around-the-horn' | 'bull-vs-bear' | 'film-room';
}

async function getAnalystTake(
  analyst: AnalystPersona,
  topic: string,
  format: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return `[${analyst.name}] API key not configured. Set OPENROUTER_API_KEY in your environment.`;
  }

  const formatInstruction =
    format === 'around-the-horn'
      ? 'Give a quick-fire hot take in 2-3 sentences. Be punchy and direct.'
      : format === 'bull-vs-bear'
        ? 'Take one strong side and argue it passionately in 3-4 sentences.'
        : 'Do a detailed film-style breakdown in 4-5 sentences.';

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://perform.foai.cloud',
        'X-Title': 'Per|Form War Room',
      },
      body: JSON.stringify({
        model: 'google/gemma-3-27b-it',
        messages: [
          { role: 'system', content: analyst.systemPrompt },
          {
            role: 'user',
            content: `DEBATE TOPIC: ${topic}\n\nFORMAT: ${format}\n\n${formatInstruction}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.85,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`OpenRouter error for ${analyst.name}:`, err);
      return `[${analyst.name}] Unable to generate take at this time.`;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? 'No take generated.';
  } catch (err) {
    console.error(`Fetch error for ${analyst.name}:`, err);
    return `[${analyst.name}] Connection error — try again.`;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Allow pipeline key OR authenticated user session
    const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const hasPipelineAuth = PIPELINE_KEY && token === PIPELINE_KEY;

    if (!hasPipelineAuth) {
      const { requireAuth } = await import('@/lib/auth-guard');
      const authResult = await requireAuth(request);
      if (!authResult.ok) return authResult.response;
    }

    const body: DebateRequest = await request.json();
    const { topic, format } = body;

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const validFormats = ['around-the-horn', 'bull-vs-bear', 'film-room'];
    const safeFormat = validFormats.includes(format) ? format : 'around-the-horn';

    // Fire all 4 analyst calls in parallel
    const takePromises = ANALYSTS.map(async (analyst) => {
      const content = await getAnalystTake(analyst, topic, safeFormat);
      return {
        analyst: analyst.name,
        color: analyst.color,
        archetype: analyst.archetype,
        content,
      };
    });

    const takes = await Promise.all(takePromises);

    return NextResponse.json({ takes });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
