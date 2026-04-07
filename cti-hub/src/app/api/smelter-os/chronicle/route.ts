import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { isOwner } from '@/lib/allowlist';

/**
 * GET /api/smelter-os/chronicle?kind=ledger|charter&limit=N
 * -----------------------------------------------------------
 * Owner-only. Lists recent Chronicle entries from Puter.
 *   ledger  — /smelter-os/chronicle/ledger/ (internal, heartbeats + audit)
 *   charter — /smelter-os/chronicle/charter/ (customer-facing activity)
 *
 * Returns {entries: [{name, modified, preview}], path, kind}
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedRequest(req);
  if (!auth.ok) return auth.response;
  if (!isOwner(auth.context.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') === 'charter' ? 'charter' : 'ledger';
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20)));

  const puterBase = (process.env.PUTER_BASE_URL || '').replace(/\/$/, '');
  const puterKey = process.env.PUTER_API_KEY || '';
  if (!puterBase) {
    return NextResponse.json(
      { error: 'PUTER_BASE_URL not configured', entries: [], kind },
      { status: 503 },
    );
  }

  const headers: Record<string, string> = {};
  if (puterKey) headers.Authorization = `Bearer ${puterKey}`;

  const fullPath = `/smelter-os/chronicle/${kind}`;

  try {
    const listRes = await fetch(`${puterBase}/readdir?path=${encodeURIComponent(fullPath)}`, {
      headers,
      cache: 'no-store',
    });
    if (!listRes.ok) {
      return NextResponse.json(
        { error: `Puter readdir ${listRes.status}`, entries: [], kind, path: fullPath },
        { status: listRes.status === 404 ? 404 : 503 },
      );
    }
    const data = await listRes.json();
    const rawEntries = Array.isArray(data) ? data : (data.entries || data.items || []);

    // Sort by name descending (timestamped filenames → newest first) and cap
    const sorted = rawEntries
      .filter((e: Record<string, unknown>) => !e.is_dir && !e.is_directory)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        return String(b.name).localeCompare(String(a.name));
      })
      .slice(0, limit);

    // For each entry, fetch a short preview (first 2KB)
    const entries = await Promise.all(
      sorted.map(async (e: Record<string, unknown>) => {
        const entryPath = `${fullPath}/${e.name}`;
        let preview: string | null = null;
        try {
          const r = await fetch(`${puterBase}/read?path=${encodeURIComponent(entryPath)}`, {
            headers,
            cache: 'no-store',
          });
          if (r.ok) {
            const text = await r.text();
            preview = text.length > 2048 ? text.slice(0, 2048) + '…' : text;
          }
        } catch {
          /* best-effort preview */
        }
        return {
          name: String(e.name),
          modified: e.modified || e.mtime || null,
          size: typeof e.size === 'number' ? e.size : null,
          preview,
        };
      }),
    );

    return NextResponse.json({
      kind,
      path: fullPath,
      total: rawEntries.length,
      returned: entries.length,
      entries,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Puter unreachable',
        entries: [],
        kind,
        path: fullPath,
      },
      { status: 503 },
    );
  }
}
