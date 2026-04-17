import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit } from '@/lib/rate-limit-simple';
import { buildGrammarPrompt, buildConfirmationPrompt, isPassthrough, GRAMMAR_SYSTEM_PROMPT } from '@/lib/grammar/converter';
import { checkMIMGate } from '@/lib/acheevy/mim-gate';

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
// ILLA = Creative Director, gets Gemini 3.1 Pro for cinematic judgment quality (1M context)
// Grammar / Consult = filter/normalization only, Gemini 3.1 Flash Lite is sufficient + cheaper
// Canonical model IDs per OpenRouter catalog (2026-04-16 listing)
const ILLER_ANG_MODEL = 'google/gemini-3.1-pro-preview';
const CONSULT_MODEL = 'google/gemini-3.1-flash-lite-preview';

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

SCENE LOGIC DISCIPLINE (critical for text-to-video — DO NOT SKIP):

Video generation models hallucinate when given cinematic direction without physical-world constraints. They duplicate subjects, drift orientation, and break spatial continuity across frames. This is the single most common failure mode of T2V output. You MUST prevent it.

Every narrative description you write MUST include:

1. SUBJECT COUNT — name the exact count. "A teacher and 22 students" not "a classroom full of kids." Ambiguous requests: pick a reasonable specific count.
2. ORIENTATION — where each subject is looking/facing. "All students facing the teacher at the front board." Never leave orientation unstated.
3. SPATIAL LAYOUT — physical arrangement. "Teacher at whiteboard center-frame, students in 4 rows of 6 desks, foreground row softly out of focus."
4. IDENTITY DISCIPLINE — explicit anti-drift clauses. "Consistent subject identities, each person appears exactly once, no duplicated faces, no mirror-image subjects."
5. CONTINUITY — what happens across the full duration. "Teacher writes continuously on the board; students remain seated and still; no subjects enter or exit frame."

EXAMPLE (good — produces coherent video):
"Classic American high school classroom at mid-morning. One male teacher, mid-40s, writing Arabic script on a whiteboard at the front. 22 tenth-grade students — 11 boys, 11 girls — seated at 4 rows of 6 desks, all facing forward toward the teacher. Each student appears exactly once with distinct clothing and posture; no duplicated faces. Soft natural window light from camera-left. Shallow depth of field on the teacher. Slow camera push-in over 8 seconds. Students remain seated silently; no movement that suggests duplication."

EXAMPLE (bad — produces the duplication bug):
"A teacher going over Arabic with the class, cinematic classroom shot, 8 seconds."

NEVER output a video prompt that lacks subject count, orientation, and identity discipline. If the user request is ambiguous, resolve by picking specific values and stating them in your reply. If a user says "classroom of kids" — you decide and name the count (e.g., "22 tenth-graders"), then describe it in your narrative.

CONFIRMATION FLOW — STOP REPEATING THE PLAN:

Once you output a [CAMERA_SPEC] block, your job on that scene is DONE. You've told the user the plan. Do not keep re-describing it.

- End with ONE short CTA line. "Roll it?" or "Green light?" — never "Ready to roll on this? Let me know if anything needs adjusting — or I can proceed as-is."
- If the user replies "yes", "yeah", "go", "roll", "ship", "fire", "dispatch", "do it", "let's go", "let's roll", "green light", "confirmed", "approved", "proceed", "sure", "ok", or anything semantically equivalent → DO NOT RE-DESCRIBE the plan. Reply with exactly this, nothing more: "Spinner dispatched. Rolling now."  The UI auto-generates from the camera spec you already wrote; restating the plan blocks that flow and creates a loop.
- If the user wants adjustments, update ONLY the changed field(s). Output a minimal CAMERA_SPEC with just the delta, reference the scene narrative only if a visual change is needed. Do not regenerate unchanged sections.
- If the user's response is ambiguous, ask ONE specific targeted question, not "What would you like?"

CLOSE THE CONVERSATION. When the Spinner is dispatched, the next thing that happens is video render — not more chat.

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

    // Rate limit — broadcast chat streams from a paid LLM per message.
    // 20 messages / minute is generous for a single user but caps runaway loops.
    if (!rateLimit(userId, 20, 60000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' },
        { status: 429 },
      );
    }

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

    // Grammar conversion. We track status so the UI can show an
    // indicator instead of silently dropping the filter step.
    //   "applied"      Grammar produced an enriched prompt and we used it
    //   "passthrough"  message was a pure passthrough (no enrichment needed)
    //   "failed"       Grammar call errored — falling back to raw message
    let enrichedMessage = message;
    let grammarStatus: 'applied' | 'passthrough' | 'failed' = 'passthrough';
    let grammarError: string | undefined;

    // Map raw error strings → safe public summaries.
    // Never echo stack traces, internal hostnames, or model names to the client.
    const safeGrammarError = (raw: string): string => {
      const r = raw.toLowerCase();
      if (r.includes('timeout') || r.includes('aborted')) return 'timeout';
      if (r.includes('429') || r.includes('rate')) return 'rate_limited_upstream';
      if (r.includes('401') || r.includes('403') || r.includes('unauthor')) return 'auth_error';
      if (r.includes('500') || r.includes('502') || r.includes('503') || r.includes('504')) return 'upstream_unavailable';
      if (r.includes('network') || r.includes('fetch') || r.includes('econn')) return 'network';
      return 'unknown';
    };

    if (!passthrough) {
      try {
        const grammarRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: CONSULT_MODEL,
            messages: [
              { role: 'system', content: GRAMMAR_SYSTEM_PROMPT },
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
          if (isPassthrough(grammarOutput)) {
            grammarStatus = 'passthrough';
          } else {
            enrichedMessage = buildConfirmationPrompt(message, grammarOutput);
            grammarStatus = 'applied';
          }
        } else {
          grammarStatus = 'failed';
          const raw = `HTTP ${grammarRes.status} ${grammarRes.statusText}`;
          console.error(`[Broadcast] Grammar call failed: ${raw}`);
          grammarError = safeGrammarError(raw);
        }
      } catch (err) {
        // Network error, abort, JSON parse — anything that throws.
        grammarStatus = 'failed';
        const raw = err instanceof Error ? err.message : String(err);
        console.error(`[Broadcast] Grammar call exception: ${raw}`);
        grammarError = safeGrammarError(raw);
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
        // Lead with a metadata frame so the UI can show Grammar
        // status (and any error reason) before any content arrives.
        const meta: Record<string, unknown> = { meta: { grammar_status: grammarStatus } };
        if (grammarError) (meta.meta as Record<string, unknown>).grammar_error = grammarError;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(meta)}\n\n`));

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
