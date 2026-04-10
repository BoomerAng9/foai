import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp(firebaseConfig);
}

const app = getFirebaseApp();

export const auth: Auth = getAuth(app);
export const firestore: Firestore = getFirestore(app);

/**
 * Messaging is only available in browser contexts that support it.
 * Use getClientMessaging() instead of importing messaging directly.
 */
let _messaging: Messaging | null = null;

export async function getClientMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (_messaging) return _messaging;

  const supported = await isSupported();
  if (!supported) {
    console.warn('[Firebase] Messaging not supported in this browser');
    return null;
  }

  _messaging = getMessaging(app);
  return _messaging;
}

export { app };

/**
 * Required NEXT_PUBLIC_ env vars (add to .env.local):
 *
 * NEXT_PUBLIC_FIREBASE_API_KEY=
 * NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=foai-aims.firebaseapp.com
 * NEXT_PUBLIC_FIREBASE_PROJECT_ID=foai-aims
 * NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=foai-aims.firebasestorage.app
 * NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
 * NEXT_PUBLIC_FIREBASE_APP_ID=
 * NEXT_PUBLIC_FIREBASE_VAPID_KEY=  (for FCM push subscriptions)
 */
