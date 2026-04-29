import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://hawk-gateway:8000';

// POST /api/auth/sign-out
// Owner clicked Sign out from the menu. Forward to gateway /logout (which
// clears ch_session) and redirect home. Same-origin so the cookie travels
// automatically; we also clear it locally as a belt-and-suspenders.
export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    await fetch(`${GATEWAY_URL}/logout`, {
      method: 'POST',
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    });
  } catch {
    // Gateway unreachable — still clear the cookie client-side and redirect.
  }
  const res = NextResponse.redirect(new URL('/', req.url), { status: 303 });
  res.cookies.set('ch_session', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  });
  return res;
}
