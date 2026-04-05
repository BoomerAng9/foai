import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { extractYouTube, extractWebPage, extractPDF, extractReddit } from '@/lib/extraction/xtrac';
import { generateTutorial } from '@/lib/extraction/tutorial';

/**
 * POST /api/extract
 * Xtrac_Ang content extraction endpoint.
 *
 * Body: { source: 'youtube' | 'web' | 'pdf', url?: string, content?: string, topic?: string }
 * - source=youtube requires url
 * - source=web requires url
 * - source=pdf requires content (text)
 * - If topic is provided, also generates a tutorial
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { source, url, content, topic } = body as {
    source?: string;
    url?: string;
    content?: string;
    topic?: string;
  };

  if (!source || !['youtube', 'web', 'pdf', 'reddit'].includes(source)) {
    return NextResponse.json(
      { error: 'source must be one of: youtube, web, pdf, reddit' },
      { status: 400 },
    );
  }

  try {
    // 1. Extract content based on source type
    let extracted;
    switch (source) {
      case 'youtube': {
        if (!url) {
          return NextResponse.json({ error: 'url is required for YouTube extraction' }, { status: 400 });
        }
        extracted = await extractYouTube(url);
        break;
      }
      case 'web': {
        if (!url) {
          return NextResponse.json({ error: 'url is required for web extraction' }, { status: 400 });
        }
        extracted = await extractWebPage(url);
        break;
      }
      case 'reddit': {
        if (!url) {
          return NextResponse.json({ error: 'url is required for Reddit extraction' }, { status: 400 });
        }
        extracted = await extractReddit(url);
        break;
      }
      case 'pdf': {
        if (!content) {
          return NextResponse.json({ error: 'content is required for PDF extraction' }, { status: 400 });
        }
        extracted = await extractPDF(content);
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid source type' }, { status: 400 });
    }

    // 2. Optionally generate tutorial
    let tutorial = undefined;
    if (topic && topic.trim()) {
      try {
        tutorial = await generateTutorial(extracted.content, topic.trim());
      } catch (tutErr) {
        console.error('[Xtrac] Tutorial generation failed:', tutErr instanceof Error ? tutErr.message : tutErr);
        // Don't fail the whole request — return extraction without tutorial
      }
    }

    return NextResponse.json({
      extracted: extracted.content,
      tutorial: tutorial || null,
      metadata: extracted.metadata,
    });
  } catch (err) {
    console.error('[Xtrac] Extraction failed:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Extraction failed' },
      { status: 500 },
    );
  }
}
