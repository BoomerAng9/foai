import { NextRequest, NextResponse } from 'next/server';

// Owner-only routes — beta testers and deploy.foai.cloud users cannot access these
const OWNER_ONLY_ROUTES = ['/live', '/plug-bin', '/open-seats', '/enrollments', '/team', '/pricing'];
// Must match src/lib/allowlist.ts — cannot import in Edge Runtime middleware
const OWNER_EMAILS = ['bpo@achievemor.io', 'jarrett.risher@gmail.com'];

// Routes only available on deploy.foai.cloud (customer-facing product)
const DEPLOY_ROUTES = ['/chat', '/agents', '/deploy-agent', '/projects', '/settings', '/profile', '/billing', '/auth', '/grammar'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = request.headers.get('host') || '';
  const isDeployDomain = hostname.includes('deploy.foai.cloud');

  // On deploy.foai.cloud — block owner-only routes entirely
  if (isDeployDomain) {
    const isAllowedRoute = pathname === '/' ||
      DEPLOY_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/')) ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/');

    if (!isAllowedRoute) {
      return NextResponse.redirect(new URL('/chat', request.url));
    }

    // Redirect / to /chat on deploy domain
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/chat', request.url));
    }

    return NextResponse.next();
  }

  // On cti.foai.cloud — check owner-only routes
  const isRestricted = OWNER_ONLY_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
  if (!isRestricted) return NextResponse.next();

  // Check the auth cookie — extract email from the JWT payload
  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  // Decode JWT payload (middle segment) to get email — no verification needed here
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const email = payload.email || '';
    if (OWNER_EMAILS.includes(email.toLowerCase())) {
      return NextResponse.next();
    }
  } catch {
    // Malformed token — redirect
  }

  return NextResponse.redirect(new URL('/chat', request.url));
}

export const config = {
  matcher: [
    // Match everything except static files and API routes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.woff|.*\\.ttf|fonts/).*)',
  ],
};
