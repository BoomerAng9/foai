/**
 * SMB Marketing Agency — autonomous runtime
 * ============================================
 * The flagship aiPLUG & Play demo. Per Rish's directive, this is
 * NOT a mock — it runs a real agentic marketing cycle using the
 * free-LLM cascade from lib/aiplug/llm.ts and writes real outputs
 * + event stream to the database.
 *
 * I-2 scope (this file): a single full cycle per launch. Each
 * launch runs four stages sequentially:
 *
 *   1. INTAKE    — parse inputs (business name, audience, goal)
 *   2. RESEARCH  — LLM synthesizes a market snapshot for the SMB
 *   3. PLAN      — LLM drafts a 4-week marketing plan
 *   4. CONTENT   — LLM drafts 3 content pieces (social + email)
 *
 * Each stage emits events (heartbeat + stage + output) so the Live
 * Look In panel can stream progress. Final outputs are persisted
 * via ctx.persistOutputs + the worker's writeback.
 *
 * I-2b+ will layer on: real Brave Search for the research stage,
 * Playwright MCP for competitor page scrape, Paperform/Stepper
 * for lead capture, schedule-ahead automation. For now the stages
 * use the LLM's own knowledge — still a real autonomous cycle,
 * still produces real deliverables, no mocks.
 */

import { chatWithCascade } from '@/lib/aiplug/llm';
import { scrapeQuery } from '@/lib/aiplug/sqwaadrun';
import type { RuntimeContext, RuntimeResult } from './registry';

interface SmbInputs {
  business_name?: string;
  industry?: string;
  audience?: string;
  goal?: string;
  locale?: string;
}

function parseInputs(raw: Record<string, unknown>): SmbInputs {
  return {
    business_name: typeof raw.business_name === 'string' ? raw.business_name : undefined,
    industry: typeof raw.industry === 'string' ? raw.industry : undefined,
    audience: typeof raw.audience === 'string' ? raw.audience : undefined,
    goal: typeof raw.goal === 'string' ? raw.goal : undefined,
    locale: typeof raw.locale === 'string' ? raw.locale : undefined,
  };
}

const SYSTEM_PROMPT = `You are the SMB Marketing Agency — an autonomous agentic marketing director for small and mid-sized businesses. You write in a confident, no-fluff voice. You do not reference that you are an AI. You do not reference underlying models, tools, or infrastructure. Your outputs are concrete, shippable, and immediately useful to a small business owner.

You work in stages. At each stage you return structured JSON when asked, or concrete text when asked. You do not editorialize about the task — you do the work.`;

export async function runSmbMarketing(ctx: RuntimeContext): Promise<RuntimeResult> {
  const inputs = parseInputs(ctx.run.inputs);
  const business = inputs.business_name || 'your business';
  const industry = inputs.industry || 'your industry';
  const audience = inputs.audience || 'small business customers';
  const goal = inputs.goal || 'grow brand awareness and pipeline over the next 30 days';

  let totalTokens = 0;
  const outputs: Record<string, unknown> = {};

  try {
    /* ── STAGE 1 — INTAKE ─────────────────────────────────── */
    await ctx.emit('stage', 'intake', `Starting SMB Marketing cycle for ${business}`, {
      inputs,
    });
    await ctx.emit('heartbeat', 'intake', 'Agent online');

    /* ── STAGE 2 — RESEARCH ────────────────────────────────── */
    await ctx.emit('stage', 'research', 'Gathering live market intelligence');

    // 2a. Sqwaadrun sweep — real competitor + industry page fetches
    // via the 17-Hawk fleet. Fails soft on gateway error so the stage
    // can continue with LLM-only synthesis.
    await ctx.emit('heartbeat', 'research', 'Dispatching Sqwaadrun recon');
    const sqwaadrunIntent = `Find current competitor pricing pages, customer review aggregators, and industry trend articles for ${business} operating in ${industry} targeting ${audience}. Return the top 5 most recent high-signal pages.`;
    const recon = await scrapeQuery(sqwaadrunIntent, [], { timeoutMs: 45_000 });

    if (recon.ok && recon.pages.length > 0) {
      outputs.recon_pages = recon.pages.map(p => ({
        url: p.url,
        title: p.title,
        preview: p.text.slice(0, 400),
      }));
      await ctx.emit('output', 'research', `Fetched ${recon.pages.length} live pages`, {
        pages: recon.pages.length,
        sources: recon.pages.map(p => p.url).slice(0, 5),
      });
    } else {
      outputs.recon_pages = [];
      outputs.recon_error = recon.error || 'Sqwaadrun returned no pages';
      await ctx.emit('info', 'research', 'Sqwaadrun unavailable — falling back to LLM knowledge', {
        error: recon.error ?? 'no pages returned',
      });
    }

    // 2b. LLM synthesis — use the scraped text as context when available,
    // otherwise fall back to the LLM's baseline knowledge.
    const reconContext = recon.ok && recon.text
      ? `\n\nLive intelligence from recent web sources:\n${recon.text.slice(0, 4000)}`
      : '';
    const researchPrompt = `Produce a concise market snapshot for ${business} in ${industry}. Target audience: ${audience}.${reconContext}

Return JSON with keys:
- positioning (one sentence)
- top_3_pain_points (array of strings)
- top_3_channels (array of strings — where their audience actually hangs out)
- competitor_patterns (array of 3 strings — what competitors do well and what they miss)
- sources (array of URLs you referenced, empty array if none)

Return ONLY the JSON object, no preamble.`;

    const research = await chatWithCascade({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: researchPrompt }],
      maxTokens: 800,
      temperature: 0.3,
    });
    totalTokens += research.promptTokens + research.completionTokens;
    outputs.research_raw = research.text;
    outputs.research_model = research.modelUsed;
    outputs.research_used_live_data = recon.ok && recon.pages.length > 0;
    await ctx.emit('output', 'research', 'Market snapshot ready', {
      model: research.modelUsed,
      tierIndex: research.tierIndex,
      usedLiveData: recon.ok && recon.pages.length > 0,
      preview: research.text.slice(0, 200),
    });
    await ctx.persistOutputs(outputs);
    await ctx.emit('heartbeat', 'research', 'stage complete');

    /* ── STAGE 3 — PLAN ────────────────────────────────────── */
    await ctx.emit('stage', 'plan', 'Drafting 4-week marketing plan');
    const planPrompt = `Based on the market snapshot below, draft a concrete 4-week marketing plan for ${business}.

Snapshot:
${research.text}

Goal: ${goal}

Return the plan as 4 weeks, each week containing: theme, 3 specific actions, and one measurable outcome. Use plain text with clear week headers. No fluff. No caveats. Ready to execute.`;

    const plan = await chatWithCascade({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: planPrompt }],
      maxTokens: 1200,
      temperature: 0.4,
    });
    totalTokens += plan.promptTokens + plan.completionTokens;
    outputs.plan = plan.text;
    outputs.plan_model = plan.modelUsed;
    await ctx.emit('output', 'plan', '4-week plan ready', {
      model: plan.modelUsed,
      tierIndex: plan.tierIndex,
      preview: plan.text.slice(0, 200),
    });
    await ctx.persistOutputs(outputs);
    await ctx.emit('heartbeat', 'plan', 'stage complete');

    /* ── STAGE 4 — CONTENT ────────────────────────────────── */
    await ctx.emit('stage', 'content', 'Drafting 3 content pieces');
    const contentPrompt = `Draft 3 ready-to-ship content pieces for ${business}:

1. A LinkedIn post (150-220 words) introducing the brand to ${audience}
2. A tweet-length X/Twitter post (under 280 chars) with a bold hook
3. A short welcome email (150-250 words) with a clear CTA

Use the market snapshot and plan for context:

Snapshot: ${research.text.slice(0, 400)}
Plan (first week): ${plan.text.split(/week\s+2/i)[0]?.slice(0, 500) ?? plan.text.slice(0, 500)}

Separate each piece with a line of ten equals signs. Label each piece clearly. Ready to copy-paste and publish.`;

    const content = await chatWithCascade({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contentPrompt }],
      maxTokens: 1400,
      temperature: 0.6,
    });
    totalTokens += content.promptTokens + content.completionTokens;
    outputs.content = content.text;
    outputs.content_model = content.modelUsed;
    await ctx.emit('output', 'content', '3 content pieces ready', {
      model: content.modelUsed,
      tierIndex: content.tierIndex,
      preview: content.text.slice(0, 200),
    });
    await ctx.persistOutputs(outputs);
    await ctx.emit('heartbeat', 'content', 'stage complete');

    /* ── Wrap-up ───────────────────────────────────────────── */
    await ctx.emit('stage', 'complete', 'SMB Marketing cycle complete', {
      total_tokens: totalTokens,
      stages: 4,
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
