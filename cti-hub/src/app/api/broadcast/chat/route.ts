import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { buildGrammarPrompt, buildConfirmationPrompt, isPassthrough, NTNTN_SYSTEM_PROMPT } from '@/lib/grammar/converter';
import { checkMIMGate } from '@/lib/acheevy/mim-gate';

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const ILLER_ANG_MODEL = 'qwen/qwen3.6-plus-preview:free';
const CONSULT_MODEL = 'qwen/qwen3.6-plus-preview:free';

const ILLA_SYSTEM = `You are ILLA, the Head of Broad|Cast Studio — The Deploy Platform's video production suite.

ROLE: Creative Director. You interpret the user's vision and translate it into cinematic specifications.

YOUR EXPERTISE:
- Cinematography: camera angles, lens selection, lighting, color grading
- Video production: scene composition, transitions, pacing, storytelling
- AI generation: you know which engines produce which visual styles (Seedance 2.0 for cinematic quality, Kling 3.0 for fast stylized output)
- Sports analytics: broadcast graphics, player cards, scouting report layouts
- Podcast production: studio backdrops, lower-thirds, talking-head setups

WHEN THE USER DESCRIBES A SCENE:
1. Grammar converts their plain language into cinematic specs
2. You INTERPRET those specs creatively — add your artistic vision
3. Suggest camera body, lens, aperture, movement, film profile, lighting
4. Describe what the final output will look like
5. Ask for confirmation before generating

YOUR VOICE: Confident, artistic, concise. Like a film director who speaks in images. Mellow and professional. Never condescending.

CRITICAL: Keep responses SHORT. 2-3 sentences max for simple requests. Don't over-explain. Don't ask multiple questions. Get to the [CAMERA_SPEC] fast. The user wants results, not paragraphs.

Match the user's energy — if they say "Yoo" or keep it casual, you keep it casual back. If they're brief, you're brief.

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
engine: seedance | kling
[/CAMERA_SPEC]

IMPORTANT ASPECT RATIO RULE:
When specifying aspect ratios in [CAMERA_SPEC], ONLY use these exact values:
1:1, 4:3, 3:4, 16:9, 9:16, 21:9, adaptive
Do NOT use 2.39:1 or 2.35:1 — use 21:9 instead for widescreen cinematic.
Do NOT use 1.85:1 — use 16:9 instead.

HONESTY RULES:
- Do NOT mention Boomer_Ang, Lil_Hawk, or any agent by name as if they are doing work. They are not running.
- Do NOT say "I'm bringing in [agent]" — that is fake.
- YOU do the creative work directly. You ARE the creative director.
- If you cannot generate something, say so plainly.
- Match the user's tone — if they're chill, be chill. If formal, be formal.

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

    // MIM governance gate — redirect, don't block
    const mimResult = checkMIMGate(message);
    if (!mimResult.allowed) {
      return NextResponse.json({
        content: mimResult.redirect || mimResult.reason || 'This request falls outside our operational boundaries.',
        mim_blocked: true,
        policy: mimResult.policy,
      });
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

    // SSE stream back to client — detect [CAMERA_SPEC] blocks for video generation
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';
        let sentDone = false;

        /** Extract and send video_ready event from CAMERA_SPEC block */
        function sendVideoReady(response: string) {
          const specMatch = response.match(/\[CAMERA_SPEC\]([\s\S]*?)\[\/CAMERA_SPEC\]/);
          if (!specMatch) return;
          const narrative = response
            .replace(/\[CAMERA_SPEC\][\s\S]*?\[\/CAMERA_SPEC\]/g, '')
            .replace(/\*\*/g, '')
            .trim();
          const specText = specMatch[1];
          const specFields: Record<string, string> = {};
          for (const specLine of specText.split('\n')) {
            const kv = specLine.match(/^\s*(\w+):\s*(.+)/);
            if (kv) specFields[kv[1].toLowerCase()] = kv[2].trim();
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            video_ready: true,
            video_prompt: narrative.slice(0, 800),
            camera_spec: specFields,
            engine: specFields.engine === 'kling' ? 'kling' : 'seedance',
          })}\n\n`));
        }

        /** Send done event exactly once */
        function sendDone() {
          if (sentDone) return;
          sentDone = true;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        }

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
                  fullResponse += content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
                if (parsed.choices?.[0]?.finish_reason === 'stop') {
                  sendVideoReady(fullResponse);
                  sendDone();
                }
              } catch {
                // Malformed SSE chunk — skip
              }
            }
          }
          // Final check if stream ended without finish_reason (some providers do this)
          if (!sentDone) {
            sendVideoReady(fullResponse);
            sendDone();
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Stream interrupted';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Stream error: ${errMsg}` })}\n\n`));
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
