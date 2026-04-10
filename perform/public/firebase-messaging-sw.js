/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging Service Worker
 *
 * Handles background push notifications when the app is not in the foreground.
 * The Firebase config values are injected at registration time or can be
 * hard-coded here since service workers cannot access process.env.
 *
 * To inject config at runtime, register this SW with a query string:
 *   navigator.serviceWorker.register(
 *     `/firebase-messaging-sw.js?apiKey=${cfg.apiKey}&projectId=${cfg.projectId}...`
 *   )
 * Or replace the placeholders below with actual values during your build step.
 */

importScripts(
  'https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js',
);

// Parse config from URL search params (set during SW registration)
const urlParams = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: urlParams.get('apiKey') || '',
  authDomain: urlParams.get('authDomain') || '',
  projectId: urlParams.get('projectId') || 'foai-aims',
  storageBucket: urlParams.get('storageBucket') || '',
  messagingSenderId: urlParams.get('messagingSenderId') || '',
  appId: urlParams.get('appId') || '',
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, image } = payload.notification || {};

  const notificationTitle = title || 'Per|Form';
  const notificationOptions = {
    body: body || '',
    icon: '/brand/perform-icon.png',
    badge: '/brand/perform-badge.png',
    ...(image ? { image } : {}),
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open the app or focus existing tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
