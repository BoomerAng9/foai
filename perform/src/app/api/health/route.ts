import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/health — Health check endpoint
 * Returns 200 if app and database are operational, 500 otherwise.
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    if (!sql) {
      return NextResponse.json(
        { status: 'degraded', database: 'not_configured', timestamp },
        { status: 500 },
      );
    }

    await sql`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp,
    });
  } catch {
    return NextResponse.json(
      { status: 'error', database: 'unreachable', timestamp },
      { status: 500 },
    );
  }
}
