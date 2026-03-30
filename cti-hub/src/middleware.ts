import { NextRequest, NextResponse } from 'next/server';

// Owner-only routes — beta testers cannot access these
const OWNER_ONLY_ROUTES = ['/live', '/plug-bin', '/open-seats', '/enrollments', '/team', '/pricing'];
// Must match src/lib/allowlist.ts — cannot import in Edge Runtime middleware
const OWNER_EMAILS = ['bpo@achievemor.io', 'jarrett.risher@gmail.com'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if this is an owner-only route
  const isRestricted = OWNER_ONLY_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
  if (!isRestricted) return NextResponse.next();

  // Check the auth cookie — extract email from the JWT payload
  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) {
    // No auth — redirect to chat
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  // Decode JWT payload (middle segment) to get email — no verification needed here
  // (the API routes verify the token properly; middleware is a fast gate)
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const email = payload.email || '';
    if (OWNER_EMAILS.includes(email.toLowerCase())) {
      return NextResponse.next();
    }
  } catch {
    // Malformed token — redirect
  }

  // Not owner — redirect to chat
  return NextResponse.redirect(new URL('/chat', request.url));
}

export const config = {
  matcher: ['/live/:path*', '/plug-bin/:path*', '/open-seats/:path*', '/enrollments/:path*', '/team/:path*', '/pricing/:path*'],
};
