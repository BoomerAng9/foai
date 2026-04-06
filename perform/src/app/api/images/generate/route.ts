import { NextRequest, NextResponse } from 'next/server';
import { generateImage, getGatewayStatus } from '@/lib/images/gateway';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/images/generate
 *  Unified image generation via runtime-safe gateway
 *
 *  Body: { prompt, engine?, preferText?, size?, aspectRatio?, style? }
 *  Shortcuts: { type: 'hero' | 'mockup' | 'banner' | 'social', subject, context? }
 * ────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || token !== PIPELINE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = getGatewayStatus();
  if (!status.anyAvailable) {
    return NextResponse.json(
      { error: 'No image engine configured', status },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();

    // Shortcut: marketing asset types
    if (body.type) {
      const prompts = {
        hero: `Cinematic marketing hero image: ${body.subject}. ${body.context || ''} Dark background, dramatic studio lighting, hyper-realistic rendering, floating glass panel effects, professional photography aesthetic, shallow depth of field. Brand colors: black #0A0A0F, gold #D4A853.`,
        mockup: `Hyper-realistic UI mockup: ${body.subject}. ${body.context || ''} Dark SaaS dashboard, near-black background, gold accent highlights, glass panel cards, professional typography, cinematic depth of field, photographic quality.`,
        banner: `Wide banner: ${body.subject}. ${body.context || ''} Professional sports broadcast quality, dark theme, gold accents, cinematic composition.`,
        social: `Social media post: ${body.subject}. ${body.context || ''} Square format, eye-catching, bold visual, dark background with gold highlights.`,
      };

      const sizes = {
        hero: '1536x1024',
        mockup: '1280x1024',
        banner: '1536x1024',
        social: '1024x1024',
      };

      const result = await generateImage({
        prompt: prompts[body.type as keyof typeof prompts] || body.subject,
        engine: 'recraft',
        size: sizes[body.type as keyof typeof sizes] || '1024x1024',
        style: 'realistic_image',
      });

      if (!result) {
        return NextResponse.json(
          { error: 'Generation failed on all engines', status },
          { status: 500 }
        );
      }

      return NextResponse.json({ ...result, type: body.type });
    }

    // Direct prompt
    if (!body.prompt) {
      return NextResponse.json({ error: 'prompt required' }, { status: 400 });
    }

    const result = await generateImage({
      prompt: body.prompt,
      engine: body.engine || 'auto',
      preferText: body.preferText,
      size: body.size,
      aspectRatio: body.aspectRatio,
      style: body.style,
      model: body.model,
      negativePrompt: body.negativePrompt,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Generation failed on all engines', status },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Image generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: getGatewayStatus(),
    docs: 'POST with { prompt, engine?, preferText? } or { type, subject, context? }',
  });
}
