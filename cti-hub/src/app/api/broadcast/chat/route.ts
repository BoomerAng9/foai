import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { buildGrammarPrompt, buildConfirmationPrompt, isPassthrough, NTNTN_SYSTEM_PROMPT } from '@/lib/grammar/converter';

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const ILLER_ANG_MODEL = 'google/gemma-4-26b-a4b-it';
const CONSULT_MODEL = 'google/gemma-4-26b-a4b-it';

const ILLA_SYSTEM = `You are ILLA, the Head of Broad|Cast Studio — The Deploy Platform's video production suite.

ROLE: Creative Director. You interpret the user's vision and translate it into cinematic specifications.

YOUR EXPERTISE:
- Cinematography: camera angles, lens selection, lighting, color grading
- Video production: scene composition, transitions, pacing, storytelling
- AI generation: you know which models produce which visual styles
- Sports analytics: broadcast graphics, player cards, scouting report layouts
- Podcast production: studio backdrops, lower-thirds, talking-head setups

WHEN THE USER DESCRIBES A SCENE:
1. Grammar converts their plain language into cinematic specs
2. You INTERPRET those specs creatively — add your artistic vision
3. Suggest camera body, lens, aperture, movement, film profile, lighting
4. Describe what the final output will look like
5. Ask for confirmation before generating

YOUR VOICE: Confident, artistic, visionary. Like a film director who speaks in images. Mellow and professional. Never condescending. You make everyone feel like a filmmaker.

CAMERA MENU INTEGRATION:
When you recommend camera settings, output them in a structured block so the UI can auto-populate the selectors:
[CAMERA_SPEC]
lens: 85mm
aperture: f/2.0
movement: tracking
profile: ARRI Alexa 35
lighting: golden hour rim
aspect: 16:9
duration: 8s
[/CAMERA_SPEC]

NEVER reveal internal model names, API providers, or costs. You are the creative — not the engineer.`;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    const { userId } = auth;

    const { message, history = [] } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Grammar is ALWAYS active in Broad|Cast Studio
    const grammarPrompt = buildGrammarPrompt(message);
    const passthrough = isPassthrough(message);

    // Build conversation context
    const contextMessages = history.slice(-12).map((m: { role: string; content: string }) => ({
      role: m.role === 'iller_ang' ? 'assistant' : m.role,
      content: m.content,
    }));

    // If not passthrough, run Grammar conversion first
    let enrichedMessage = message;
    if (!passthrough) {
      // Grammar converts the user's intent
      const grammarRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: CONSULT_MODEL,
          messages: [
            { role: 'system', content: NTNTN_SYSTEM_PROMPT },
            { role: 'user', content: grammarPrompt },
          ],
          temperature: 0.3,
          max_tokens: 500,
          stream: false,
        }),
      });

      if (grammarRes.ok) {
        const grammarData = await grammarRes.json();
        const grammarOutput = grammarData.choices?.[0]?.message?.content || '';
        if (!isPassthrough(grammarOutput)) {
          enrichedMessage = buildConfirmationPrompt(message, grammarOutput);
        }
      }
    }

    // Stream ILLA's response
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ILLER_ANG_MODEL,
        messages: [
          { role: 'system', content: ILLA_SYSTEM },
          ...contextMessages,
          { role: 'user', content: enrichedMessage },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      return NextResponse.json({ error: 'Generation failed' }, { status: 502 });
    }

    // SSE stream back to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
                if (parsed.choices?.[0]?.finish_reason === 'stop') {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                }
              } catch {}
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
