import { getAdminMessaging } from '@/lib/firebase/admin';

/**
 * Server-side push notification triggers.
 *
 * Each function sends a Firebase Cloud Messaging push to a topic.
 * These run server-side only (inside API routes / server actions).
 */

interface PushPayload {
  topic: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

async function sendPush(payload: PushPayload): Promise<string | null> {
  try {
    const messaging = getAdminMessaging();
    const messageId = await messaging.send({
      topic: payload.topic,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
    });
    console.log(`[notifications] Sent to topic "${payload.topic}": ${messageId}`);
    return messageId;
  } catch (err) {
    console.error(`[notifications] Failed to send to topic "${payload.topic}":`, err);
    return null;
  }
}

// ── Trigger: New podcast episode published ──────────────────────

interface EpisodePayload {
  id?: number | null;
  title: string;
  analyst?: { id?: string; name?: string };
}

export async function notifyNewEpisode(episode: EpisodePayload): Promise<string | null> {
  const analystName = episode.analyst?.name || 'Per|Form Analyst';
  return sendPush({
    topic: 'new-content',
    title: `New Episode: ${episode.title}`,
    body: `${analystName} just dropped a new take. Tune in now.`,
    data: {
      type: 'podcast_episode',
      episodeId: String(episode.id ?? ''),
    },
  });
}

// ── Trigger: Draft update / breaking news ────────────────────────

export async function notifyDraftUpdate(message: string): Promise<string | null> {
  return sendPush({
    topic: 'draft-updates',
    title: 'Draft Update',
    body: message,
    data: { type: 'draft_update' },
  });
}

// ── Trigger: New Huddle post ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function notifyNewHuddlePost(post: any): Promise<string | null> {
  const preview = post.content.length > 100
    ? post.content.slice(0, 97) + '...'
    : post.content;
  return sendPush({
    topic: 'huddle',
    title: `New in The Huddle`,
    body: preview,
    data: {
      type: 'huddle_post',
      postId: String(post.id ?? ''),
      analystId: post.analyst_id,
    },
  });
}
