import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/* ──────────────────────────────────────────────────────────────
 *  GET /generated/[...path]
 *  Dynamic route to serve runtime-generated images from
 *  /app/public/generated/ — Next.js standalone doesn't serve
 *  files written after build time, so we handle them manually.
 * ────────────────────────────────────────────────────────────── */

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;

    // Security: reject any path that tries to traverse
    if (path.some(p => p.includes('..') || p.includes('/') || p.includes('\\'))) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const filePath = join(process.cwd(), 'public', 'generated', ...path);
    const buffer = await readFile(filePath);

    // Determine MIME type from extension
    const ext = '.' + (path[path.length - 1].split('.').pop()?.toLowerCase() || '');
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    return new NextResponse('Not found', { status: 404 });
  }
}
