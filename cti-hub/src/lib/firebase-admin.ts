/**
 * Firebase Admin SDK — server-side only.
 * Used for ID token verification in API routes.
 * Credentials from FIREBASE_SERVICE_ACCOUNT_KEY or GCP default credentials.
 */
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { readFileSync, existsSync } from 'fs';

let _app: App | null = null;
let _auth: Auth | null = null;

function loadServiceAccount(): Record<string, string> | null {
  // Try env var first
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (envKey) return JSON.parse(envKey);

  // Try key file (for Docker deployments where env_file can't handle JSON)
  const keyPaths = ['/app/firebase-sa-key.json', './firebase-sa-key.json'];
  for (const p of keyPaths) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf-8'));
  }
  return null;
}

function ensureApp(): App {
  if (_app) return _app;

  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const sa = loadServiceAccount();
  if (sa) {
    _app = initializeApp({ credential: cert(sa) });
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
