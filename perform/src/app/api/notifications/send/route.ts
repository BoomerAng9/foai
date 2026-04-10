import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { adminAuth } from '@/lib/firebase/admin';
import { adminMessaging } from '@/lib/firebase/admin';

/** UIDs that are allowed to send notifications (admin users). */
const ADMIN_EMAILS = new Set([
  process.env.ADMIN_EMAIL, // primary admin
]);

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const authResult = await requireAuth(request);
  if (!authResult.ok) return authResult.response;

  // 2. Admin check — verify custom claims or email allowlist
  try {
    const userRecord = await adminAuth.getUser(authResult.userId);
    const isAdmin =
      userRecord.customClaims?.admin === true ||
      ADMIN_EMAILS.has(userRecord.email ?? '');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to verify admin status' },
      { status: 500 },
    );
  }

  // 3. Parse body
  let body: {
    topic?: string;
    tokens?: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { topic, tokens, title, body: messageBody, data, imageUrl } = body;

  if (!title || !messageBody) {
    return NextResponse.json(
      { error: 'title and body are required' },
      { status: 400 },
    );
  }

  if (!topic && (!tokens || tokens.length === 0)) {
    return NextResponse.json(
      { error: 'Either topic or tokens must be provided' },
      { status: 400 },
    );
  }

  const notification = {
    title,
    body: messageBody,
    ...(imageUrl ? { imageUrl } : {}),
  };

  try {
    // 4a. Send to topic
    if (topic) {
      const result = await adminMessaging.send({
        topic,
        notification,
        data: data ?? {},
      });
      return NextResponse.json({ ok: true, messageId: result });
    }

    // 4b. Send to specific tokens
    if (tokens && tokens.length > 0) {
      const response = await adminMessaging.sendEachForMulticast({
        tokens,
        notification,
        data: data ?? {},
      });

      return NextResponse.json({
        ok: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
    }

    return NextResponse.json({ error: 'No target specified' }, { status: 400 });
  } catch (err) {
    console.error('[Notifications] send error:', err);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 },
    );
  }
}
