/**
 * GET /api/sqwaadrun/missions/mine
 *
 * Lists the authenticated user's own Sqwaadrun missions by prefix-
 * scanning the GCS artifacts bucket under customer/<user_id>/missions/.
 *
 * Returns:
 *   { missions: [{ missionId, createdAt, sizeBytes, gcsPath }], total }
 *
 * Security: Firebase ID token required. Caller can only list their
 * own prefix; there is no query param for user_id. The gateway writes
 * missions to customer/<user_id>/missions/<mission_id>/results.json +
 * manifest.json, so we list by prefix and dedupe mission_id.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

const ARTIFACTS_BUCKET =
  process.env.GCS_SQWAADRUN_ARTIFACTS_BUCKET ?? 'foai-sqwaadrun-artifacts';

function ensureApp() {
  if (getApps().length > 0) return;
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (envKey) {
    initializeApp({ credential: cert(JSON.parse(envKey)) });
  } else {
    initializeApp();
  }
}

function sanitizeUserId(uid: string): string {
  return uid.replace(/[^A-Za-z0-9_-]/g, '');
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing Authorization Bearer token' },
      { status: 401 },
    );
  }

  let userId: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
    userId = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired ID token' },
      { status: 401 },
    );
  }

  const safe = sanitizeUserId(userId);
  const prefix = `customer/${safe}/missions/`;

  ensureApp();
  const bucket = getStorage().bucket(ARTIFACTS_BUCKET);

  try {
    const [files] = await bucket.getFiles({ prefix });

    // Dedupe by mission id from path customer/<uid>/missions/<MISSION-ID>/<file>
    const missionMap = new Map<
      string,
      { missionId: string; createdAt: string; sizeBytes: number; gcsPath: string }
    >();

    for (const file of files) {
      const parts = file.name.split('/');
      if (parts.length < 4) continue;
      const missionId = parts[3];
      if (!missionId) continue;

      const meta = file.metadata;
      const sizeBytes = Number(meta.size ?? 0);
      const createdAt =
        (typeof meta.timeCreated === 'string' && meta.timeCreated) ||
        new Date().toISOString();

      const existing = missionMap.get(missionId);
      if (!existing) {
        missionMap.set(missionId, {
          missionId,
          createdAt,
          sizeBytes,
          gcsPath: `customer/${safe}/missions/${missionId}/`,
        });
      } else {
        existing.sizeBytes += sizeBytes;
        if (createdAt < existing.createdAt) existing.createdAt = createdAt;
      }
    }

    const missions = Array.from(missionMap.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

    return NextResponse.json({ missions, total: missions.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to list missions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
