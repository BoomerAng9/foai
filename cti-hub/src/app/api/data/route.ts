/**
 * Generic data API for client-side DB access via server proxy.
 * Replaces direct insforge.database calls from client components.
 */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';

export async function POST(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { action, table, data, filters } = await request.json();

  try {
    if (action === 'select') {
      let query = sql`SELECT * FROM ${sql(table)}`;
      if (filters?.user_id) query = sql`SELECT * FROM ${sql(table)} WHERE user_id = ${filters.user_id}`;
      if (filters?.notebook_id) query = sql`SELECT * FROM ${sql(table)} WHERE notebook_id = ${filters.notebook_id}`;
      if (filters?.user_id && filters?.notebook_id) {
        query = sql`SELECT * FROM ${sql(table)} WHERE user_id = ${filters.user_id} AND notebook_id = ${filters.notebook_id}`;
      }

      const rows = await query;
      return NextResponse.json({ data: rows });
    }

    if (action === 'insert') {
      const rows = await sql`INSERT INTO ${sql(table)} ${sql(data)} RETURNING *`;
      return NextResponse.json({ data: rows[0] });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Query failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
