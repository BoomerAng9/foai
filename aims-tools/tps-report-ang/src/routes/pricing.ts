/**
 * Pricing routes for TPS_Report_Ang.
 * Thin Express handlers that wrap the pure pricing-overseer service.
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  promptToPlan,
  whatIf,
  visualize,
  explain,
  tokenBalance,
} from '../services/pricing-overseer.js';
import { promptToPlanWithLlm } from '../services/prompt-to-plan-llm.js';

export const pricingRouter = Router();

// ─── POST /api/pricing/prompt-to-plan ───────────────────────────────

const PromptToPlanBody = z.object({
  prompt: z.string().min(1),
  budgetUsdMonthly: z.number().positive().optional(),
  knownTaskMix: z.record(z.string(), z.number()).optional(),
  // ?llm=false flag forces the deterministic heuristic. Default is LLM.
  useLlm: z.boolean().optional(),
});

pricingRouter.post('/prompt-to-plan', async (req: Request, res: Response) => {
  const parsed = PromptToPlanBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  // Default path: LLM with heuristic fallback. Set { useLlm: false } to
  // force deterministic only.
  const useLlm = parsed.data.useLlm !== false;
  const result = useLlm
    ? await promptToPlanWithLlm(parsed.data)
    : promptToPlan(parsed.data);
  return res.json(result);
});

// ─── POST /api/pricing/what-if ──────────────────────────────────────

const WhatIfBody = z.object({
  frequency: z.enum(['3-month', '6-month', '9-month', 'ppu']),
  group: z.enum(['individual', 'family', 'team', 'enterprise']),
  toolIds: z.array(z.string()),
  taskMix: z.record(z.string(), z.number()).optional(),
  pillars: z
    .object({
      confidence: z.enum(['standard', 'verified', 'guaranteed']).optional(),
      convenience: z.enum(['standard', 'priority', 'instant']).optional(),
      security: z.enum(['essential', 'professional', 'fortress']).optional(),
    })
    .optional(),
});

pricingRouter.post('/what-if', (req: Request, res: Response) => {
  const parsed = WhatIfBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const result = whatIf(parsed.data);
  return res.json(result);
});

// ─── GET /api/pricing/visualize ─────────────────────────────────────

pricingRouter.get('/visualize', (req: Request, res: Response) => {
  const sector = typeof req.query.sector === 'string' ? req.query.sector : undefined;
  const tier = typeof req.query.tier === 'string' ? req.query.tier : undefined;
  const preferDesign = req.query.preferDesign === 'true';
  const result = visualize({ sector, tier, preferDesign });
  return res.json(result);
});

// ─── GET /api/pricing/explain/:rowId ────────────────────────────────

pricingRouter.get('/explain/:rowId', (req: Request, res: Response) => {
  const rowId = req.params.rowId;
  if (!rowId) return res.status(400).json({ error: 'rowId required' });
  const result = explain(rowId);
  if (!result.ok) return res.status(404).json(result);
  return res.json(result);
});

// ─── GET /api/pricing/balance/:userId ───────────────────────────────
// Stub — Lil_Hawk fee-watcher team will populate this once billing
// tables exist.

pricingRouter.get('/balance/:userId', (req: Request, res: Response) => {
  const userId = req.params.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const result = tokenBalance(userId);
  return res.json(result);
});

// ─── GET /api/pricing/health ────────────────────────────────────────

pricingRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    agent: 'tps_report_ang',
    capabilities: ['prompt-to-plan', 'what-if', 'visualize', 'explain', 'balance-stub'],
    speakly: true, // @SPEAKLY skill present
    backedBy: 'free-tier LLM via OpenRouter',
    lilHawkTeam: 'stub',
  });
});
