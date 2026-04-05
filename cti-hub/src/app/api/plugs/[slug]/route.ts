import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { getPlug, updatePlug, deletePlug, installPlug } from '@/lib/plugs/engine';

/**
 * GET /api/plugs/[slug] — Get plug details
 * PUT /api/plugs/[slug] — Update plug (owner only)
 * DELETE /api/plugs/[slug] — Delete plug (owner only)
 * POST /api/plugs/[slug] — Actions: install, chat
 */

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { slug } = await params;
  const plug = await getPlug(slug);
  if (!plug) return NextResponse.json({ error: 'Plug not found' }, { status: 404 });

  return NextResponse.json({ plug });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { slug } = await params;
  const body = await req.json();

  const updated = await updatePlug(slug, auth.userId, body);
  if (!updated) return NextResponse.json({ error: 'Plug not found or unauthorized' }, { status: 404 });

  return NextResponse.json({ plug: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { slug } = await params;
  const deleted = await deletePlug(slug, auth.userId);
  if (!deleted) return NextResponse.json({ error: 'Plug not found or unauthorized' }, { status: 404 });

  return NextResponse.json({ deleted: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { slug } = await params;
  const body = await req.json();
  const { action, message, history } = body;

  const plug = await getPlug(slug);
  if (!plug) return NextResponse.json({ error: 'Plug not found' }, { status: 404 });

  // Install action
  if (action === 'install') {
    const ok = await installPlug(plug.id, auth.userId);
    return NextResponse.json({ installed: ok });
  }

  // Chat action — stream response using plug's system prompt + model
  if (action === 'chat' || message) {
    if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
    if (!OPENROUTER_KEY) return NextResponse.json({ error: 'LLM not configured' }, { status: 503 });

    const contextMessages = (history || []).slice(-12).map((m: { role: string; content: string }) => ({
      role: m.role === 'plug' ? 'assistant' : m.role,
      content: m.content,
    }));

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: plug.model,
        messages: [
          { role: 'system', content: plug.system_prompt },
          ...contextMessages,
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      return NextResponse.json({ error: 'Generation failed' }, { status: 502 });
    }

    // SSE stream
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
              } catch { /* skip */ }
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
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
