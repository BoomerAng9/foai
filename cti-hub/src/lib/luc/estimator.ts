import type { LucEstimate, LucLineItem } from './types';

const ESTIMATION_MODEL = 'qwen/qwen3.5-flash-02-23';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;

interface EstimateInput {
  message: string;
  tier: string;
  hasAttachments: boolean;
  attachmentCount: number;
}

export async function generateEstimate(input: EstimateInput): Promise<LucEstimate> {
  const items: LucLineItem[] = [];
  let totalTokens = 0;
  let totalCost = 0;

  let estimatedResponseTokens = 500;
  if (OPENROUTER_API_KEY) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'X-OpenRouter-Title': 'The Deploy Platform - LUC',
        },
        body: JSON.stringify({
          model: ESTIMATION_MODEL,
          messages: [
            { role: 'system', content: 'You estimate token counts for AI tasks. Reply with ONLY a number: the estimated output tokens needed to fully respond to this user message. Consider complexity, research needs, and length. Just the number, nothing else.' },
            { role: 'user', content: input.message.slice(0, 500) },
          ],
          temperature: 0,
          max_tokens: 20,
        }),
      });
      const data = await res.json();
      const parsed = parseInt(data.choices?.[0]?.message?.content?.trim() || '500');
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
        estimatedResponseTokens = parsed;
      }
    } catch {}
  }

  const estimatedInputTokens = Math.ceil(input.message.length / 4) + 800;
  const chatTokens = estimatedInputTokens + estimatedResponseTokens;

  const tierPricing: Record<string, { in_rate: number; out_rate: number; label: string }> = {
    'premium': { in_rate: 0.30, out_rate: 1.20, label: 'AI analysis & response' },
    'bucket-list': { in_rate: 1.50, out_rate: 7.50, label: 'AI analysis & response (enhanced)' },
    'lfg': { in_rate: 3.00, out_rate: 15.00, label: 'AI analysis & response (maximum)' },
  };
  const pricing = tierPricing[input.tier] || tierPricing['premium'];
  const chatCost = (estimatedInputTokens / 1_000_000) * pricing.in_rate +
                   (estimatedResponseTokens / 1_000_000) * pricing.out_rate;

  items.push({ service: pricing.label, tokens: chatTokens, cost: chatCost });
  totalTokens += chatTokens;
  totalCost += chatCost;

  if (input.hasAttachments) {
    const attachCost = input.attachmentCount * 0.002;
    items.push({ service: `File processing (${input.attachmentCount} files)`, cost: attachCost });
    totalCost += attachCost;
  }

  const memoryCost = 0.001;
  items.push({ service: 'Memory recall', cost: memoryCost });
  totalCost += memoryCost;

  return {
    id: `luc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tier: input.tier,
    items,
    total_tokens: totalTokens,
    total_cost: Math.round(totalCost * 1_000_000) / 1_000_000,
    created_at: new Date().toISOString(),
  };
}
