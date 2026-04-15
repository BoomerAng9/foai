import type { Context } from 'hono';
import { CHARTER } from '../config.js';
import { validateSession } from '../session.js';
import { decodeBase64Image, processImageBuffer } from '../image.js';
import { moderateImage } from '../moderation.js';
import { logModeration } from '../supabase.js';

export async function moderateHandler(c: Context) {
  const session = await validateSession(c.req.header('Authorization'));
  if (!session) return c.json({ error: CHARTER.UNAUTHORIZED }, 401);

  let body: { imageBase64?: string; userId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }
  if (!body.imageBase64 || !body.userId) {
    return c.json({ error: 'Missing required fields: imageBase64, userId' }, 400);
  }
  if (body.userId !== session.userId) {
    return c.json({ error: CHARTER.UNAUTHORIZED }, 403);
  }

  const raw = decodeBase64Image(body.imageBase64);
  const processed = await processImageBuffer(raw);
  const result = await moderateImage(processed.buffer);

  await logModeration({
    user_id: body.userId,
    avatar_url: 'pending',
    status: result.approved ? 'approved' : 'rejected',
    reason: result.reason,
    confidence_score: result.confidence,
    api_cost: 0,
    created_at: new Date().toISOString(),
  });

  return c.json({
    success: result.approved,
    message: result.reason,
    allowed: result.approved,
    confidence: result.confidence,
  }, result.approved ? 200 : 400);
}
