import { NextRequest, NextResponse } from 'next/server';
import { calculateTIE } from '@/lib/tie/engine';
import type { PerformanceInput, AttributesInput, IntangiblesInput } from '@/lib/tie/types';

export async function POST(req: NextRequest) {
  try {
    const { performance, attributes, intangibles } = await req.json() as {
      performance: PerformanceInput;
      attributes: AttributesInput;
      intangibles: IntangiblesInput;
    };

    const result = calculateTIE(performance || {}, attributes || {}, intangibles || {});

    return NextResponse.json({
      score: result.score,
      grade: result.grade,
      tier: result.tier,
      label: result.label,
      draftContext: result.draftContext,
      badgeColor: result.badgeColor,
      components: result.components,
    });
  } catch {
    return NextResponse.json({ error: 'Grading failed' }, { status: 500 });
  }
}
