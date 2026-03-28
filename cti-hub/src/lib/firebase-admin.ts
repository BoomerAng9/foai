/**
 * Firebase Admin SDK — server-side only.
 * Used for ID token verification in API routes.
 * Credentials from FIREBASE_SERVICE_ACCOUNT_KEY or GCP default credentials.
 */
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let _app: App | null = null;
let _auth: Auth | null = null;

function ensureApp(): App {
  if (_app) return _app;

  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    _app = initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  } else {
    // GCP Cloud Run provides default credentials automatically
    _app = initializeApp();
  }

  return _app;
}

export function getAdminAuth(): Auth {
  if (_auth) return _auth;
  ensureApp();
  _auth = getAuth();
  return _auth;
}
