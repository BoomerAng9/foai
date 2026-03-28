import { agentFleet } from '../core_runtime/agent_fleet';
import { createOpenRouterChatCompletion } from '../lib/ai/openrouter';

export type BoomerAngRole = 'researcher' | 'coder' | 'analyst';

export interface BoomerAngTask {
  id: string;
  role: BoomerAngRole;
  directive: string;
  context: Record<string, unknown>;
}

export interface BoomerAngResult {
  name: string;
  agent_id: string;
  role: BoomerAngRole;
  provider: string;
  summary: string;
  content: string;
  completed_at: string;
}

export const boomerAngs = {
  execute: async (task: BoomerAngTask) => {
    const agent = agentFleet.getByExecutionRole(task.role);
    console.log(`Boomer_Ang [${task.role.toUpperCase()}]: Executing directive: ${task.directive}`);

    const systemPrompts = {
      researcher: "You are a specialized deep research agent. Provide detailed findings, facts, and citations for the given directive.",
      coder: "You are a specialized coding agent. Provide production-grade code, architecture patterns, and implementation details.",
      analyst: "You are a specialized analysis agent. Provide strategic insights, risk assessments, and executive summaries."
    };

    try {
      const completion = await createOpenRouterChatCompletion({
        messages: [
          { role: 'system', content: systemPrompts[task.role] },
          { role: 'user', content: `Directive: ${task.directive}\nContext: ${JSON.stringify(task.context)}` }
        ],
        model: 'openai/gpt-4o-mini',
        inputMode: 'text',
      });

      const result: BoomerAngResult = {
        name: agent?.name ?? `Boomer_Ang ${task.role}`,
        agent_id: agent?.id ?? task.role,
        role: task.role,
        provider: agent?.provider ?? 'OpenRouter',
        summary: `${task.role} completed step ${task.id} for the active workload.`,
        content: completion.content,
        completed_at: new Date().toISOString(),
      };

      return { status: 'completed', result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown execution error';
      console.error(`Boomer_Ang Error:`, error);
      return { status: 'failed', error: message };
    }
  }
};
