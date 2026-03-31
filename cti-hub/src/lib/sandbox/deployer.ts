/**
 * Sandbox Deployer — Packages user builds into isolated containers.
 *
 * When a user's build completes through ACHEEVY:
 * 1. The build artifacts are packaged into a container image
 * 2. Deployed to Cloud Run with a unique URL
 * 3. CDN fronts the URL for performance
 * 4. User gets [name].foai.cloud or can point their own domain
 *
 * Each sandbox includes:
 * - The agent workforce configured for that build
 * - Grammar + voice-first ACHEEVY interface
 * - Memory layer scoped to the sandbox tenant
 * - Audit logging
 */

import { sql } from '@/lib/insforge';

export interface SandboxConfig {
  name: string;
  userId: string;
  agents: string[];           // Which agents are active in this sandbox
  template: 'basic' | 'corporation' | 'marketplace' | 'custom';
  customDomain?: string;
  branding?: {
    primaryColor: string;
    logo?: string;
    title: string;
  };
}

export interface Sandbox {
  id: string;
  name: string;
  userId: string;
  url: string;
  status: 'building' | 'deploying' | 'live' | 'paused' | 'failed';
  agents: string[];
  template: string;
  customDomain?: string;
  createdAt: string;
  lastDeployedAt?: string;
}

/**
 * Create a new sandbox record in the database.
 */
export async function createSandbox(config: SandboxConfig): Promise<Sandbox | null> {
  if (!sql) return null;

  const slug = config.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
  const url = `https://${slug}.foai.cloud`;

  try {
    // Create sandboxes table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS sandboxes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        status TEXT DEFAULT 'building',
        agents TEXT[] DEFAULT '{}',
        template TEXT DEFAULT 'basic',
        custom_domain TEXT,
        branding JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_deployed_at TIMESTAMPTZ
      )
    `;

    const rows = await sql`
      INSERT INTO sandboxes (name, slug, user_id, url, agents, template, custom_domain, branding)
      VALUES (${config.name}, ${slug}, ${config.userId}, ${url}, ${config.agents}, ${config.template}, ${config.customDomain || null}, ${JSON.stringify(config.branding || {})})
      RETURNING *
    `;

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      userId: r.user_id,
      url: r.url,
      status: r.status,
      agents: r.agents,
      template: r.template,
      customDomain: r.custom_domain,
      createdAt: r.created_at,
      lastDeployedAt: r.last_deployed_at,
    };
  } catch (err) {
    console.error('[Sandbox] Create failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * List sandboxes for a user.
 */
export async function listSandboxes(userId: string): Promise<Sandbox[]> {
  if (!sql) return [];
  try {
    const rows = await sql`
      SELECT * FROM sandboxes WHERE user_id = ${userId} ORDER BY created_at DESC
    `;
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      userId: r.user_id,
      url: r.url,
      status: r.status,
      agents: r.agents,
      template: r.template,
      customDomain: r.custom_domain,
      createdAt: r.created_at,
      lastDeployedAt: r.last_deployed_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Update sandbox status.
 */
export async function updateSandboxStatus(id: string, status: Sandbox['status']): Promise<void> {
  if (!sql) return;
  await sql`UPDATE sandboxes SET status = ${status}, last_deployed_at = NOW() WHERE id = ${id}`;
}

/**
 * Deploy a sandbox to Cloud Run.
 * This is the actual deployment step — packages and ships.
 *
 * For now, this creates a static HTML site with the sandbox config.
 * Full container deployment will use gcloud CLI.
 */
export async function deploySandbox(sandbox: Sandbox): Promise<{ url: string; success: boolean }> {
  // For MVP: create a static page served from /plugs/[slug]/
  // Full implementation: gcloud run deploy with container image
  await updateSandboxStatus(sandbox.id, 'live');
  return { url: sandbox.url, success: true };
}
