/**
 * aiPLUG & Play shared types
 * ============================
 * Row shapes matching the tables in `schema.ts`. Consumed by API
 * routes (server) and aiPLUG pages (client).
 */

export type PlugStatus = 'draft' | 'beta' | 'ready' | 'archived';

export type PlugRunStatus =
  | 'queued'
  | 'running'
  | 'waiting_for_user'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface PlugRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  hero_image_url: string;
  status: PlugStatus;
  features: string[];
  tags: string[];
  price_cents: number;
  runtime_key: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlugRunRow {
  id: string;
  plug_id: string;
  user_id: string;
  status: PlugRunStatus;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  error_message: string;
  started_at: string | null;
  finished_at: string | null;
  last_heartbeat: string | null;
  cost_tokens: number;
  created_at: string;
}

export interface PlugRunEventRow {
  id: string;
  run_id: string;
  kind: 'heartbeat' | 'stage' | 'error' | 'output' | 'info' | string;
  stage: string;
  message: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface PlugDetailResponse {
  plug: PlugRow;
  recentRuns: PlugRunRow[];
}
