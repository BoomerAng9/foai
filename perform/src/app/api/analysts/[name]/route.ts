import { NextRequest, NextResponse } from 'next/server';
import { generateAnalystContent, type ContentType } from '@/lib/analysts/content-gen';

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const { contentType, context } = await req.json() as {
      contentType: ContentType;
      context: string;
    };

    if (!contentType || !context) {
      return NextResponse.json({ error: 'contentType and context required' }, { status: 400 });
    }

    const { content, analyst } = await generateAnalystContent(name, contentType, context);

    return NextResponse.json({
      analyst: { id: analyst.id, name: analyst.name, archetype: analyst.archetype, color: analyst.color },
      contentType,
      content,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
