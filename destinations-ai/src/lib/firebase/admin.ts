import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

/**
 * Firebase Admin SDK — server-only.
 *
 * Matches foai convention (perform/src/lib/firebase/admin.ts): discrete
 * FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env
 * vars, not a JSON blob. The private key's newlines are escaped in env
 * storage and unescaped at init time.
 *
 * Never import this from client components — Admin credentials must never
 * ship to the browser.
 */

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length && existing[0]) return existing[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      '[destinations-ai/firebase/admin] Missing credentials — ' +
        'set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.',
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
