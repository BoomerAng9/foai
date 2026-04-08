import { NextRequest, NextResponse } from 'next/server';
import {
  filterSitemap,
  flattenSitemap,
  hostVariantFromHostname,
  type NavHost,
} from '@/lib/nav/sitemap';

/**
 * GET /api/sitemap
 * =================
 * Returns the grouped sitemap (branches + entries) and a flattened
 * index Spinner can match against natural-language prompts.
 *
 * Query params:
 *   host=cti|deploy   — override host detection (for tools/tests)
 *   owner=true        — include owner-only entries regardless of auth
 *   format=flat       — return only the flat index, no grouping
 *   format=tree       — return only the grouped tree, no flat index
 *                       (default is both)
 *
 * Consumed by:
 *   - Spinner chat function (intent matching + auto-navigation)
 *   - Admin tooling, docs generation, and CI route audits
 */
export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const hostParam = url.searchParams.get('host');
  const ownerParam = url.searchParams.get('owner');
  const format = url.searchParams.get('format') || 'both';

  // Detect host: explicit param wins, else Host header, else default cti
  const detectedHost: NavHost = hostParam === 'cti' || hostParam === 'deploy'
    ? hostParam
    : hostVariantFromHostname(req.headers.get('host'));

  const isOwner = ownerParam === 'true';

  const tree = filterSitemap(detectedHost, isOwner);
  const flat = flattenSitemap(detectedHost, isOwner);

  const payload: Record<string, unknown> = {
    host: detectedHost,
    isOwnerView: isOwner,
    generatedAt: new Date().toISOString(),
  };

  if (format === 'flat') {
    payload.flat = flat;
  } else if (format === 'tree') {
    payload.tree = tree;
  } else {
    payload.tree = tree;
    payload.flat = flat;
  }

  return NextResponse.json(payload, {
    headers: {
      // Short cache so Spinner gets fresh routes within a minute
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
