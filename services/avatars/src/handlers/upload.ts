import type { Context } from 'hono';
import { CHARTER } from '../config.js';
import { validateSession } from '../session.js';
import { isValidImageFile, isOversize, processImageBuffer } from '../image.js';
import { moderateImage } from '../moderation.js';
import { generateStorageKey, publicUrlFor, uploadAvatar } from '../storage.js';
import { logModeration, updateProfile } from '../supabase.js';

export async function uploadHandler(c: Context) {
  const session = await validateSession(c.req.header('Authorization'));
  if (!session) return c.json({ error: CHARTER.UNAUTHORIZED }, 401);

  const form = await c.req.parseBody();
  const file = form['avatar'];
  if (!(file instanceof File)) {
    return c.json({ error: 'Missing avatar file' }, 400);
  }
  if (!isValidImageFile({ type: file.type, size: file.size })) {
    return c.json(
      { error: isOversize(file.size) ? CHARTER.FILE_TOO_LARGE : CHARTER.INVALID_FILE },
      400,
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const processed = await processImageBuffer(buf);
  const moderation = await moderateImage(processed.buffer);

  if (!moderation.approved) {
    await logModeration({
      user_id: session.userId,
      avatar_url: 'rejected',
      status: 'rejected',
      reason: moderation.reason,
      confidence_score: moderation.confidence,
      api_cost: 0,
      created_at: new Date().toISOString(),
    });
    return c.json({ success: false, message: moderation.reason, allowed: false }, 400);
  }

  const key = generateStorageKey(session.userId);
  const ok = await uploadAvatar(key, processed.buffer);
  if (!ok) return c.json({ error: CHARTER.SERVER_ERROR }, 500);

  const cdnUrl = publicUrlFor(key);
  const updated = await updateProfile({
    userId: session.userId,
    avatar_gcs_key: key,
    avatar_cdn_url: cdnUrl,
    avatar_uploaded_at: new Date().toISOString(),
  });
  if (!updated) return c.json({ error: CHARTER.SERVER_ERROR }, 500);

  await logModeration({
    user_id: session.userId,
    avatar_url: cdnUrl,
    status: 'approved',
    reason: CHARTER.MODERATION_PASSED,
    confidence_score: moderation.confidence,
    api_cost: 0,
    created_at: new Date().toISOString(),
  });

  return c.json({ success: true, message: CHARTER.UPLOAD_SUCCESS, avatar_url: cdnUrl });
}
