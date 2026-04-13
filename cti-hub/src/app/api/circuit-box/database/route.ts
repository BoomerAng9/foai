import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

/**
 * Circuit Box — Database Status Endpoint
 *
 * Returns connection health, table counts, and recent activity
 * for the Neon database powering CTI Hub.
 */

interface TableStat {
  name: string;
  count: number;
}

interface DatabaseStatus {
  connected: boolean;
  latency_ms: number;
  tables: TableStat[];
  recent_activity: { table: string; last_updated: string | null }[];
  schemas: string[];
  error?: string;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  if (!sql) {
    return NextResponse.json({
      connected: false,
      latency_ms: -1,
      tables: [],
      recent_activity: [],
      schemas: [],
      error: 'DATABASE_URL not configured',
    } satisfies DatabaseStatus);
  }

  try {
    // Measure connection latency
    const start = Date.now();
    await sql`SELECT 1`;
    const latency = Date.now() - start;

    // Get table counts from key tables
    const tableNames = [
      'circuit_box_toggles',
      'circuit_box_byok',
      'chat_messages',
      'chat_sessions',
      'memory_sources',
      'memory_chunks',
      'aiplug_instances',
      'aiplug_definitions',
      'access_keys',
      'budget_entries',
    ];

    const tables: TableStat[] = [];
    for (const name of tableNames) {
      try {
        const result = await sql`
          SELECT count(*)::int as cnt
          FROM information_schema.tables
          WHERE table_name = ${name} AND table_schema = 'public'
        `;
        if (result[0]?.cnt > 0) {
          const countResult = await sql.unsafe(
            `SELECT count(*)::int as cnt FROM "${name}"`,
          );
          tables.push({ name, count: countResult[0]?.cnt ?? 0 });
        }
      } catch {
        // Table may not exist yet -- skip
      }
    }

    // Get recent activity (tables with timestamp columns)
    const recentActivity: { table: string; last_updated: string | null }[] = [];
    for (const t of tables) {
      try {
        const cols = await sql`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = ${t.name}
            AND table_schema = 'public'
            AND column_name IN ('updated_at', 'created_at', 'timestamp')
          LIMIT 1
        `;
        if (cols.length > 0) {
          const col = cols[0].column_name;
          const latest = await sql.unsafe(
            `SELECT "${col}"::text as ts FROM "${t.name}" ORDER BY "${col}" DESC LIMIT 1`,
          );
          recentActivity.push({
            table: t.name,
            last_updated: latest[0]?.ts ?? null,
          });
        }
      } catch {
        // Skip tables without timestamp columns
      }
    }

    // List schemas
    const schemaRows = await sql`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `;

    return NextResponse.json({
      connected: true,
      latency_ms: latency,
      tables,
      recent_activity: recentActivity,
      schemas: schemaRows.map((r) => r.schema_name),
    } satisfies DatabaseStatus);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      {
        connected: false,
        latency_ms: -1,
        tables: [],
        recent_activity: [],
        schemas: [],
        error: message,
      } satisfies DatabaseStatus,
      { status: 503 },
    );
  }
}
