import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/health — Health check endpoint
 * Always returns 200. Reports database connectivity in the body.
 */
export async function GET() {
  let database = false;

  if (sql) {
    try {
      await sql`SELECT 1`;
      database = true;
    } catch {
      // DB unreachable — reported in body
    }
  }

  return NextResponse.json({
    status: 'ok',
    service: 'perform',
    timestamp: new Date().toISOString(),
    database,
  });
}
