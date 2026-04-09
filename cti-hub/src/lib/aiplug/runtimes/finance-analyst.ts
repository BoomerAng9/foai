/**
 * Finance Analyst — autonomous runtime
 * ========================================
 * Third flagship aiPLUG & Play demo. Clones the SMB Marketing
 * pattern from I-2: single full cycle per launch, free-LLM cascade,
 * real outputs + event stream. No mocks.
 *
 * Phase 1 feedback #8–#9 target capabilities:
 *   - Looks good visually but was missing characters in the UI
 *   - Chat must be REAL — not mock replies
 *   - Free model backend
 *
 * I-4 scope (this file): one meaningful cycle an SMB owner, solo
 * operator, or fractional CFO can actually ship. Four stages:
 *   1. INTAKE         — parse inputs
 *   2. HEALTH_SCAN    — financial health snapshot as JSON
 *   3. FORECAST       — 12-week cash flow forecast + narrative
 *   4. ACTION_PLAN    — 5 prioritized moves with impact estimates
 *
 * Chat-with-context (real conversational Finance Analyst that
 * references the latest run's outputs) is I-4b.
 */

import { chatWithCascade } from '@/lib/aiplug/llm';
import type { RuntimeContext, RuntimeResult } from './registry';

interface FinanceInputs {
  business_name?: string;
  business_type?: string;
  revenue_range?: string;
  current_cash?: string;
  monthly_burn?: string;
  top_concerns?: string | string[];
  time_horizon_weeks?: number;
}

function parseInputs(raw: Record<string, unknown>): FinanceInputs {
  const rawConcerns = raw.top_concerns;
  let topConcerns: string | string[] | undefined;
  if (typeof rawConcerns === 'string') {
    topConcerns = rawConcerns;
  } else if (Array.isArray(rawConcerns)) {
    topConcerns = rawConcerns.filter((c): c is string => typeof c === 'string');
  }
  const rawHorizon = raw.time_horizon_weeks;
  const horizon =
    typeof rawHorizon === 'number' && rawHorizon >= 1 && rawHorizon <= 52
      ? Math.floor(rawHorizon)
      : undefined;
  return {
    business_name: typeof raw.business_name === 'string' ? raw.business_name : undefined,
    business_type: typeof raw.business_type === 'string' ? raw.business_type : undefined,
    revenue_range: typeof raw.revenue_range === 'string' ? raw.revenue_range : undefined,
    current_cash: typeof raw.current_cash === 'string' ? raw.current_cash : undefined,
    monthly_burn: typeof raw.monthly_burn === 'string' ? raw.monthly_burn : undefined,
    top_concerns: topConcerns,
    time_horizon_weeks: horizon,
  };
}

function describeConcerns(concerns: FinanceInputs['top_concerns']): string {
  if (!concerns) return 'general financial health';
  if (typeof concerns === 'string') return concerns;
  if (concerns.length === 0) return 'general financial health';
  return concerns.join(', ');
}

const SYSTEM_PROMPT = `You are the Finance Analyst — an autonomous agentic CFO for small and mid-sized businesses, solo operators, and fractional CFO engagements. You write in a direct, numerate, no-nonsense voice. You do not reference that you are an AI. You do not reference underlying models, tools, or infrastructure.

Your outputs are concrete, decision-ready, and immediately actionable. When numbers are supplied, use them literally. When numbers are not supplied, use clearly labeled placeholder ranges and flag which inputs the owner should return with. Never fabricate specific financial data as if it were verified.

You work in stages. At each stage you return structured JSON when asked, or concrete text when asked. You do not editorialize about the task — you do the work.`;

export async function runFinanceAnalyst(ctx: RuntimeContext): Promise<RuntimeResult> {
  const inputs = parseInputs(ctx.run.inputs);
  const business = inputs.business_name || 'your business';
  const type = inputs.business_type || 'small business';
  const revenue = inputs.revenue_range || 'revenue range not supplied';
  const cash = inputs.current_cash || 'current cash not supplied';
  const burn = inputs.monthly_burn || 'monthly burn not supplied';
  const concerns = describeConcerns(inputs.top_concerns);
  const horizon = inputs.time_horizon_weeks ?? 12;

  let totalTokens = 0;
  const outputs: Record<string, unknown> = {};

  try {
    /* ── STAGE 1 — INTAKE ─────────────────────────────────── */
    await ctx.emit('stage', 'intake', `Starting Finance Analyst cycle for ${business}`, {
      inputs,
    });
    await ctx.emit('heartbeat', 'intake', 'Agent online');

    /* ── STAGE 2 — HEALTH SCAN ────────────────────────────── */
    await ctx.emit('stage', 'health_scan', 'Running financial health snapshot');
    const healthPrompt = `Produce a financial health snapshot for ${business} — a ${type}. Revenue: ${revenue}. Current cash: ${cash}. Monthly burn: ${burn}. Owner concerns: ${concerns}.

Return JSON with this shape:
{
  "overall_rating": "one of: strong, stable, watchful, strained, critical",
  "runway_estimate": "estimated weeks of runway at current burn, or 'N/A — insufficient data'",
  "top_3_risks": [
    { "risk": "...", "severity": "low|medium|high", "why": "..." }
  ],
  "top_3_opportunities": [
    { "opportunity": "...", "size": "small|medium|large", "why": "..." }
  ],
  "missing_inputs": ["list of inputs the owner should return with to sharpen the analysis"]
}

Do NOT fabricate specific dollar amounts if the inputs didn't supply them. Use ranges and flag missing inputs instead. Return ONLY the JSON object, no preamble.`;

    const health = await chatWithCascade({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: healthPrompt }],
      maxTokens: 900,
      temperature: 0.3,
    });
    totalTokens += health.promptTokens + health.completionTokens;
    outputs.health_scan = health.text;
    outputs.health_scan_model = health.modelUsed;
    await ctx.emit('output', 'health_scan', 'Health snapshot ready', {
      model: health.modelUsed,
      tierIndex: health.tierIndex,
      preview: health.text.slice(0, 200),
    });
    await ctx.persistOutputs(outputs);
    await ctx.emit('heartbeat', 'health_scan', 'stage complete');

    /* ── STAGE 3 — FORECAST ───────────────────────────────── */
    await ctx.emit('stage', 'forecast', `Drafting ${horizon}-week cash flow forecast`);
    const forecastPrompt = `Based on the health snapshot below, draft a ${horizon}-week cash flow forecast for ${business}.

Health snapshot:
${health.text}

Return the forecast as two parts:

PART 1 — FORECAST TABLE (plain text, monospace-friendly)
Columns: Week, Inflows, Outflows, Net, Ending Cash
Rows: ${horizon} weeks starting from this week. Use assumptions consistent with the inputs. Where an input was missing, use a clearly labeled placeholder (e.g. "[ASSUME \\$X]") and list the assumption at the bottom.

PART 2 — NARRATIVE (3–5 short paragraphs)
- Where the biggest cash events land
- Where runway gets tight and what triggers a cash crunch
- What to watch weekly as leading indicators
- Assumptions used (flag any that materially move the forecast)

No fluff. No caveats beyond the assumption block. Ready for the owner to share with a co-founder or board member.`;

    const forecast = await chatWithCascade({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: forecastPrompt }],
      maxTokens: 1800,
      temperature: 0.35,
    });
    totalTokens += forecast.promptTokens + forecast.completionTokens;
    outputs.forecast = forecast.text;
    outputs.forecast_model = forecast.modelUsed;
    outputs.forecast_horizon_weeks = horizon;
    await ctx.emit('output', 'forecast', `${horizon}-week forecast ready`, {
      model: forecast.modelUsed,
      tierIndex: forecast.tierIndex,
      horizon,
      preview: forecast.text.slice(0, 200),
    });
    await ctx.persistOutputs(outputs);
    await ctx.emit('heartbeat', 'forecast', 'stage complete');

    /* ── STAGE 4 — ACTION PLAN ────────────────────────────── */
    await ctx.emit('stage', 'action_plan', 'Drafting 5 prioritized actions');
    const actionPrompt = `Based on the health snapshot and forecast below, draft 5 prioritized financial actions for ${business}. Cover a mix of: cost cuts, pricing moves, collection tactics, investment moves, and tax/structure moves — but only include what's actually relevant to this business's situation.

Health snapshot:
${health.text.slice(0, 1000)}

Forecast narrative:
${forecast.text.split('PART 2')[1]?.slice(0, 800) ?? forecast.text.slice(-800)}

For each action, return this structure in plain text:

ACTION N — [one-line title]
Priority: P0 | P1 | P2
Category: cost | pricing | collections | investment | tax/structure
Estimated impact: [cash range or percentage, qualified with confidence]
Effort: hours to execute
Owner: role responsible
Dependencies: [if any]
Concrete steps (3-5 bullets)
Measurable outcome

Separate each action with a blank line. Order from highest priority first. No generic "hire a CFO" advice — every action must be something the owner can start this week.`;

    const actionPlan = await chatWithCascade({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: actionPrompt }],
      maxTokens: 1800,
      temperature: 0.45,
    });
    totalTokens += actionPlan.promptTokens + actionPlan.completionTokens;
    outputs.action_plan = actionPlan.text;
    outputs.action_plan_model = actionPlan.modelUsed;
    await ctx.emit('output', 'action_plan', '5 prioritized actions ready', {
      model: actionPlan.modelUsed,
      tierIndex: actionPlan.tierIndex,
      preview: actionPlan.text.slice(0, 200),
    });
    await ctx.persistOutputs(outputs);
    await ctx.emit('heartbeat', 'action_plan', 'stage complete');

    /* ── Wrap-up ───────────────────────────────────────────── */
    await ctx.emit('stage', 'complete', 'Finance Analyst cycle complete', {
      total_tokens: totalTokens,
      stages: 4,
      business,
      horizon,
    });

    return {
      outputs,
      status: 'succeeded',
      costTokens: totalTokens,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.emit('error', 'runtime', `Runtime failed: ${msg.slice(0, 200)}`);
    return {
      outputs,
      status: 'failed',
      errorMessage: msg,
      costTokens: totalTokens,
    };
  }
}
