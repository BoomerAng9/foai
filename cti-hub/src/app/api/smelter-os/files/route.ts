import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { isOwner } from '@/lib/allowlist';

/**
 * GET /api/smelter-os/files?path=<rel>
 * -------------------------------------
 * Owner-only proxy to the Puter API for browsing the /smelter-os/
 * directory tree. Never writes, only reads.
 *
 * Query:
 *   path    — path relative to /smelter-os/ root (default: empty = root)
 *   read    — "1" to return file content instead of directory listing
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedRequest(req);
  if (!auth.ok) return auth.response;
  if (!isOwner(auth.context.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const relPath = (url.searchParams.get('path') || '').replace(/^\/+/, '');
  const readMode = url.searchParams.get('read') === '1';

  const puterBase = (process.env.PUTER_BASE_URL || '').replace(/\/$/, '');
  const puterKey = process.env.PUTER_API_KEY || '';
  if (!puterBase) {
    return NextResponse.json(
      { error: 'PUTER_BASE_URL not configured', entries: [] },
      { status: 503 },
    );
  }

  const headers: Record<string, string> = {};
  if (puterKey) headers.Authorization = `Bearer ${puterKey}`;

  const fullPath = `/smelter-os${relPath ? '/' + relPath : ''}`;

  try {
    if (readMode) {
      // Return file content
      const res = await fetch(`${puterBase}/read?path=${encodeURIComponent(fullPath)}`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Puter read ${res.status}`, content: null },
          { status: res.status },
        );
      }
      const text = await res.text();
      return NextResponse.json({
        path: fullPath,
        size_bytes: text.length,
        content: text.length > 500_000 ? text.slice(0, 500_000) : text,
        truncated: text.length > 500_000,
      });
    }

    // Directory listing
    const res = await fetch(`${puterBase}/readdir?path=${encodeURIComponent(fullPath)}`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Puter readdir ${res.status}`, entries: [], path: fullPath },
        { status: res.status === 404 ? 404 : 503 },
      );
    }
    const data = await res.json();

    // Puter returns either {entries: [...]} or [...]
    const rawEntries = Array.isArray(data) ? data : (data.entries || data.items || []);
    const entries = rawEntries.map((e: Record<string, unknown>) => ({
      name: String(e.name || ''),
      is_dir: Boolean(e.is_dir || e.type === 'dir' || e.is_directory),
      size: typeof e.size === 'number' ? e.size : null,
      modified: e.modified || e.mtime || null,
    }));

    return NextResponse.json({
      path: fullPath,
      entries,
      count: entries.length,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Puter unreachable',
        entries: [],
        path: fullPath,
      },
      { status: 503 },
    );
  }
}
