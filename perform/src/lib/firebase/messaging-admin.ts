// Server-side messaging helpers (Node.js only)
// Client-side helpers are in messaging.ts

import { getAdminMessaging } from './admin';

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
