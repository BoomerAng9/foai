/**
 * Spinner function-calling loop
 * ==============================
 * Loop:
 *   1. Send messages + tool schemas to Inworld
 *   2. finish_reason "stop" → return assistant message
 *   3. finish_reason "tool_calls" → dispatch, append, goto 1
 */

import {
  InworldClient,
  type InworldChatRequest,
  type InworldMessage,
  type InworldToolCall,
  type InworldChatResponse,
} from './inworld-client.js';
import {
  defaultToolRegistry,
  type ToolHandlerContext,
  type ToolRegistry,
} from './tool-registry.js';

export interface FunctionCallingRequest {
  messages: InworldMessage[];
  model?: string;
  registry?: ToolRegistry;
  callerScopes?: string[];
  ctx?: ToolHandlerContext;
  maxIterations?: number;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  tool_choice?: InworldChatRequest['tool_choice'];
  client?: InworldClient;
}

export interface FunctionCallingTrace {
  iteration: number;
  tool_call_id: string;
  name: string;
  args: Record<string, unknown>;
  result_preview: string;
  duration_ms: number;
}

export interface FunctionCallingResponse {
  message: InworldMessage;
  messages: InworldMessage[];
  iterations: number;
  trace: FunctionCallingTrace[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class FunctionCallingError extends Error {
  constructor(
    message: string,
    public readonly iterations: number,
    public readonly trace: FunctionCallingTrace[],
  ) {
    super(message);
    this.name = 'FunctionCallingError';
  }
}

export async function runFunctionCalling(
  req: FunctionCallingRequest,
): Promise<FunctionCallingResponse> {
  const registry = req.registry ?? defaultToolRegistry;
  const maxIter = req.maxIterations ?? 8;
  const client = req.client ?? new InworldClient();

  const exposedTools = registry.filterByScopes(req.callerScopes ?? []);
  const messages: InworldMessage[] = [...req.messages];
  const trace: FunctionCallingTrace[] = [];
  const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  for (let iter = 1; iter <= maxIter; iter++) {
    const request: InworldChatRequest = {
      model: req.model ?? 'auto',
      messages,
      tools: exposedTools.length > 0 ? exposedTools : undefined,
      tool_choice: req.tool_choice,
      temperature: req.temperature,
      top_p: req.top_p,
      max_tokens: req.max_tokens,
      stream: false,
    };

    const response: InworldChatResponse = await client.chat(request);
    usage.prompt_tokens += response.usage?.prompt_tokens ?? 0;
    usage.completion_tokens += response.usage?.completion_tokens ?? 0;
    usage.total_tokens += response.usage?.total_tokens ?? 0;

    const choice = response.choices?.[0];
    if (!choice) {
      throw new FunctionCallingError('Inworld returned no choices', iter, trace);
    }

    const assistant = choice.message;
    messages.push(assistant);

    if (choice.finish_reason !== 'tool_calls' || !assistant.tool_calls?.length) {
      return { message: assistant, messages, iterations: iter, trace, usage };
    }

    const results = await Promise.all(
      assistant.tool_calls.map((call) =>
        dispatchToolCall(call, registry, req.callerScopes ?? [], req.ctx ?? {}),
      ),
    );

    for (const { call, resultString, duration, parsedArgs } of results) {
      trace.push({
        iteration: iter,
        tool_call_id: call.id,
        name: call.function.name,
        args: parsedArgs,
        result_preview: resultString.slice(0, 200),
        duration_ms: duration,
      });
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: resultString,
      });
    }
  }

  throw new FunctionCallingError(
    `function-calling loop exceeded ${maxIter} iterations without terminating`,
    maxIter,
    trace,
  );
}

async function dispatchToolCall(
  call: InworldToolCall,
  registry: ToolRegistry,
  callerScopes: string[],
  ctx: ToolHandlerContext,
): Promise<{
  call: InworldToolCall;
  resultString: string;
  duration: number;
  parsedArgs: Record<string, unknown>;
}> {
  const start = Date.now();
  let parsedArgs: Record<string, unknown> = {};
  try {
    parsedArgs = call.function.arguments
      ? (JSON.parse(call.function.arguments) as Record<string, unknown>)
      : {};
  } catch {
    parsedArgs = { __malformed_arguments: call.function.arguments };
  }
  const resultString = await registry.execute(
    call.function.name,
    parsedArgs,
    ctx,
    callerScopes,
  );
  return { call, resultString, duration: Date.now() - start, parsedArgs };
}
