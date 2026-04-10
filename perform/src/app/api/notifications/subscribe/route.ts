import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { subscribeToTopic } from '@/lib/firebase/messaging';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.ok) return authResult.response;

  const { uid } = { uid: authResult.userId };

  let body: { token?: string; topics?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { token, topics } = body;

  if (!token || typeof token !== 'string') {
    return NextResponse.json(
      { error: 'FCM token is required' },
      { status: 400 },
    );
  }

  try {
    // Store token in Firestore under users/{uid}/fcmTokens
    const tokenRef = getAdminFirestore()
      .collection('users')
      .doc(uid)
      .collection('fcmTokens')
      .doc(token);

    await tokenRef.set({
      token,
      createdAt: FieldValue.serverTimestamp(),
      userAgent: request.headers.get('user-agent') || '',
    });

    // Subscribe to requested topics
    if (topics && Array.isArray(topics)) {
      for (const topic of topics) {
        if (typeof topic === 'string' && topic.length > 0) {
          await subscribeToTopic(token, topic);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Notifications] subscribe error:', err);
    return NextResponse.json(
      { error: 'Failed to register token' },
      { status: 500 },
    );
  }
}
