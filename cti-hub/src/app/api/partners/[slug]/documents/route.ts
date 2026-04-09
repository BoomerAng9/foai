import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';
import { ensurePartnersTables } from '@/lib/partners/schema';
import type { PartnerDocumentRow, PartnerRow } from '@/lib/partners/types';
import {
  writePartnerFile,
  isAllowedPartnerMime,
  mimeToKind,
  MAX_PARTNER_FILE_SIZE,
} from '@/lib/partners/storage';
import { randomUUID } from 'crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json(
      { error: 'Owner access required', code: 'OWNER_ONLY' },
      { status: 403 },
    );
  }

  const { slug } = await params;
  if (!sql) {
    return NextResponse.json({ documents: [] });
  }

  try {
    await ensurePartnersTables();
    const partnerRows = (await sql`
      SELECT id FROM partners WHERE slug = ${slug} LIMIT 1
    `) as unknown as Pick<PartnerRow, 'id'>[];
    if (partnerRows.length === 0) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }
    const documents = (await sql`
      SELECT id, partner_id, name, kind, mime_type, size_bytes, storage_url,
             smelter_os_path, tags, description, uploaded_by, uploaded_at
      FROM partner_documents
      WHERE partner_id = ${partnerRows[0].id}
      ORDER BY uploaded_at DESC
    `) as unknown as PartnerDocumentRow[];
    return NextResponse.json({ documents });
  } catch (err) {
    console.error('[partners/documents] GET error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json(
      { error: 'Owner access required', code: 'OWNER_ONLY' },
      { status: 403 },
    );
  }

  const { slug } = await params;
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    await ensurePartnersTables();
    const partnerRows = (await sql`
      SELECT id, slug FROM partners WHERE slug = ${slug} LIMIT 1
    `) as unknown as Pick<PartnerRow, 'id' | 'slug'>[];
    if (partnerRows.length === 0) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }
    const partner = partnerRows[0];

    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
    const description = String(formData.get('description') ?? '');
    const tagsRaw = String(formData.get('tags') ?? '');
    const tags = tagsRaw
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }
    if (files.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 files per upload' }, { status: 400 });
    }

    const uploaded: PartnerDocumentRow[] = [];
    const errors: { name: string; error: string }[] = [];

    for (const file of files) {
      if (!(file instanceof File) || file.size === 0) {
        errors.push({ name: 'unknown', error: 'Empty or invalid file' });
        continue;
      }
      if (file.size > MAX_PARTNER_FILE_SIZE) {
        errors.push({
          name: file.name,
          error: `File exceeds ${MAX_PARTNER_FILE_SIZE / 1024 / 1024}MB limit`,
        });
        continue;
      }
      if (!isAllowedPartnerMime(file.type)) {
        errors.push({
          name: file.name,
          error: `MIME type "${file.type}" not allowed`,
        });
        continue;
      }

      const docId = randomUUID();
      const buffer = Buffer.from(await file.arrayBuffer());

      try {
        const stored = await writePartnerFile(partner.slug, docId, file.name, buffer);
        const downloadUrl = `/api/partners/${partner.slug}/documents/${docId}/download`;

        const inserted = (await sql`
          INSERT INTO partner_documents (
            id, partner_id, name, kind, mime_type, size_bytes,
            storage_url, smelter_os_path, tags, description, uploaded_by
          )
          VALUES (
            ${docId},
            ${partner.id},
            ${file.name},
            ${mimeToKind(file.type)},
            ${file.type},
            ${stored.size_bytes},
            ${downloadUrl},
            ${stored.smelter_os_path},
            ${tags},
            ${description},
            ${auth.userId}
          )
          RETURNING id, partner_id, name, kind, mime_type, size_bytes, storage_url,
                    smelter_os_path, tags, description, uploaded_by, uploaded_at
        `) as unknown as PartnerDocumentRow[];

        uploaded.push(inserted[0]);
      } catch (err) {
        console.error(`[partners/documents] write failed for ${file.name}:`, err);
        errors.push({
          name: file.name,
          error: err instanceof Error ? err.message : 'Write failed',
        });
      }
    }

    return NextResponse.json(
      {
        uploaded,
        errors,
        message: `${uploaded.length} uploaded, ${errors.length} failed`,
      },
      { status: uploaded.length > 0 ? 201 : 400 },
    );
  } catch (err) {
    console.error('[partners/documents] POST error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
