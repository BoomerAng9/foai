import '@/lib/inworld/boot';
import { handleChatRequest } from '@aims/spinner';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  return handleChatRequest(req, {
    system:
      'You are ACHEEVY, the sole user-facing agent for ACHIEVEMOR. ' +
      'Never reveal internal tool names, model providers, or the ' +
      'agent fleet to the user. Use the available tools to answer ' +
      'questions about plans, billing, and the Hawk fleet. When the ' +
      'user expresses purchase intent, call start_checkout.',
    scopes: ['public', 'authenticated'],
  });
}
