import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { getClientMessaging } from './client';
import { getAdminMessaging } from './admin';

// ---------------------------------------------------------------------------
// Client-side helpers (browser only)
// ---------------------------------------------------------------------------

/**
 * Request notification permission and obtain an FCM registration token.
 * Returns the token string, or null if permission was denied or messaging
 * is unavailable.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[FCM] Notification permission denied');
    return null;
  }

  const messaging = await getClientMessaging();
  if (!messaging) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error('[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set');
    return null;
  }

  try {
    const token = await getToken(messaging, { vapidKey });
    return token;
  } catch (err) {
    console.error('[FCM] Failed to get token:', err);
    return null;
  }
}

/**
 * Listen for foreground push messages.
 * Returns an unsubscribe function.
 */
export function onMessageListener(
  callback: (payload: MessagePayload) => void,
): () => void {
  let unsubscribe: (() => void) | null = null;

  getClientMessaging().then((messaging) => {
    if (!messaging) return;
    unsubscribe = onMessage(messaging, callback);
  });

  return () => {
    unsubscribe?.();
  };
}

// ---------------------------------------------------------------------------
// Server-side helpers (Node.js only)
// ---------------------------------------------------------------------------

/**
 * Subscribe one or more FCM tokens to a topic.
 */
export async function subscribeToTopic(
  tokens: string | string[],
  topic: string,
): Promise<void> {
  const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
  const response = await getAdminMessaging().subscribeToTopic(tokenArray, topic);

  if (response.failureCount > 0) {
    console.error(
      '[FCM] subscribeToTopic partial failure:',
      response.errors,
    );
  }
}

/**
 * Unsubscribe one or more FCM tokens from a topic.
 */
export async function unsubscribeFromTopic(
  tokens: string | string[],
  topic: string,
): Promise<void> {
  const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
  const response = await getAdminMessaging().unsubscribeFromTopic(tokenArray, topic);

  if (response.failureCount > 0) {
    console.error(
      '[FCM] unsubscribeFromTopic partial failure:',
      response.errors,
    );
  }
}
