import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 files allowed' }, { status: 400 });
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
