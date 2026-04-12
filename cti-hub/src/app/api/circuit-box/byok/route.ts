import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';
import crypto from 'crypto';

/* ── Simple AES-256-GCM encryption for stored keys ────────────── */
// In production this should use CMEK from GCP KMS. For now, uses
// a server-side secret so keys are never stored in plaintext.

const ENCRYPTION_KEY = process.env.BYOK_ENCRYPTION_KEY || '';
const ALGO = 'aes-256-gcm';

function requireEncryptionKey(): true | NextResponse {
  if (!ENCRYPTION_KEY) {
    return NextResponse.json({ error: 'BYOK encryption not configured' }, { status: 503 });
  }
  return true;
}

function deriveKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(stored: string): string {
  const [ivHex, tagHex, encHex] = stored.split(':');
  const key = deriveKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
}

function mask(value: string): string {
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••' + value.slice(-4);
}

/* ── Ensure table exists ──────────────────────────────────────── */

let tableReady = false;

async function ensureTable() {
  if (tableReady || !sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS circuit_box_byok (
      user_id    TEXT NOT NULL,
      provider   TEXT NOT NULL,
      key_enc    TEXT NOT NULL,
      key_mask   TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, provider)
    )
  `;
  tableReady = true;
}

/* ── GET — return masked keys for the user ────────────────────── */

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!sql) return NextResponse.json({ keys: [] });

  await ensureTable();

  const rows = await sql`
    SELECT provider, key_mask, updated_at FROM circuit_box_byok
    WHERE user_id = ${auth.userId}
    ORDER BY provider
  `;

  return NextResponse.json({
    keys: rows.map(r => ({
      provider: r.provider,
      masked: r.key_mask,
      updatedAt: r.updated_at,
    })),
  });
}

/* ── POST — save or update a BYOK key ─────────────────────────── */

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  const encCheck = requireEncryptionKey();
  if (encCheck !== true) return encCheck;

  const body = await req.json().catch(() => null);
  if (!body?.provider || !body?.key) {
    return NextResponse.json({ error: 'Missing provider or key' }, { status: 400 });
  }

  const provider = String(body.provider).toLowerCase().trim();
  const keyValue = String(body.key).trim();

  if (keyValue.length < 8) {
    return NextResponse.json({ error: 'Key too short' }, { status: 400 });
  }

  await ensureTable();

  const keyEnc = encrypt(keyValue);
  const keyMask = mask(keyValue);

  await sql`
    INSERT INTO circuit_box_byok (user_id, provider, key_enc, key_mask, updated_at)
    VALUES (${auth.userId}, ${provider}, ${keyEnc}, ${keyMask}, now())
    ON CONFLICT (user_id, provider)
    DO UPDATE SET key_enc = ${keyEnc}, key_mask = ${keyMask}, updated_at = now()
  `;

  return NextResponse.json({ ok: true, provider, masked: keyMask });
}

/* ── DELETE — remove a BYOK key ───────────────────────────────── */

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider');
  if (!provider) {
    return NextResponse.json({ error: 'Missing provider param' }, { status: 400 });
  }

  await ensureTable();

  await sql`
    DELETE FROM circuit_box_byok
    WHERE user_id = ${auth.userId} AND provider = ${provider}
  `;

  return NextResponse.json({ ok: true, deleted: provider });
}
