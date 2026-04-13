import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';
import { isOwner } from '@/lib/allowlist';

let tableReady = false;

async function ensureVoiceCloneTable() {
  if (tableReady || !sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS voice_clones (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id     TEXT NOT NULL,
      name        TEXT NOT NULL,
      provider    TEXT NOT NULL DEFAULT 'async',
      provider_voice_id TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sample_duration_sec REAL NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at  TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS voice_clones_user_idx ON voice_clones (user_id, deleted_at)`.catch(() => {});
  tableReady = true;
}

/**
 * GET /api/voice/clones — list user's cloned voices
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!sql) return NextResponse.json({ clones: [] });

  try {
    await ensureVoiceCloneTable();
    const rows = await sql`
      SELECT id, name, provider, provider_voice_id, description, sample_duration_sec, created_at
      FROM voice_clones
      WHERE user_id = ${auth.userId} AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ clones: rows });
  } catch {
    return NextResponse.json({ clones: [] });
  }
}

/**
 * POST /api/voice/clones — clone a voice from audio sample via Async
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!sql) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const ASYNC_API_KEY = process.env.ASYNC_API_KEY;
  if (!ASYNC_API_KEY) return NextResponse.json({ error: 'Voice cloning not configured' }, { status: 503 });

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const name = formData.get('name') as string || 'My Voice';
    const description = formData.get('description') as string || '';

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio sample required' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    if (audioBuffer.length < 10240) {
      return NextResponse.json({ error: 'Audio sample too short — need at least 3 seconds' }, { status: 400 });
    }

    // Clone via Async API
    const asyncRes = await fetch('https://api.async.ai/v1/voices/clone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASYNC_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        audio: audioBuffer.toString('base64'),
        description,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!asyncRes.ok) {
      const err = await asyncRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.message || 'Cloning failed' }, { status: asyncRes.status });
    }

    const asyncData = await asyncRes.json();
    const providerVoiceId = asyncData.voice_id || asyncData.id;

    // Persist to Neon
    await ensureVoiceCloneTable();
    const [row] = await sql`
      INSERT INTO voice_clones (user_id, name, provider, provider_voice_id, description, sample_duration_sec)
      VALUES (${auth.userId}, ${name}, 'async', ${providerVoiceId}, ${description}, ${audioBuffer.length / 16000})
      RETURNING id, name, provider_voice_id, created_at
    `;

    return NextResponse.json({ clone: row }, { status: 201 });
  } catch (err) {
    console.error('[voice clone] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Voice cloning failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/voice/clones?id=xxx — soft-delete a cloned voice
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!sql) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await ensureVoiceCloneTable();
    await sql`UPDATE voice_clones SET deleted_at = now() WHERE id = ${id} AND user_id = ${auth.userId}`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
