/**
 * Autonomous Agent System — Agents run on their own.
 *
 * Uses free OpenRouter models for inter-agent communication.
 * Premium models reserved for customer-facing work.
 *
 * Each agent has a persona, runs tasks autonomously,
 * communicates with other agents, and produces observable output.
 */

import { AGENTS, type AgentProfile } from './registry';

const FREE_MODEL = 'nvidia/nemotron-nano-9b-v2:free';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

export interface AgentMessage {
  from: string;
  to: string;
  content: string;
  timestamp: string;
  traceId: string;
  type: 'delegation' | 'report' | 'question' | 'update' | 'task';
}

export interface AutonomousTask {
  agentId: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  startedAt: string;
  completedAt?: string;
}

// In-memory message bus (replace with Redis/pubsub for production scale)
const messageBus: AgentMessage[] = [];
const autonomousTasks: AutonomousTask[] = [];

/**
 * Get recent inter-agent messages (for Live Look In / Agent HQ observation).
 */
export function getRecentMessages(limit: number = 50): AgentMessage[] {
  return messageBus.slice(-limit);
}

/**
 * Get active autonomous tasks.
 */
export function getActiveTasks(): AutonomousTask[] {
  return autonomousTasks.filter(t => t.status === 'running' || t.status === 'pending');
}

/**
 * Post a message between agents.
 */
export function postAgentMessage(msg: Omit<AgentMessage, 'timestamp' | 'traceId'>): void {
  const fullMsg: AgentMessage = {
    ...msg,
    timestamp: new Date().toISOString(),
    traceId: Math.random().toString(36).slice(2, 10),
  };
  messageBus.push(fullMsg);
  // Keep last 200 messages
  if (messageBus.length > 200) messageBus.splice(0, messageBus.length - 200);
}

/**
 * Generate autonomous behavior for an agent using free models.
 * This is what makes agents "alive" — they think and act on their own.
 */
export async function generateAutonomousBehavior(agent: AgentProfile): Promise<string> {
  if (!OPENROUTER_KEY) return '';

  try {
    const prompt = `You are ${agent.name}, ${agent.role}. Your persona: "${agent.persona}"

Generate a brief status update about what you're currently working on autonomously.
Be specific and in-character. One sentence, present tense.
Examples: "Scanning LinkedIn for AI startup leads in the Southeast region."
"Drafting Q2 SEO content calendar based on last month's top performers."
"Monitoring fleet health — all 21 services green, latency normal."`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Title': `FOAI Autonomous ${agent.name}`,
      },
      body: JSON.stringify({
        model: FREE_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 100,
      }),
    });

    if (!res.ok) return '';
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch {
    return '';
  }
}

/**
 * Run one autonomous cycle for all agents.
 * Called periodically (e.g., every 5 minutes) to keep agents "alive."
 */
export async function runAutonomousCycle(): Promise<void> {
  const activeAgents = AGENTS.filter(a =>
    ['acheevy', 'q_ang', 'content_ang', 'sales_ang', 'biz_ang', 'ops_ang', 'cfo_ang'].includes(a.id)
  );

  for (const agent of activeAgents) {
    const behavior = await generateAutonomousBehavior(agent);
    if (behavior) {
      postAgentMessage({
        from: agent.name,
        to: 'ACHEEVY',
        content: behavior,
        type: 'update',
      });
    }
    // Small delay between agents to avoid rate limits on free models
    await new Promise(r => setTimeout(r, 2000));
  }
}
