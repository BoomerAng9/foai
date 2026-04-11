import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth-guard';

export async function GET(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const users = await sql`SELECT * FROM podcaster_users WHERE firebase_uid = ${auth.userId}`;
  if (!users.length) return NextResponse.json({ error: 'Not registered' }, { status: 404 });

  const schema = await sql`SELECT * FROM podcaster_hawks_schema WHERE user_id = ${users[0].id} ORDER BY version DESC LIMIT 1`;
  return NextResponse.json({ user: users[0], hawks_schema: schema[0] || null });
}

export async function PUT(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const users = await sql`SELECT * FROM podcaster_users WHERE firebase_uid = ${auth.userId}`;
  if (!users.length) return NextResponse.json({ error: 'Not registered' }, { status: 404 });

  const body = await req.json();
  const {
    mission, vision, objectives, needs_analysis, selected_team, huddl_name,
    delivery_interval, delivery_time, delivery_timezone,
    email_delivery, delivery_email, delivery_format, notification_channels,
  } = body;

  // Update user fields if provided
  const hasUserFields = selected_team !== undefined || huddl_name !== undefined
    || delivery_interval !== undefined || delivery_time !== undefined
    || delivery_timezone !== undefined || email_delivery !== undefined
    || delivery_email !== undefined || delivery_format !== undefined
    || notification_channels !== undefined;

  if (hasUserFields) {
    await sql`UPDATE podcaster_users SET
      selected_team = COALESCE(${selected_team ?? null}, selected_team),
      huddl_name = COALESCE(${huddl_name ?? null}, huddl_name),
      delivery_interval = COALESCE(${delivery_interval ?? null}, delivery_interval),
      delivery_time = COALESCE(${delivery_time ?? null}, delivery_time),
      delivery_timezone = COALESCE(${delivery_timezone ?? null}, delivery_timezone),
      email_delivery = COALESCE(${email_delivery ?? null}, email_delivery),
      delivery_email = COALESCE(${delivery_email ?? null}, delivery_email),
      delivery_format = COALESCE(${delivery_format ?? null}, delivery_format),
      notification_channels = COALESCE(${notification_channels ?? null}, notification_channels),
      updated_at = NOW()
      WHERE id = ${users[0].id}`;
  }

  // Update hawks schema with new version
  if (mission || vision || objectives || needs_analysis) {
    const currentVersion = await sql`SELECT COALESCE(MAX(version), 0) as v FROM podcaster_hawks_schema WHERE user_id = ${users[0].id}`;
    await sql`INSERT INTO podcaster_hawks_schema (user_id, mission, vision, objectives, needs_analysis, version)
      VALUES (${users[0].id}, ${mission || null}, ${vision || null}, ${JSON.stringify(objectives || [])}, ${needs_analysis || null}, ${Number(currentVersion[0].v) + 1})`;
  }

  return NextResponse.json({ ok: true });
}
