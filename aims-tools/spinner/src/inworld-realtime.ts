/**
 * Inworld Realtime WebSocket client
 * ==================================
 * Server-side duplex voice + function-calling session over
 * wss://api.inworld.ai/api/v1/realtime/session.
 */

import type { InworldTool } from './inworld-client.js';
import { readInworldKey } from './inworld-client.js';
import type { ToolRegistry, ToolHandlerContext } from './tool-registry.js';

export const INWORLD_REALTIME_URL =
  process.env.INWORLD_REALTIME_URL ||
  'wss://api.inworld.ai/api/v1/realtime/session';

export interface RealtimeSessionOptions {
  apiKey?: string;
  tools?: InworldTool[];
  instructions?: string;
  registry?: ToolRegistry;
  callerScopes?: string[];
  ctx?: ToolHandlerContext;
  onEvent?: (event: RealtimeServerEvent) => void;
  onClose?: (reason: string) => void;
}

export type RealtimeServerEvent =
  | { type: 'session.created'; session: Record<string, unknown> }
  | { type: 'session.updated'; session: Record<string, unknown> }
  | { type: 'input_audio_buffer.speech_started' }
  | { type: 'response.output_audio.delta'; audio: string }
  | { type: 'response.output_text.delta'; delta: string }
  | {
      type: 'response.function_call_arguments.delta';
      call_id: string;
      name: string;
      delta: string;
    }
  | {
      type: 'response.function_call_arguments.done';
      call_id: string;
      name: string;
      arguments: string;
    }
  | { type: string; [k: string]: unknown };

export interface RealtimeHandle {
  send(event: Record<string, unknown>): void;
  appendAudio(base64Pcm16: string): void;
  createResponse(): void;
  close(): void;
  readonly ready: Promise<void>;
}

export async function openRealtimeSession(
  opts: RealtimeSessionOptions = {},
): Promise<RealtimeHandle> {
  const apiKey = opts.apiKey ?? readInworldKey();
  if (!apiKey) {
    throw new Error('[inworld-realtime] no api key — set INWORLD_API_KEY');
  }

  const WS = await resolveWebSocketCtor();
  const url = `${INWORLD_REALTIME_URL}?key=voice-${Date.now()}&protocol=realtime`;

  const headers = { Authorization: `Basic ${apiKey}` };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ws: any =
    typeof (WS as any) === 'function' && (WS as any).length >= 2
      ? new (WS as any)(url, { headers })
      : new (WS as any)(url);

  let readyResolve!: () => void;
  const ready = new Promise<void>((r) => (readyResolve = r));

  ws.addEventListener?.('open', () => {
    const sessionUpdate: Record<string, unknown> = { type: 'session.update' };
    const session: Record<string, unknown> = {};
    if (opts.instructions) session.instructions = opts.instructions;
    if (opts.tools?.length) {
      session.tools = opts.tools.map((t) => ({
        type: 'function',
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      }));
    }
    sessionUpdate.session = session;
    ws.send(JSON.stringify(sessionUpdate));
    readyResolve();
  });

  ws.addEventListener?.('message', async (msg: { data: string }) => {
    let event: RealtimeServerEvent | null = null;
    try {
      event = JSON.parse(msg.data) as RealtimeServerEvent;
    } catch {
      return;
    }
    opts.onEvent?.(event);

    if (
      event.type === 'response.function_call_arguments.done' &&
      opts.registry
    ) {
      const name = (event as { name: string }).name;
      const callId = (event as { call_id: string }).call_id;
      const rawArgs = (event as { arguments: string }).arguments;
      let parsed: Record<string, unknown> = {};
      try {
        parsed = rawArgs ? JSON.parse(rawArgs) : {};
      } catch {
        parsed = { __malformed: rawArgs };
      }
      const result = await opts.registry.execute(
        name,
        parsed,
        opts.ctx ?? {},
        opts.callerScopes ?? [],
      );
      ws.send(
        JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: result,
          },
        }),
      );
      ws.send(JSON.stringify({ type: 'response.create' }));
    }
  });

  ws.addEventListener?.('close', (ev: { reason?: string }) =>
    opts.onClose?.(ev.reason ?? 'closed'),
  );
  ws.addEventListener?.('error', () => opts.onClose?.('error'));

  return {
    ready,
    send: (event) => ws.send(JSON.stringify(event)),
    appendAudio: (audio) =>
      ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio })),
    createResponse: () =>
      ws.send(JSON.stringify({ type: 'response.create' })),
    close: () => ws.close?.(),
  };
}

async function resolveWebSocketCtor(): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  const isNode =
    typeof process !== 'undefined' &&
    !!process.versions?.node &&
    typeof g.window === 'undefined';
  if (isNode) {
    try {
      const mod = (await import('ws')) as { default?: unknown; WebSocket?: unknown };
      return mod.default ?? mod.WebSocket ?? mod;
    } catch {
      // fall through to global if `ws` isn't installed
    }
  }
  if (typeof g.WebSocket === 'function') return g.WebSocket;
  throw new Error(
    '[inworld-realtime] no WebSocket available. Install `ws` for Node or run in a browser.',
  );
}
