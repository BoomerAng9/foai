import { config } from './config.js';

export interface ProfileUpdate {
  userId: string;
  avatar_gcs_key?: string;
  avatar_cdn_url?: string;
  avatar_uploaded_at?: string;
}

export interface ModerationLog {
  user_id: string;
  avatar_url: string;
  status: 'approved' | 'rejected';
  reason: string;
  confidence_score: number;
  api_cost: number;
  created_at: string;
}

const headers = () => ({
  Authorization: `Bearer ${config.supabaseServiceKey}`,
  apikey: config.supabaseServiceKey,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
});

export async function updateProfile(update: ProfileUpdate): Promise<boolean> {
  try {
    const r = await fetch(
      `${config.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(update.userId)}`,
      { method: 'PATCH', headers: headers(), body: JSON.stringify({
        avatar_r2_url: update.avatar_gcs_key, // legacy column kept for backwards compat
        avatar_cdn_url: update.avatar_cdn_url,
        avatar_uploaded_at: update.avatar_uploaded_at,
      }) },
    );
    if (!r.ok) {
      console.error('[avatars] profile update failed', r.status, await r.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[avatars] profile update error', err);
    return false;
  }
}

export async function logModeration(log: ModerationLog): Promise<void> {
  try {
    const r = await fetch(`${config.supabaseUrl}/rest/v1/moderation_logs`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(log),
    });
    if (!r.ok) console.error('[avatars] moderation log failed', r.status);
  } catch (err) {
    console.error('[avatars] moderation log error', err);
  }
}
