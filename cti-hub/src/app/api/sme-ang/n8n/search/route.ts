import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GET /api/sme-ang/n8n/search — search the SME_Ang n8n workflow catalog
 *
 * Query params:
 *   q=<text>           — fuzzy search across name, slug, categories, node types
 *   category=<cat>     — filter by category (ai, rag, email, integration, etc.)
 *   trigger=<type>     — filter by trigger_type (webhook, scheduled, email-trigger, manual, event)
 *   limit=<n>          — max results (default 50, max 200)
 *
 * Returns the catalog entries matching the filters. If no params,
 * returns all entries (useful for browsing the full catalog).
 *
 * The catalog is a static JSON file built by
 * cti-hub/scripts/build-sme-ang-catalog.mjs. No database involved.
 */

interface CatalogEntry {
  slug: string;
  name: string;
  description: string;
  filename: string;
  node_count: number;
  trigger_type: string;
  unique_node_types: string[];
  categories: string[];
  tags: string[];
  active: boolean;
}

interface Catalog {
  generated_at: string;
  total: number;
  entries: CatalogEntry[];
}

let cached: Catalog | null = null;

function loadCatalog(): Catalog {
  if (cached) return cached;
  const catalogPath = path.join(process.cwd(), 'public', 'sme-ang', 'n8n-catalog.json');
  if (!fs.existsSync(catalogPath)) {
    return { generated_at: '', total: 0, entries: [] };
  }
  cached = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as Catalog;
  return cached;
}

function matchesQuery(entry: CatalogEntry, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    entry.name.toLowerCase().includes(lower) ||
    entry.slug.includes(lower) ||
    entry.categories.some(c => c.includes(lower)) ||
    entry.unique_node_types.some(t => t.toLowerCase().includes(lower)) ||
    entry.tags.some(t => t.toLowerCase().includes(lower)) ||
    entry.description.toLowerCase().includes(lower) ||
    entry.trigger_type.includes(lower)
  );
}

export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const category = url.searchParams.get('category') || '';
  const trigger = url.searchParams.get('trigger') || '';
  const limit = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get('limit') || 50)),
  );

  const catalog = loadCatalog();
  let results = catalog.entries;

  if (q) {
    results = results.filter(e => matchesQuery(e, q));
  }
  if (category) {
    results = results.filter(e =>
      e.categories.some(c => c === category.toLowerCase()),
    );
  }
  if (trigger) {
    results = results.filter(e => e.trigger_type === trigger.toLowerCase());
  }

  results = results.slice(0, limit);

  return NextResponse.json({
    query: { q, category, trigger, limit },
    total: results.length,
    catalog_generated_at: catalog.generated_at,
    results,
  });
}
