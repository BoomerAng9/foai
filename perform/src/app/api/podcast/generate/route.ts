import { NextRequest, NextResponse } from 'next/server';
import { generateAnalystContent, type ContentType } from '@/lib/analysts/content-gen';
import { getAnalyst } from '@/lib/analysts/personas';

export async function POST(req: NextRequest) {
  try {
    const { analystId, topic, duration } = await req.json() as {
      analystId: string;
      topic: string;
      duration?: string;
    };

    if (!analystId || !topic) {
      return NextResponse.json({ error: 'analystId and topic required' }, { status: 400 });
    }

    const analyst = getAnalyst(analystId);
    if (!analyst) {
      return NextResponse.json({ error: `Analyst ${analystId} not found` }, { status: 404 });
    }

    const context = `Topic: ${topic}\nTarget Duration: ${duration || '5min'}\n\nGenerate a podcast script for this duration. Include segment timing.`;

    const { content } = await generateAnalystContent(
      analystId,
      'podcast_script' as ContentType,
      context,
    );

    return NextResponse.json({
      script: content,
      analyst: {
        id: analyst.id,
        name: analyst.name,
        archetype: analyst.archetype,
        color: analyst.color,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Podcast generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
