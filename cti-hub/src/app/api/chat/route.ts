import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { acheevyRespondStream } from '@/lib/acheevy/agent';
import { createConversation, getMessages } from '@/lib/memory/store';
import { rateLimit } from '@/lib/rate-limit-simple';
import { processGuideMe, getAcheevyGuidePrompt, ACHEEVY_MODEL } from '@/lib/acheevy/guide-me-engine';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
    const userEmail = auth.email;
    const body = await request.json();
    const { message, conversation_id, model, skill_context, mode } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    if (message.length > 10000) {
      return NextResponse.json({ error: 'Message too long (max 10,000 characters)', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    if (!rateLimit(userId, 30, 60000)) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' }, { status: 429 });
    }

    let convId = conversation_id;
    if (!convId) {
      const conv = await createConversation(userId, message.slice(0, 60));
      convId = conv?.id;
    }

    let history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    if (convId) {
      const msgs = await getMessages(convId);
      history = (msgs as Array<{ role: string; content: string }>).map((m) => ({
        role: m.role === 'acheevy' ? 'assistant' as const : m.role as 'user' | 'system',
        content: m.content,
      }));
    }

    // If skill context is provided, prepend it to the message as system-level context
    const enrichedMessage = skill_context
      ? `[SKILL CONTEXT - Apply this framework to your response]\n${skill_context}\n\n[USER MESSAGE]\n${message}`
      : message;

    // Guide Me mode — three-party consulting team
    if (mode === 'guide') {
      const guideResult = await processGuideMe(convId || 'temp', message, history);
      const enc = new TextEncoder();

      const guideStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          // 1. Consult_Ang responds instantly
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ agent: 'Consult_Ang' })}\n\n`));
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: guideResult.consultResponse })}\n\n`));

          // 2. If ACHEEVY is needed, stream the full response
          if (guideResult.acheevyNeeded) {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ agent_working: 'ACHEEVY', message: 'Processing your request...' })}\n\n`));

            // Get ACHEEVY's response via the existing streaming engine
            const acheevyResult = await acheevyRespondStream(
              userId,
              convId || 'temp',
              `[GUIDE ME MODE — Note_Ang context: ${guideResult.notesSummary}]\n\n${enrichedMessage}`,
              history,
              ACHEEVY_MODEL,
              userEmail,
            );

            // Pipe ACHEEVY's stream
            const reader = acheevyResult.stream.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
            } catch { /* stream ended */ }
          } else {
            // Simple response — Consult_Ang handled it alone
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: '', done: true, usage: { tokens_in: 0, tokens_out: 0, cost: 0, memories_recalled: 0 } })}\n\n`));
          }

          controller.close();
        },
      });

      return new Response(guideStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Conversation-Id': convId || '',
        },
      });
    }

    // Standard mode — ACHEEVY responds via the LUC-picked model (default
    // GLM-5.1 per project_chat_engine_decision.md). Gemma is banned as
    // default per Rish 2026-04-08 reliability issues. The pickModel()
    // helper in acheevy/agent.ts also rejects any Gemma id returned by LUC.
    const result = await acheevyRespondStream(
      userId,
      convId || 'temp',
      enrichedMessage,
      history,
      model,
      userEmail,
    );

    return new Response(result.stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Conversation-Id': convId || '',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Detect task complexity and return agent tier (0 = simple chat, 1-4 = autonomous).
 * Tier 1: ACHEEVY Solo — simple generation/research
 * Tier 2: Boomer_Ang Dispatch — department-specific tasks
 * Tier 3: Chicken Hawk + Sqwaad — build/deploy/code execution
 * Tier 4: Full Assembly — multi-department major projects
 */
function detectTaskTier(message: string): { tier: 0 | 1 | 2 | 3 | 4; agents: string[] } {
  const lower = message.toLowerCase();

  // Simple responses — tier 0, fast path
  const simplePatterns = [
    /^(yes|no|ok|sure|thanks|thank you|got it|sounds good|perfect|great|cool|hello|hi|hey)/i,
    /^(what|how much|when|where|who) .{0,40}\?$/i,
  ];
  if (simplePatterns.some(p => p.test(lower))) return { tier: 0, agents: [] };

  // Tier 4 — Full Assembly: multi-domain, enterprise-scale
  const tier4Patterns = [
    'full stack', 'entire app', 'complete platform', 'enterprise',
    'build and deploy', 'end to end', 'full project', 'production ready',
    'mobile app', 'saas', 'marketplace', 'everything',
  ];
  if (tier4Patterns.some(kw => lower.includes(kw))) {
    return { tier: 4, agents: ['acheevy', 'q_ang', 'code_ang', 'biz_ang', 'content_ang', 'iller_ang', 'chicken_hawk'] };
  }

  // Tier 3 — Chicken Hawk: build/deploy/code execution
  const tier3Patterns = [
    'build', 'deploy', 'code', 'write code', 'develop', 'scaffold',
    'create a', 'build a', 'make a', 'set up', 'spin up', 'provision',
    'install', 'configure', 'refactor', 'debug', 'fix this code',
    'edit file', 'modify', 'web app', 'api', 'database',
    'architect', 'construct',
  ];
  if (tier3Patterns.some(kw => lower.includes(kw))) {
    return { tier: 3, agents: ['acheevy', 'code_ang', 'chicken_hawk'] };
  }

  // Tier 2 — Boomer_Ang Dispatch: department-specific
  const tier2Map: Record<string, string[]> = {
    'research|analyze|investigate|find information|scrape|crawl|search the web': ['acheevy', 'q_ang'],
    'design|brand|logo|video|image|creative|animation': ['acheevy', 'iller_ang'],
    'write|content|blog|copy|document|report|presentation|slides': ['acheevy', 'content_ang'],
    'business|strategy|pricing|revenue|market|plan': ['acheevy', 'biz_ang'],
    'train|teach|course|tutorial|learn': ['acheevy', 'learn_ang'],
    'cost|budget|estimate|price|quote': ['acheevy', 'luc'],
  };
  for (const [patterns, agents] of Object.entries(tier2Map)) {
    if (patterns.split('|').some(kw => lower.includes(kw))) {
      return { tier: 2, agents };
    }
  }

  // Tier 1 — ACHEEVY Solo: autonomous but simple
  const tier1Patterns = [
    'generate', 'produce', 'automate', 'integrate', 'make me',
    'write a', 'design a',
  ];
  if (tier1Patterns.some(kw => lower.includes(kw))) {
    return { tier: 1, agents: ['acheevy'] };
  }

  return { tier: 0, agents: [] };
}

// Backward compat wrapper
function detectAutonomousTask(message: string): boolean {
  return detectTaskTier(message).tier > 0;
}
