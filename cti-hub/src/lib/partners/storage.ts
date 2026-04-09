/**
 * Partners storage layer — on-prem filesystem write-through
 * ===========================================================
 * H2 ships local-filesystem storage with a Docker-volume-mounted
 * path so the Smelter OS file manager can read the same bytes. The
 * container must mount `/opt/smelter-os-storage` → `/app/smelter-os-storage`
 * for persistence across restarts.
 *
 * Path scheme:
 *   /app/smelter-os-storage/partners/<partner_slug>/<doc_id>-<sanitized_name>
 *
 * Dual-write design (per project_cti_partners_mindedge memory):
 *   1. File bytes → this local filesystem path
 *   2. File metadata → partner_documents Neon row
 *   3. storage_url   → signed download URL via /api/partners/[slug]/documents/[docId]/download
 *   4. smelter_os_path → literal on-disk path Smelter OS uses
 *
 * TODO(H3+): Upgrade to Puter primary + GCS secondary per
 * `project_sqwaadrun_storage` memory. Puter integration is its own
 * workstream; this H2 implementation gives on-prem persistence via
 * the Docker volume and unblocks Rish uploading the MindEdge package
 * today. When Puter lands, swap `writePartnerFile()` to write-through
 * Puter first, then mirror to this path (or drop the local path
 * entirely if Smelter OS reads directly from Puter).
 */

import { mkdir, writeFile, readFile, stat, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename, extname } from 'path';

const STORAGE_ROOT =
  process.env.SMELTER_OS_STORAGE_ROOT ||
  join(process.cwd(), 'smelter-os-storage');

export const PARTNERS_ROOT = join(STORAGE_ROOT, 'partners');

/** Max per-file size (50 MB for partner package docs) */
export const MAX_PARTNER_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Allowed MIME prefixes for partner uploads. Keeping this tight on
 * purpose — binary executables, scripts, and archives are rejected
 * so owners can't accidentally self-pwn by uploading a hostile file
 * that later gets served back via the download endpoint.
 */
export const ALLOWED_PARTNER_MIME_PREFIXES = [
  'image/',
  'application/pdf',
  'application/vnd.openxmlformats',
  'application/msword',
  'application/vnd.ms-',
  'text/',
  'application/json',
  'application/xml',
  'audio/',
  'video/',
];

export function isAllowedPartnerMime(mime: string): boolean {
  if (!mime) return false;
  return ALLOWED_PARTNER_MIME_PREFIXES.some(p => mime.startsWith(p));
}

export function sanitizeFilename(name: string): string {
  const base = basename(name || 'file');
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.length > 0 ? cleaned : 'file';
}

export function mimeToKind(mime: string): string {
  if (!mime) return 'document';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('text/')) return 'text';
  if (mime.startsWith('application/json')) return 'data';
  return 'document';
}

export interface StoredFileInfo {
  smelter_os_path: string;
  relative_path: string;
  filename: string;
  size_bytes: number;
}

export async function writePartnerFile(
  partnerSlug: string,
  documentId: string,
  originalName: string,
  bytes: Buffer,
): Promise<StoredFileInfo> {
  if (!partnerSlug || /[^a-z0-9-]/.test(partnerSlug)) {
    throw new Error('Invalid partner slug');
  }
  if (!documentId || /[^a-zA-Z0-9-]/.test(documentId)) {
    throw new Error('Invalid document id');
  }

  const partnerDir = join(PARTNERS_ROOT, partnerSlug);
  if (!existsSync(partnerDir)) {
    await mkdir(partnerDir, { recursive: true });
  }

  const safeName = sanitizeFilename(originalName);
  const filename = `${documentId}-${safeName}`;
  const fullPath = join(partnerDir, filename);
  await writeFile(fullPath, bytes);

  const s = await stat(fullPath);
  return {
    smelter_os_path: fullPath,
    relative_path: join('partners', partnerSlug, filename),
    filename,
    size_bytes: s.size,
  };
}

export async function readPartnerFile(relativePath: string): Promise<{ bytes: Buffer; ext: string }> {
  if (relativePath.includes('..') || !relativePath.startsWith('partners/')) {
    throw new Error('Invalid relative path');
  }
  const full = join(STORAGE_ROOT, relativePath);
  const bytes = await readFile(full);
  return { bytes, ext: extname(full).toLowerCase() };
}

export async function deletePartnerFile(relativePath: string): Promise<void> {
  if (relativePath.includes('..') || !relativePath.startsWith('partners/')) {
    throw new Error('Invalid relative path');
  }
  const full = join(STORAGE_ROOT, relativePath);
  try {
    await unlink(full);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      throw err;
    }
  }
}
