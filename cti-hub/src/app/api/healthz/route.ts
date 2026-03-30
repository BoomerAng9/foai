import { NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';

export async function GET() {
  const checks: Record<string, boolean> = {};
  let healthy = true;

  // Database
  try {
    if (sql) {
      await sql`SELECT 1`;
      checks.database = true;
    } else {
      checks.database = false;
      healthy = false;
    }
  } catch {
    checks.database = false;
    healthy = false;
  }

  // Required env vars
  checks.openrouter = !!process.env.OPENROUTER_API_KEY;
  checks.google = !!process.env.GOOGLE_KEY;
  checks.firebase = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!checks.openrouter || !checks.google) healthy = false;

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks },
    { status: healthy ? 200 : 503 },
  );
}
