import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

/**
 * POST /api/automation — Browser automation via Playwright.
 * Enables autonomous screen control for users to watch AI execution.
 *
 * Actions:
 *   navigate — Go to a URL
 *   screenshot — Capture current page state
 *   click — Click an element
 *   fill — Fill a form field
 *   evaluate — Run JavaScript on the page
 *   snapshot — Get page accessibility tree (for AI reasoning)
 *
 * Uses Playwright MCP server under the hood.
 * GLM + Turbo controls the browser actions.
 */

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const AUTOMATION_MODEL = 'qwen/qwen3.6-plus-preview:free';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  // Owner-only for now — browser automation is powerful
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Automation requires elevated access' }, { status: 403 });
  }

  const body = await req.json();
  const { action, task, url, selector, value } = body;

  if (action === 'plan') {
    // AI plans the automation steps from a natural language task
    if (!task) return NextResponse.json({ error: 'task required' }, { status: 400 });

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AUTOMATION_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an automation planner. Given a task, output a JSON array of browser automation steps.
Each step: { "action": "navigate|click|fill|screenshot|wait|evaluate", "target": "url or selector", "value": "text to type or JS to run", "description": "what this step does" }
Output ONLY the JSON array, no markdown fences. Keep steps minimal and precise.`,
          },
          { role: 'user', content: task },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Planning failed' }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '[]';
    const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();

    try {
      const steps = JSON.parse(cleaned);
      return NextResponse.json({ steps, task });
    } catch {
      return NextResponse.json({ steps: [], raw: cleaned, error: 'Could not parse automation plan' });
    }
  }

  // Direct actions — pass through to Playwright MCP when connected
  if (action === 'navigate' && url) {
    return NextResponse.json({
      status: 'queued',
      action: 'navigate',
      url,
      note: 'Playwright MCP server handles execution. Connect via /api/automation/connect.',
    });
  }

  if (action === 'screenshot') {
    return NextResponse.json({
      status: 'queued',
      action: 'screenshot',
      note: 'Playwright MCP captures and returns base64 screenshot.',
    });
  }

  if (action === 'click' && selector) {
    return NextResponse.json({ status: 'queued', action: 'click', selector });
  }

  if (action === 'fill' && selector && value) {
    return NextResponse.json({ status: 'queued', action: 'fill', selector, value });
  }

  return NextResponse.json({ error: 'Unknown action. Use: plan, navigate, screenshot, click, fill' }, { status: 400 });
}
