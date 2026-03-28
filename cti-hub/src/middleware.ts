import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware to protect routes and handle auth redirects.
 * Uses Firebase Auth token stored in httpOnly cookie.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute =
    pathname.startsWith('/board') ||
    pathname.startsWith('/manager') ||
    pathname.startsWith('/agents') ||
    pathname.startsWith('/memory') ||
    pathname.startsWith('/policies') ||
    pathname.startsWith('/logs') ||
    pathname.startsWith('/pricing') ||
    pathname === '/settings';

  const isAuthRoute = pathname.startsWith('/auth/login');
  const isCallbackRoute = pathname.startsWith('/auth/callback');

  if (pathname === '/') {
    return NextResponse.next();
  }

  if (
    pathname.includes('.') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    isCallbackRoute
  ) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get('firebase-auth-token');

  if (isProtectedRoute && !authToken) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && authToken) {
    return NextResponse.redirect(new URL('/board', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/board/:path*',
    '/manager/:path*',
    '/agents/:path*',
    '/memory/:path*',
    '/policies/:path*',
    '/logs/:path*',
    '/pricing/:path*',
    '/settings/:path*',
    '/auth/login',
  ],
};
