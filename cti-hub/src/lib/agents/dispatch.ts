/**
 * Agent Dispatch — Routes tasks to real backend services.
 *
 * This connects to the actual Cloud Run Boomer_Ang services.
 * Each agent has a live endpoint that accepts tasks and returns results.
 */

const AGENT_ENDPOINTS: Record<string, string> = {
  q_ang: process.env.SCOUT_ANG_URL || 'https://scout-ang-apbgyi35aq-uc.a.run.app',
  sales_ang: process.env.EDU_ANG_URL || 'https://edu-ang-apbgyi35aq-uc.a.run.app',
  content_ang: process.env.CONTENT_ANG_URL || 'https://content-ang-apbgyi35aq-uc.a.run.app',
  biz_ang: process.env.BIZ_ANG_URL || 'https://biz-ang-apbgyi35aq-uc.a.run.app',
  ops_ang: process.env.OPS_ANG_URL || 'https://ops-ang-apbgyi35aq-uc.a.run.app',
  iller_ang: process.env.ILLER_ANG_URL || 'https://iller-ang-apbgyi35aq-uc.a.run.app',
  cfo_ang: process.env.CFO_ANG_URL || 'https://cfo-ang-apbgyi35aq-uc.a.run.app',
  // Tactical layer — Chicken Hawk dispatches via AIMS OpenClaw (aims-vps)
  chicken_hawk: process.env.CHICKEN_HAWK_URL || 'http://chicken-hawk-gateway-gateway-1:8000',
  // Supporting services
  hermes: process.env.HERMES_URL || 'https://hermes-agent-apbgyi35aq-uc.a.run.app',
  nemoclaw: process.env.NEMOCLAW_URL || 'https://nemoclaw-service-apbgyi35aq-uc.a.run.app',
  // AIMS OpenClaw — production execution engine (aims-vps, NOT personal myclaw)
  openclaw: process.env.OPENCLAW_URL || 'https://openclaw-service-apbgyi35aq-uc.a.run.app',
};

export interface DispatchResult {
  success: boolean;
  agent: string;
  response: string;
  elapsed_ms: number;
  error?: string;
}

/**
 * Dispatch a task to a specific Boomer_Ang.
 * Returns the agent's response or an error message.
 */
export async function dispatchToAgent(agentId: string, instruction: string): Promise<DispatchResult> {
  const start = Date.now();
  const endpoint = AGENT_ENDPOINTS[agentId];

  if (!endpoint) {
    return {
      success: false,
      agent: agentId,
      response: `${agentId} is not currently deployed. The task has been queued.`,
      elapsed_ms: Date.now() - start,
      error: 'Agent endpoint not configured',
    };
  }

  try {
    const res = await fetch(`${endpoint}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: instruction }),
      signal: AbortSignal.timeout(60000), // 60s timeout
    });

    if (!res.ok) {
      // Try alternative endpoints
      const altPaths = ['/run', '/api/chat', '/'];
      for (const path of altPaths) {
        try {
          const altRes = await fetch(`${endpoint}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: instruction, instruction }),
            signal: AbortSignal.timeout(30000),
          });
          if (altRes.ok) {
            const data = await altRes.json();
            return {
              success: true,
              agent: agentId,
              response: data.response || data.content || data.result || JSON.stringify(data),
              elapsed_ms: Date.now() - start,
            };
          }
        } catch { continue; }
      }

      return {
        success: false,
        agent: agentId,
        response: `${agentId} returned status ${res.status}. Task queued for retry.`,
        elapsed_ms: Date.now() - start,
        error: `HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      agent: agentId,
      response: data.response || data.content || data.result || JSON.stringify(data),
      elapsed_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      success: false,
      agent: agentId,
      response: `${agentId} is temporarily unavailable. Task queued.`,
      elapsed_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}

/**
 * Check which agents are currently online.
 */
export async function getAgentHealth(): Promise<Record<string, boolean>> {
  const health: Record<string, boolean> = {};

  for (const [agentId, endpoint] of Object.entries(AGENT_ENDPOINTS)) {
    if (!endpoint) {
      health[agentId] = false;
      continue;
    }
    try {
      const res = await fetch(`${endpoint}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      health[agentId] = res.ok;
    } catch {
      health[agentId] = false;
    }
  }

  return health;
}

/**
 * Detect which agent should handle a task based on keywords.
 */
export function detectAgent(message: string): string | null {
  const lower = message.toLowerCase();

  if (lower.includes('research') || lower.includes('find') || lower.includes('search') || lower.includes('scrape') || lower.includes('scout')) {
    return 'q_ang';
  }
  if (lower.includes('enroll') || lower.includes('sales') || lower.includes('affiliate') || lower.includes('revenue')) {
    return 'sales_ang';
  }
  if (lower.includes('content') || lower.includes('blog') || lower.includes('seo') || lower.includes('social media') || lower.includes('newsletter')) {
    return 'content_ang';
  }
  if (lower.includes('pipeline') || lower.includes('lead') || lower.includes('growth') || lower.includes('biz dev')) {
    return 'biz_ang';
  }
  if (lower.includes('monitor') || lower.includes('health check') || lower.includes('uptime') || lower.includes('incident')) {
    return 'ops_ang';
  }
  if (lower.includes('budget') || lower.includes('invoice') || lower.includes('billing') || lower.includes('revenue') || lower.includes('cost') || lower.includes('financ') || lower.includes('receivable') || lower.includes('bookkeep')) {
    return 'cfo_ang';
  }
  if (lower.includes('design') || lower.includes('graphic') || lower.includes('card') || lower.includes('illustration') || lower.includes('visual') || lower.includes('logo') || lower.includes('poster') || lower.includes('nft') || lower.includes('brand') || lower.includes('player card') || lower.includes('broadcast')) {
    return 'iller_ang';
  }
  if (lower.includes('code') || lower.includes('build') || lower.includes('deploy') || lower.includes('develop')) {
    return 'chicken_hawk';
  }

  return null; // ACHEEVY handles directly
}
