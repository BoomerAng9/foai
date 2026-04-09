/**
 * aiPLUG Engine — Create, configure, deploy, and run AI plugs.
 * Each plug is a configured AI agent with its own system prompt, model, and tools.
 */

import { sql } from '@/lib/insforge';

export interface Plug {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  system_prompt: string;
  model: string;
  category: string;
  icon_url: string | null;
  published: boolean;
  price_monthly: number;
  tools: string[];
  settings: Record<string, unknown>;
  install_count: number;
  created_at: string;
  updated_at: string;
}

// ── CRUD ─────────────────────────────────────────────────

export async function createPlug(
  ownerId: string,
  data: {
    name: string;
    slug: string;
    description?: string;
    system_prompt: string;
    model?: string;
    category?: string;
    icon_url?: string;
    tools?: string[];
    settings?: Record<string, unknown>;
    price_monthly?: number;
  },
): Promise<Plug | null> {
  if (!sql) return null;
  const rows = await sql`
    INSERT INTO plugs (owner_id, name, slug, description, system_prompt, model, category, icon_url, tools, settings, price_monthly)
    VALUES (
      ${ownerId},
      ${data.name},
      ${data.slug},
      ${data.description || null},
      ${data.system_prompt},
      ${data.model || 'qwen/qwen-2.5-72b-instruct:free'},
      ${data.category || 'general'},
      ${data.icon_url || null},
      ${JSON.stringify(data.tools || [])},
      ${JSON.stringify(data.settings || {})},
      ${data.price_monthly || 0}
    )
    RETURNING *
  `;
  return (rows[0] as unknown as Plug) ?? null;
}

export async function getPlug(slug: string): Promise<Plug | null> {
  if (!sql) return null;
  const rows = await sql`SELECT * FROM plugs WHERE slug = ${slug}`;
  return (rows[0] as unknown as Plug) ?? null;
}

export async function listPlugs(opts: {
  ownerId?: string;
  published?: boolean;
  category?: string;
  limit?: number;
} = {}): Promise<Plug[]> {
  if (!sql) return [];
  const limit = opts.limit || 50;

  if (opts.ownerId) {
    return sql`
      SELECT * FROM plugs WHERE owner_id = ${opts.ownerId}
      ORDER BY updated_at DESC LIMIT ${limit}
    ` as unknown as Plug[];
  }
  if (opts.category) {
    return sql`
      SELECT * FROM plugs WHERE published = true AND category = ${opts.category}
      ORDER BY install_count DESC LIMIT ${limit}
    ` as unknown as Plug[];
  }
  return sql`
    SELECT * FROM plugs WHERE published = true
    ORDER BY install_count DESC LIMIT ${limit}
  ` as unknown as Plug[];
}

export async function updatePlug(
  slug: string,
  ownerId: string,
  data: Partial<Pick<Plug, 'name' | 'description' | 'system_prompt' | 'model' | 'category' | 'icon_url' | 'published' | 'price_monthly' | 'tools' | 'settings'>>,
): Promise<Plug | null> {
  if (!sql) return null;

  const sets: string[] = [];
  const vals: unknown[] = [];

  if (data.name !== undefined) { sets.push('name'); vals.push(data.name); }
  if (data.description !== undefined) { sets.push('description'); vals.push(data.description); }
  if (data.system_prompt !== undefined) { sets.push('system_prompt'); vals.push(data.system_prompt); }
  if (data.model !== undefined) { sets.push('model'); vals.push(data.model); }
  if (data.category !== undefined) { sets.push('category'); vals.push(data.category); }
  if (data.icon_url !== undefined) { sets.push('icon_url'); vals.push(data.icon_url); }
  if (data.published !== undefined) { sets.push('published'); vals.push(data.published); }
  if (data.price_monthly !== undefined) { sets.push('price_monthly'); vals.push(data.price_monthly); }
  if (data.tools !== undefined) { sets.push('tools'); vals.push(JSON.stringify(data.tools)); }
  if (data.settings !== undefined) { sets.push('settings'); vals.push(JSON.stringify(data.settings)); }

  if (sets.length === 0) return getPlug(slug);

  // Build dynamic update — postgres.js handles parameterization
  const rows = await sql`
    UPDATE plugs SET
      ${sql(Object.fromEntries(sets.map((k, i) => [k, vals[i]])))}
      , updated_at = NOW()
    WHERE slug = ${slug} AND owner_id = ${ownerId}
    RETURNING *
  `;
  return (rows[0] as unknown as Plug) ?? null;
}

export async function deletePlug(slug: string, ownerId: string): Promise<boolean> {
  if (!sql) return false;
  const rows = await sql`DELETE FROM plugs WHERE slug = ${slug} AND owner_id = ${ownerId} RETURNING id`;
  return rows.length > 0;
}

// ── Install/Uninstall ────────────────────────────────────

export async function installPlug(plugId: string, userId: string): Promise<boolean> {
  if (!sql) return false;
  try {
    await sql`
      INSERT INTO plug_installs (plug_id, user_id) VALUES (${plugId}, ${userId})
      ON CONFLICT (plug_id, user_id) DO NOTHING
    `;
    await sql`UPDATE plugs SET install_count = install_count + 1 WHERE id = ${plugId}`;
    return true;
  } catch { return false; }
}

export async function getUserPlugs(userId: string): Promise<Plug[]> {
  if (!sql) return [];
  return sql`
    SELECT p.* FROM plugs p
    JOIN plug_installs pi ON pi.plug_id = p.id
    WHERE pi.user_id = ${userId}
    ORDER BY pi.installed_at DESC
  ` as unknown as Plug[];
}
