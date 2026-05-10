/**
 * Chat route helper
 * ==================
 * Drop-in Next.js POST handler for Inworld function-calling.
 *
 *   import { handleChatRequest } from '@aims/spinner';
 *   export const POST = (req: Request) =>
 *     handleChatRequest(req, { system: '...', scopes: ['public'] });
 */

import {
  runFunctionCalling,
  FunctionCallingError,
} from './function-calling.js';
import { defaultToolRegistry, type ToolRegistry } from './tool-registry.js';
import type { InworldMessage } from './inworld-client.js';
import { isInworldConfigured } from './inworld-client.js';

export interface ChatRouteOptions {
  system?: string;
  model?: string;
  scopes?: string[];
  registry?: ToolRegistry;
  maxIterations?: number;
  fallbackMessage?: string;
}

interface ChatRouteBody {
  messages?: InworldMessage[];
  userId?: string;
  tenantId?: string;
  meta?: Record<string, unknown>;
}

export async function handleChatRequest(
  req: Request,
  opts: ChatRouteOptions = {},
): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  let body: ChatRouteBody;
  try {
    body = (await req.json()) as ChatRouteBody;
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return json({ error: 'messages[] required' }, 400);
  }

  if (!isInworldConfigured()) {
    return json(
      {
        error: 'inworld not configured',
        fallback: opts.fallbackMessage ?? null,
      },
      503,
    );
  }

  const messages: InworldMessage[] = opts.system
    ? [{ role: 'system', content: opts.system }, ...body.messages]
    : body.messages;

  const callerScopes = opts.scopes ?? ['public'];
  // Sacred Separation: a public-scope caller never sees internal tool
  // names, arg shapes, or tool result previews. The trace contains all
  // three. Strip it for any caller whose scope set is exactly ['public']
  // (or includes nothing more privileged); keep it for ops/debug/owner
  // scopes so internal surfaces can still see the trace.
  const isPublicOnly =
    callerScopes.length === 1 && callerScopes[0] === 'public';

  try {
    const response = await runFunctionCalling({
      messages,
      model: opts.model ?? 'auto',
      registry: opts.registry ?? defaultToolRegistry,
      callerScopes,
      ctx: {
        userId: body.userId,
        tenantId: body.tenantId,
        meta: body.meta,
      },
      maxIterations: opts.maxIterations,
    });
    return json({
      message: response.message,
      iterations: response.iterations,
      trace: isPublicOnly ? undefined : response.trace,
      usage: response.usage,
    });
  } catch (e) {
    if (e instanceof FunctionCallingError) {
      return json(
        {
          error: e.message,
          iterations: e.iterations,
          trace: isPublicOnly ? undefined : e.trace,
        },
        500,
      );
    }
    return json(
      { error: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
