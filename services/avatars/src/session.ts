import { config } from './config.js';

export interface Session {
  userId: string;
  email?: string;
  role?: string;
  expiresAt: number;
}

// Simple in-memory LRU. Cloud Run instances are ephemeral but a single instance
// will reuse cached sessions for ~1 hour, the same window the Worker used.
const SESSION_CACHE = new Map<string, Session>();
const SESSION_TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 5_000;

function evictExpired() {
  const now = Date.now();
  for (const [k, v] of SESSION_CACHE) {
    if (v.expiresAt < now) SESSION_CACHE.delete(k);
  }
  // Hard cap: drop oldest insertion
  while (SESSION_CACHE.size > MAX_ENTRIES) {
    const first = SESSION_CACHE.keys().next().value;
    if (!first) break;
    SESSION_CACHE.delete(first);
  }
}

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function validateWithSupabase(token: string): Promise<Session | null> {
  try {
    const r = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.supabaseServiceKey,
      },
    });
    if (!r.ok) return null;
    const user = await r.json() as { id: string; email?: string; role?: string };
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
  } catch (err) {
    console.error('[avatars] supabase validation error', err);
    return null;
  }
}

export async function validateSession(authHeader: string | undefined): Promise<Session | null> {
  const token = extractToken(authHeader);
  if (!token) return null;

  evictExpired();
  const cached = SESSION_CACHE.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    cached.expiresAt = Date.now() + SESSION_TTL_MS; // sliding window
    return cached;
  }

  const session = await validateWithSupabase(token);
  if (session) SESSION_CACHE.set(token, session);
  return session;
}
