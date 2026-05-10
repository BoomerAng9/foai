/**
 * GET /api/sqwaadrun/missions/[id]/download?format=json|manifest
 *
 * Returns a time-limited (15-min) GCS v4 signed URL for the caller's
 * own mission artifact. The route enforces that the mission lives
 * under the authenticated user's customer/<user_id>/missions/<id>/
 * prefix — a cross-tenant mission-id guess returns 404, never the
 * file.
 *
 * Supported format values:
 *   - json      → results.json (full scrape payload + KPIs)
 *   - manifest  → manifest.json (intent, targets, config, created_at)
 *
 * Response: { downloadUrl, expiresAt, format, missionId, sizeBytes }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

const ARTIFACTS_BUCKET =
  process.env.GCS_SQWAADRUN_ARTIFACTS_BUCKET ?? 'foai-sqwaadrun-artifacts';
const SIGNED_URL_TTL_MS = 15 * 60 * 1000;

const ALLOWED_FORMATS = {
  json: 'results.json',
  manifest: 'manifest.json',
} as const;
type FormatKey = keyof typeof ALLOWED_FORMATS;

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

function sanitizeMissionId(id: string): string {
  // Mission IDs are MISSION-<int> in the gateway. Accept A-Z 0-9 dash underscore only.
  return id.replace(/[^A-Za-z0-9_-]/g, '');
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;

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

  const missionId = sanitizeMissionId(rawId);
  if (!missionId) {
    return NextResponse.json(
      { error: 'Invalid mission id' },
      { status: 400 },
    );
  }

  const formatParam = (request.nextUrl.searchParams.get('format') ?? 'json') as FormatKey;
  const fileName = ALLOWED_FORMATS[formatParam];
  if (!fileName) {
    return NextResponse.json(
      {
        error: `Invalid format. Choose one of: ${Object.keys(ALLOWED_FORMATS).join(', ')}`,
      },
      { status: 400 },
    );
  }

  const safe = sanitizeUserId(userId);
  const gcsPath = `customer/${safe}/missions/${missionId}/${fileName}`;

  ensureApp();
  const bucket = getStorage().bucket(ARTIFACTS_BUCKET);
  const file = bucket.file(gcsPath);

  try {
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json(
        { error: 'Mission artifact not found' },
        { status: 404 },
      );
    }

    const expiresAt = Date.now() + SIGNED_URL_TTL_MS;
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expiresAt,
    });

    const [metadata] = await file.getMetadata();
    const sizeBytes = Number(metadata.size ?? 0);

    return NextResponse.json({
      downloadUrl: signedUrl,
      expiresAt: new Date(expiresAt).toISOString(),
      format: formatParam,
      missionId,
      sizeBytes,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to sign download URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
