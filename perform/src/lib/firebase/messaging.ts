// Client-side messaging helpers (browser only)
// Server-side helpers are in messaging-admin.ts

import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { getClientMessaging } from './client';

/**
 * Request notification permission and obtain an FCM registration token.
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
