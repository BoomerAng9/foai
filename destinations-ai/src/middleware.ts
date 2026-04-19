import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge middleware — soft auth gate.
 *
 * Firebase Admin can't run on the Edge runtime, so we only check for the
 * presence of the session cookie at this layer. Route handlers still
 * call verifySessionCookie() to reject forgeries; this gate just short-
 * circuits requests without any cookie before they hit the origin.
 *
 * Matched routes below are the mutation endpoints. Public GET routes are
 * intentionally left open so non-authenticated visitors can browse the
 * discovery canvas.
 */

const AUTH_COOKIE = 'firebase-auth-token';

const PROTECTED_API_ROUTES = [
  '/api/waitlist',
  '/api/intentions',
  '/api/shortlist',
];

const PROTECTED_PAGE_ROUTES = ['/account'];

function isProtectedApi(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;

  // Guard: mutation methods on protected API routes need a cookie.
  if (isProtectedApi(pathname)) {
    const method = request.method;
    // Allow GET on read endpoints; block mutations without a cookie.
    if (method !== 'GET' && !cookie) {
      return NextResponse.json(
        { error: 'authentication required' },
        { status: 401 },
      );
    }
  }

  if (isProtectedPage(pathname) && !cookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/waitlist/:path*',
    '/api/intentions/:path*',
    '/api/shortlist/:path*',
    '/account/:path*',
  ],
};
