import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit } from '@/lib/rate-limit-simple';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;
const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf', 'text/'];

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  if (!rateLimit(auth.userId, 10, 60000)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} files allowed`, code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File "${file.name}" exceeds 10MB limit`, code: 'VALIDATION_ERROR' }, { status: 400 });
      }
      const mimeAllowed = ALLOWED_MIME_PREFIXES.some(prefix => file.type.startsWith(prefix));
      if (!mimeAllowed) {
        return NextResponse.json({ error: `File type "${file.type}" is not allowed. Accepted: images, PDFs, text files`, code: 'VALIDATION_ERROR' }, { status: 400 });
      }
    }

    const uploadDir = join(process.cwd(), 'uploads', Date.now().toString());
    await mkdir(uploadDir, { recursive: true });

    const uploaded = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filepath = join(uploadDir, filename);
      await writeFile(filepath, buffer);

      uploaded.push({
        name: file.name,
        type: file.type,
        size: file.size,
        path: filepath,
      });
    }

    return NextResponse.json({ files: uploaded });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
