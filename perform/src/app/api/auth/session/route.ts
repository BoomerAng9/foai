import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json();
  if (!accessToken || typeof accessToken !== 'string' || accessToken.length > 4096) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('firebase-auth-token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours (was 7 days)
    path: '/',
  });
  return res;
}
