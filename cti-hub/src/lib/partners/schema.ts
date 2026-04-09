/**
 * Partners schema + ensureTables helper
 * ======================================
 * Three tables backing the CTI Hub Partners tab:
 *
 *   partners            — one row per onboarded partner (MindEdge, ...)
 *   partner_pages       — owner-authored sub-pages under each partner
 *   partner_documents   — document uploads (dual-written to Smelter OS
 *                         filesystem in H2 — this schema only tracks
 *                         metadata + file_url pointer)
 *
 * Partners tab is cti-only + owner-only per the
 * `project_cti_partners_mindedge` memory. Middleware gates
 * /partners on both hosts; the sitemap hides it from non-owners.
 */

import { sql } from '@/lib/insforge';

let tablesReady = false;

export async function ensurePartnersTables(): Promise<void> {
  if (tablesReady || !sql) return;

  // partners — top-level partner record
  await sql`
    CREATE TABLE IF NOT EXISTS partners (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      slug            TEXT NOT NULL UNIQUE,
      name            TEXT NOT NULL,
      tagline         TEXT NOT NULL DEFAULT '',
      description     TEXT NOT NULL DEFAULT '',
      logo_url        TEXT NOT NULL DEFAULT '',
      hero_image_url  TEXT NOT NULL DEFAULT '',
      website_url     TEXT NOT NULL DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'active',
      tags            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // partner_pages — owner-authored sub-pages under a partner
  await sql`
    CREATE TABLE IF NOT EXISTS partner_pages (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      partner_id    TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      slug          TEXT NOT NULL,
      title         TEXT NOT NULL,
      body_markdown TEXT NOT NULL DEFAULT '',
      position      INTEGER NOT NULL DEFAULT 0,
      visibility    TEXT NOT NULL DEFAULT 'owner',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (partner_id, slug)
    )
  `;

  // partner_documents — uploaded files (metadata only; bytes in Smelter OS filesystem in H2)
  await sql`
    CREATE TABLE IF NOT EXISTS partner_documents (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      partner_id      TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      kind            TEXT NOT NULL DEFAULT 'document',
      mime_type       TEXT NOT NULL DEFAULT 'application/octet-stream',
      size_bytes      BIGINT NOT NULL DEFAULT 0,
      storage_url     TEXT NOT NULL DEFAULT '',
      smelter_os_path TEXT NOT NULL DEFAULT '',
      tags            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      description     TEXT NOT NULL DEFAULT '',
      uploaded_by     TEXT NOT NULL DEFAULT '',
      uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Indices
  await sql`CREATE INDEX IF NOT EXISTS partners_status_idx ON partners (status)`;
  await sql`CREATE INDEX IF NOT EXISTS partner_pages_partner_idx ON partner_pages (partner_id, position)`;
  await sql`CREATE INDEX IF NOT EXISTS partner_documents_partner_idx ON partner_documents (partner_id, uploaded_at DESC)`;

  // Seed MindEdge as partner #1 if not already present
  const existing = await sql`SELECT id FROM partners WHERE slug = 'mindedge' LIMIT 1`;
  if (existing.length === 0) {
    await sql`
      INSERT INTO partners (slug, name, tagline, description, status, tags, website_url)
      VALUES (
        'mindedge',
        'MindEdge',
        'Education content partner — marketing materials, webhooks, and partner package.',
        'MindEdge is an active education content partner of ACHIEVEMOR. This workspace houses the shared marketing materials, webhook endpoints, and partner package documents. Upload new assets via the GUI; every upload is dual-written to Neon (for search/index) and the Smelter OS filesystem (for on-prem file browsing).',
        'active',
        ARRAY['education', 'content', 'partner-package'],
        'https://www.mindedge.com'
      )
    `;
  }

  tablesReady = true;
}
