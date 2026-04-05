import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { analyzeCode } from '@/lib/code-ang/analyzer';
import { improveSolution } from '@/lib/code-ang/autoresearch';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { code, language, mode } = body as {
      code?: string;
      language?: string;
      mode?: 'analyze' | 'improve' | 'security';
    };

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    const lang = language || 'text';

    if (mode === 'improve') {
      const result = await improveSolution(code, lang);
      return NextResponse.json({
        mode: 'improve',
        research: {
          findings: result.research.findings,
          synthesis: result.research.synthesis,
        },
        improvements: result.improvements,
        improvedCode: result.improvedCode,
      });
    }

    // 'analyze' or 'security'
    const analysisMode = mode === 'security' ? 'security' : 'analyze';
    const result = await analyzeCode(code, lang, analysisMode);

    return NextResponse.json({
      mode: analysisMode,
      score: result.score,
      issues: result.issues,
      summary: result.summary,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Analysis failed';
    console.error('[Code_Ang] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
