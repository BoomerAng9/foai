/**
 * Chicken Hawk Dispatch API — bridges ACHEEVY to the production OpenClaw on aims-vps.
 *
 * Flow:
 *   1. ACHEEVY decides a task needs Chicken Hawk (tactical execution)
 *   2. This route sends the task to OpenClaw's agent endpoint via SSH/HTTP
 *   3. OpenClaw dispatches Lil_Hawks to execute
 *   4. Results stream back to ACHEEVY
 *
 * The aims-vps OpenClaw gateway runs on ws://127.0.0.1:18789 (loopback).
 * We access it via the OpenClaw CLI inside the container.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

// AIMS VPS OpenClaw access — via Cloud Run proxy or direct SSH
// In production, this should be a dedicated service. For now, we proxy via
// the Chicken Hawk Gateway container on myclaw-vps (port 8000).
const CHICKEN_HAWK_GATEWAY = process.env.CHICKEN_HAWK_URL || 'http://localhost:8000';

interface DispatchRequest {
  task: string;
  agent?: string;       // Specific Lil_Hawk to target (optional)
  priority?: 'low' | 'normal' | 'high' | 'critical';
  context?: Record<string, unknown>;
  userId: string;
}

interface DispatchResult {
  taskId: string;
  status: 'dispatched' | 'completed' | 'failed';
  agent: string;
  response?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { task, agent, priority, context } = body as Partial<DispatchRequest>;

  if (!task || typeof task !== 'string') {
    return NextResponse.json(
      { error: 'task is required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const taskId = `dispatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    // Dispatch to Chicken Hawk Gateway
    const dispatchPayload = {
      taskId,
      task,
      agent: agent || 'auto',  // 'auto' lets Picker_Ang decide
      priority: priority || 'normal',
      context: {
        ...context,
        userId: auth.userId,
        source: 'acheevy-dispatch',
      },
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(`${CHICKEN_HAWK_GATEWAY}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dispatchPayload),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      // Fallback: try direct OpenRouter call for the task
      const fallbackResult = await fallbackExecution(task, agent);
      return NextResponse.json({
        data: {
          taskId,
          status: 'completed',
          agent: fallbackResult.agent,
          response: fallbackResult.response,
          note: 'Executed via fallback (Chicken Hawk Gateway unavailable)',
        },
      });
    }

    const result = await response.json();
    return NextResponse.json({ data: result });
  } catch (err) {
    // Gateway unreachable — use fallback
    console.error('[Dispatch] Gateway error:', err instanceof Error ? err.message : err);

    try {
      const fallbackResult = await fallbackExecution(task, agent);
      return NextResponse.json({
        data: {
          taskId,
          status: 'completed',
          agent: fallbackResult.agent,
          response: fallbackResult.response,
          note: 'Executed via fallback (gateway unreachable)',
        },
      });
    } catch (fallbackErr) {
      return NextResponse.json(
        {
          error: 'Dispatch failed — both gateway and fallback unavailable',
          code: 'DISPATCH_FAILED',
          taskId,
        },
        { status: 503 }
      );
    }
  }
}

/**
 * Fallback execution via OpenRouter when Chicken Hawk Gateway is unavailable.
 * Uses a free model to handle the task directly.
 */
async function fallbackExecution(task: string, targetAgent?: string): Promise<{ agent: string; response: string }> {
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
  if (!OPENROUTER_KEY) throw new Error('No API key for fallback');

  const agentName = targetAgent || 'Chicken Hawk (fallback)';
  const model = 'google/gemma-4-26b-a4b-it';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'X-OpenRouter-Title': 'The Deploy Platform - Dispatch',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are ${agentName}, a tactical execution agent on The Deploy Platform. Execute the following task concisely and deliver results. Be direct, no preamble.`,
        },
        { role: 'user', content: task },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter returned ${res.status}`);
  const data = await res.json();
  const response = data.choices?.[0]?.message?.content || 'No response generated';

  return { agent: agentName, response };
}

// GET: Check dispatch system health
export async function GET() {
  try {
    const gatewayRes = await fetch(`${CHICKEN_HAWK_GATEWAY}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const gatewayOk = gatewayRes.ok;

    return NextResponse.json({
      status: 'operational',
      gateway: gatewayOk ? 'connected' : 'unavailable (fallback active)',
      fallback: 'openrouter-free',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      status: 'degraded',
      gateway: 'unreachable',
      fallback: 'openrouter-free',
      timestamp: new Date().toISOString(),
    });
  }
}
