import { NextRequest, NextResponse } from 'next/server';
import { generateImage, getGatewayStatus } from '@/lib/images/gateway';
import { saveGenerated } from '@/lib/images/storage';

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

    // Shortcut: marketing asset types — Per|Form sports-themed with brand direction
    if (body.type) {
      const prompts = {
        hero: `Hyper-realistic NFL Draft hero image: ${body.subject}. ${body.context || ''}
Scene: professional American football photography, dark stadium atmosphere, dramatic rim lighting, gold confetti particles in the air, football on pedestal in foreground, blurred crowd silhouettes in background. Cinematic broadcast quality, shallow depth of field, 8K detail.
Brand palette: deep black background #0A0A0F, gold accent lighting #D4A853, silver highlights.
Style: ESPN broadcast production value, Nike/Under Armour commercial cinematography, premium sports branding aesthetic.`,

        mockup: `Hyper-realistic product mockup of ${body.subject}. ${body.context || ''}
Setting: premium MacBook Pro on a dark walnut desk, dark studio with single gold rim light, shallow depth of field, blurred football memorabilia in background.
Screen shows: dark SaaS dashboard with player cards, stat tables, gold TIE grade badges, football field visualization.
Brand palette: black #0A0A0F, gold #D4A853. Style: Apple product photography meets ESPN broadcast graphics.`,

        banner: `Wide sports broadcast banner: ${body.subject}. ${body.context || ''}
Scene: Pittsburgh Acrisure Stadium at night during the 2026 NFL Draft, dramatic stage lights cutting through smoke, gold confetti, football helmets in shadowy silhouette.
Brand palette: dark black background, gold accents, silver edges.
Style: ESPN College GameDay production quality, cinematic wide shot, broadcast-ready composition.`,

        social: `NFL Draft social media post: ${body.subject}. ${body.context || ''}
Composition: centered player silhouette in football stance with dramatic gold rim lighting, dark stadium background, motion blur, shallow depth of field.
Brand palette: black #0A0A0F base, gold #D4A853 highlights.
Style: Nike football campaign aesthetic, premium sports photography, square format.`,
      };

      const sizes = {
        hero: '1536x768',     // 16:9 wide
        mockup: '1344x768',   // wide landscape
        banner: '1536x768',   // 16:9 wide
        social: '1024x1024',  // square
      };

      const result = await generateImage({
        prompt: prompts[body.type as keyof typeof prompts] || body.subject,
        engine: 'recraft',
        size: sizes[body.type as keyof typeof sizes] || '1024x1024',
      });

      if (!result) {
        return NextResponse.json(
          { error: 'Generation failed on all engines', status },
          { status: 500 }
        );
      }

      // Save to permanent storage — URLs from Recraft/Ideogram are ephemeral
      const savedPath = await saveGenerated(result.url, body.type, body.subject);
      const publicUrl = savedPath ? `https://perform.foai.cloud${savedPath}` : result.url;

      return NextResponse.json({
        ...result,
        type: body.type,
        url: publicUrl,
        savedPath,
        originalUrl: result.url,
      });
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

    // Save to permanent storage
    const savedPath = await saveGenerated(result.url, 'misc', body.prompt.slice(0, 40));
    const publicUrl = savedPath ? `https://perform.foai.cloud${savedPath}` : result.url;

    return NextResponse.json({
      ...result,
      url: publicUrl,
      savedPath,
      originalUrl: result.url,
    });
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
