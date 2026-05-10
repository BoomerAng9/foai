/**
 * @aims/tool-warehouse — read/write helpers.
 * Pure CRUD; no enforcement, no Picker_Ang logic.
 */

import { getSql } from './client.js';
import { TIER_ORDINAL, type Tool, type ToolSeed, type ToolTier } from './schema.js';

export async function getToolById(id: string): Promise<Tool | null> {
  const sql = getSql();
  const [row] = await sql`SELECT * FROM tools WHERE id = ${id} LIMIT 1`;
  return (row as Tool | undefined) ?? null;
}

export async function getToolsByTier(tier: ToolTier): Promise<Tool[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM tools
     WHERE tier = ${tier}
     ORDER BY priority DESC, name ASC
  `;
  return rows as Tool[];
}

export async function listTools(options?: {
  includeInternal?: boolean;
  status?: 'active' | 'standby' | 'deprecated' | 'experimental';
}): Promise<Tool[]> {
  const sql = getSql();
  const includeInternal = options?.includeInternal ?? false;
  const status = options?.status ?? 'active';
  const rows = await sql`
    SELECT * FROM tools
     WHERE status = ${status}
       AND (${includeInternal}::boolean OR internal_only = FALSE)
     ORDER BY tier_ordinal ASC, priority DESC, name ASC
  `;
  return rows as Tool[];
}

export async function searchTools(query: {
  capabilities?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
  tier?: ToolTier;
  includeInternal?: boolean;
}): Promise<Tool[]> {
  const sql = getSql();
  const includeInternal = query.includeInternal ?? false;
  const rows = await sql`
    SELECT * FROM tools
     WHERE status = 'active'
       AND (${includeInternal}::boolean OR internal_only = FALSE)
       ${query.tier ? sql`AND tier = ${query.tier}` : sql``}
       ${query.priority ? sql`AND priority = ${query.priority}` : sql``}
       ${
         query.capabilities && query.capabilities.length > 0
           ? sql`AND capabilities ?| ${query.capabilities}`
           : sql``
       }
     ORDER BY priority DESC, name ASC
  `;
  return rows as Tool[];
}

export async function countByTier(): Promise<Record<ToolTier, number>> {
  const sql = getSql();
  const rows = await sql`
    SELECT tier, COUNT(*)::int AS count
      FROM tools
     WHERE status = 'active'
     GROUP BY tier
  `;
  const result = Object.fromEntries(
    Object.keys(TIER_ORDINAL).map((t) => [t, 0]),
  ) as Record<ToolTier, number>;
  for (const row of rows as Array<{ tier: ToolTier; count: number }>) {
    result[row.tier] = row.count;
  }
  return result;
}

export async function upsertTool(seed: ToolSeed): Promise<void> {
  const sql = getSql();
  const ordinal = TIER_ORDINAL[seed.tier];
  await sql`
    INSERT INTO tools (
      id, name, tier, tier_ordinal, category, description,
      internal_only, customer_safe_label,
      license, repo_url, vendor, stars, homepage_url,
      status, priority, rating, circuit_breaker_id, health_endpoint,
      owner_ang,
      cost_model, capabilities, metadata, added_to_warehouse
    ) VALUES (
      ${seed.id},
      ${seed.name},
      ${seed.tier},
      ${ordinal},
      ${seed.category},
      ${seed.description},
      ${seed.internalOnly ?? false},
      ${seed.customerSafeLabel ?? null},
      ${seed.license ?? 'unknown'},
      ${seed.repoUrl ?? null},
      ${seed.vendor ?? null},
      ${seed.stars ?? null},
      ${seed.homepageUrl ?? null},
      ${seed.status ?? 'active'},
      ${seed.priority ?? 'medium'},
      ${seed.rating ?? null},
      ${seed.circuitBreakerId ?? null},
      ${seed.healthEndpoint ?? null},
      ${seed.ownerAng ?? null},
      ${(seed.costModel ?? null) as any},
      ${sql.json(seed.capabilities ?? [])},
      ${sql.json(seed.metadata ?? {})},
      ${seed.addedToWarehouse ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      name               = EXCLUDED.name,
      tier               = EXCLUDED.tier,
      tier_ordinal       = EXCLUDED.tier_ordinal,
      category           = EXCLUDED.category,
      description        = EXCLUDED.description,
      internal_only      = EXCLUDED.internal_only,
      customer_safe_label= EXCLUDED.customer_safe_label,
      license            = EXCLUDED.license,
      repo_url           = EXCLUDED.repo_url,
      vendor             = EXCLUDED.vendor,
      stars              = EXCLUDED.stars,
      homepage_url       = EXCLUDED.homepage_url,
      status             = EXCLUDED.status,
      priority           = EXCLUDED.priority,
      rating             = EXCLUDED.rating,
      circuit_breaker_id = EXCLUDED.circuit_breaker_id,
      health_endpoint    = EXCLUDED.health_endpoint,
      owner_ang          = EXCLUDED.owner_ang,
      cost_model         = EXCLUDED.cost_model,
      capabilities       = EXCLUDED.capabilities,
      metadata           = EXCLUDED.metadata,
      last_verified      = NOW()
  `;
}
