import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json();
  if (!accessToken) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('firebase-auth-token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}
