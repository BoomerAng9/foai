/**
 * GET /api/draft/agent/[id]/stream
 * ==================================
 * SSE bridge — proxies parsed DraftEvents from a Claude Managed Agent
 * session to the browser. The frontend opens an EventSource against
 * this endpoint and renders picks/trades/commentary as they arrive.
 */

import { NextRequest } from 'next/server';
import { streamDraftEvents } from '@/lib/draft/managed-agent-draft';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamDraftEvents(id)) {
          const payload = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        }
        controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ message })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
