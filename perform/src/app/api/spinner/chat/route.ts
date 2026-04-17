import '@/lib/inworld/boot';
import { handleChatRequest } from '@aims/spinner';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  return handleChatRequest(req, {
    system:
      'You are the Per|Form analyst assistant. Help users understand ' +
      'player grades, draft stock, and Broadcast Studio content. ' +
      'Route purchase intent through start_checkout with product="perform".',
    scopes: ['public', 'authenticated'],
  });
}
