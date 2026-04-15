import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit } from '@/lib/rate-limit-simple';
import { SEED_MODELS } from '@/lib/pricing/seed-models';

/* ── Tool ID → internal route mapping ─────────────────────────── */
// The Chamber receives user-facing tool IDs. We resolve them to
// the actual provider endpoint details from the pricing matrix.

function findModel(toolId: string) {
  return SEED_MODELS.find(r => r.id === toolId && r.active);
}

/* ── Provider call helpers ────────────────────────────────────── */

async function callLlm(routeId: string, body: string): Promise<{ status: number; output: string; latency: number; logs: Log[] }> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
  if (!apiKey) return { status: 503, output: 'LLM service not configured', latency: 0, logs: [{ level: 'error', msg: 'Missing OPENROUTER_API_KEY' }] };

  const logs: Log[] = [{ level: 'info', msg: 'Connecting to LLM provider...' }];
  const start = Date.now();

  let parsed: { text?: string; messages?: Array<{ role: string; content: string }> };
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = { text: body };
  }

  const messages = parsed.messages ?? [{ role: 'user', content: parsed.text ?? body }];
  logs.push({ level: 'info', msg: `Sending ${messages.length} message(s)...` });

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.DOMAIN_CLIENT || 'http://localhost:3000',
      'X-OpenRouter-Title': 'The Chamber Test',
    },
    body: JSON.stringify({
      model: routeId,
      messages,
      max_tokens: 256,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const latency = Date.now() - start;
  const data = await res.json();

  if (!res.ok || data.error) {
    logs.push({ level: 'error', msg: data.error?.message ?? `HTTP ${res.status}` });
    return { status: res.status, output: data.error?.message ?? 'Provider error', latency, logs };
  }

  const output = data.choices?.[0]?.message?.content ?? '(empty response)';
  logs.push({ level: 'info', msg: 'Response received' });
  if (data.usage) {
    logs.push({ level: 'info', msg: `Tokens: ${data.usage.prompt_tokens} in / ${data.usage.completion_tokens} out` });
  }

  return { status: 200, output, latency, logs };
}

async function callImage(model: ReturnType<typeof findModel>, body: string): Promise<{ status: number; output: string; latency: number; logs: Log[] }> {
  const logs: Log[] = [{ level: 'info', msg: 'Image engine processing...' }];
  const start = Date.now();

  let parsed: { prompt?: string };
  try { parsed = JSON.parse(body); } catch { parsed = { prompt: body }; }
  const prompt = parsed.prompt ?? body;

  // Route through OpenRouter's image gen for models that support it
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
  if (!apiKey) return { status: 503, output: 'Image service not configured', latency: 0, logs: [{ level: 'error', msg: 'Missing API key' }] };

  logs.push({ level: 'info', msg: 'Sending prompt to image engine...' });

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.DOMAIN_CLIENT || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: model?.routeId ?? 'openai/gpt-image',
      messages: [{ role: 'user', content: `Generate an image: ${prompt}` }],
      max_tokens: 256,
    }),
    signal: AbortSignal.timeout(60000),
  });

  const latency = Date.now() - start;
  const data = await res.json();

  if (!res.ok || data.error) {
    logs.push({ level: 'error', msg: data.error?.message ?? `HTTP ${res.status}` });
    return { status: res.status, output: data.error?.message ?? 'Provider error', latency, logs };
  }

  const output = data.choices?.[0]?.message?.content ?? '(image response — check logs)';
  logs.push({ level: 'info', msg: 'Image generation complete' });

  return { status: 200, output, latency, logs };
}

/* ── Video test (fal.ai Seedance/Kling) ───────────────────────── */

async function callVideo(body: string): Promise<{ status: number; output: string; latency: number; logs: Log[] }> {
  const falKey = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!falKey) return { status: 503, output: 'Video service not configured', latency: 0, logs: [{ level: 'error', msg: 'Missing FAL_API_KEY' }] };

  const logs: Log[] = [{ level: 'info', msg: 'Video engine processing...' }];
  const start = Date.now();

  let parsed: { prompt?: string };
  try { parsed = JSON.parse(body); } catch { parsed = { prompt: body }; }
  const prompt = parsed.prompt ?? body;

  logs.push({ level: 'info', msg: 'Submitting to video generation queue...' });

  const res = await fetch('https://queue.fal.run/fal-ai/seedance-2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${falKey}` },
    body: JSON.stringify({ prompt, duration: 5, aspect_ratio: '16:9' }),
    signal: AbortSignal.timeout(30000),
  });

  const latency = Date.now() - start;
  const data = await res.json();

  if (!res.ok) {
    logs.push({ level: 'error', msg: data.detail ?? `HTTP ${res.status}` });
    return { status: res.status, output: data.detail ?? 'Video generation failed', latency, logs };
  }

  const requestId = data.request_id ?? data.id ?? 'unknown';
  logs.push({ level: 'info', msg: `Job queued — request ID: ${requestId}` });
  logs.push({ level: 'info', msg: 'Video generation is async. Check results in a few minutes.' });

  return { status: 202, output: `Video generation queued (ID: ${requestId}). Processing takes 30-120 seconds.`, latency, logs };
}

/* ── TTS test (ElevenLabs) ────────────────────────────────────── */

async function callTts(body: string): Promise<{ status: number; output: string; latency: number; logs: Log[] }> {
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY;
  if (!apiKey) return { status: 503, output: 'TTS service not configured. Add your ElevenLabs key in Circuit Box → BYOK Keys.', latency: 0, logs: [{ level: 'error', msg: 'Missing ELEVENLABS_API_KEY' }] };

  const logs: Log[] = [{ level: 'info', msg: 'Voice engine processing...' }];
  const start = Date.now();

  let parsed: { text?: string; voice_id?: string };
  try { parsed = JSON.parse(body); } catch { parsed = { text: body }; }
  const text = parsed.text ?? body;
  const voiceId = parsed.voice_id ?? 'EXAVITQu4vr4xnSDxMaL'; // default: Sarah

  logs.push({ level: 'info', msg: `Synthesizing ${text.length} characters...` });

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_22050_32`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
    signal: AbortSignal.timeout(30000),
  });

  const latency = Date.now() - start;

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    logs.push({ level: 'error', msg: err.detail ?? 'TTS failed' });
    return { status: res.status, output: err.detail ?? 'TTS generation failed', latency, logs };
  }

  const audioBytes = (await res.arrayBuffer()).byteLength;
  logs.push({ level: 'info', msg: `Audio generated: ${(audioBytes / 1024).toFixed(1)} KB` });

  return { status: 200, output: `Voice synthesis complete — ${(audioBytes / 1024).toFixed(1)} KB audio generated (${latency}ms)`, latency, logs };
}

/* ── STT test (Grok realtime or Deepgram) ─────────────────────── */

async function callStt(body: string): Promise<{ status: number; output: string; latency: number; logs: Log[] }> {
  // STT requires audio input which the Chamber text form can't provide yet.
  // Return a helpful message guiding the user.
  return {
    status: 200,
    output: 'STT testing requires audio input. Use the Voice Capture button in Chat w/ ACHEEVY to test speech-to-text live, or upload an audio file via the API directly.',
    latency: 0,
    logs: [
      { level: 'info', msg: 'STT engines available: Grok realtime, Deepgram' },
      { level: 'info', msg: 'Audio input required — text-based Chamber form cannot test STT directly' },
    ],
  };
}

/* ── Generic fallback for unsupported sectors ─────────────────── */

function unsupported(sector: string): { status: number; output: string; latency: number; logs: Log[] } {
  return {
    status: 501,
    output: `Testing for "${sector}" sector tools is not yet available. LLM and image tools are supported.`,
    latency: 0,
    logs: [{ level: 'warn', msg: `Sector "${sector}" not yet wired for live testing` }],
  };
}

/* ── Types ────────────────────────────────────────────────────── */

interface Log {
  level: 'info' | 'warn' | 'error';
  msg: string;
}

/* ── Route handler ────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!rateLimit(auth.userId, 10, 60000)) {
    return NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMITED' }, { status: 429 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload?.toolId) {
    return NextResponse.json({ error: 'Missing toolId' }, { status: 400 });
  }

  const model = findModel(payload.toolId);
  if (!model) {
    return NextResponse.json({
      id: `test-${Date.now()}`,
      status: 404,
      latency: 0,
      output: 'Tool not found in catalog. Select a tool from The Lab.',
      logs: [{ level: 'error', msg: 'Unknown tool ID' }],
      toolId: payload.toolId,
      timestamp: new Date().toISOString(),
    }, { status: 404 });
  }

  const body = payload.body ?? payload.text ?? '{"text": "Hello, test."}';

  let result: { status: number; output: string; latency: number; logs: Log[] };

  try {
    switch (model.sector) {
      case 'llm':
        result = await callLlm(model.routeId ?? model.id, body);
        break;
      case 'image':
        result = await callImage(model, body);
        break;
      case 'mcp':
        // Design tools (C1 Thesys, Gamma, etc.) — route through LLM for now
        result = await callLlm(model.routeId ?? 'google/gemini-3.0-flash', body);
        break;
      case 'video':
        result = await callVideo(body);
        break;
      case 'tts':
        result = await callTts(body);
        break;
      case 'stt':
        result = await callStt(body);
        break;
      case 'audio':
        result = unsupported(model.sector);
        break;
      default:
        result = unsupported(model.sector);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    result = {
      status: 500,
      output: msg,
      latency: 0,
      logs: [{ level: 'error', msg }],
    };
  }

  return NextResponse.json({
    id: `test-${Date.now()}`,
    status: result.status,
    latency: result.latency,
    output: result.output,
    logs: result.logs,
    toolId: payload.toolId,
    timestamp: new Date().toISOString(),
  });
}
