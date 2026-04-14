import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getBrandConfig, surfaceFromHostname } from '@/lib/platform/surface';

// Owner-only routes — beta testers and deploy.foai.cloud users cannot access these
const OWNER_ONLY_ROUTES = ['/live', '/plug-bin', '/open-seats', '/enrollments', '/affiliates', '/team', '/pricing', '/research', '/smelter-os', '/partners'];
// Must match src/lib/allowlist.ts — cannot import in Edge Runtime middleware
const OWNER_EMAILS = (process.env.OWNER_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

// Firebase public JWKS for JWT verification (Edge Runtime compatible)
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '';

// Routes available on deploy.foai.cloud (customer-facing product)
const DEPLOY_ROUTES = ['/chat', '/agents', '/meet', '/deploy-agent', '/projects', '/assets', '/settings', '/profile', '/billing', '/auth', '/grammar', '/deploy-landing', '/about', '/plug', '/broadcast', '/create', '/pipeline', '/process', '/how-to', '/sqwaadrun'];
const DEPLOY_ONLY_ROUTES = ['/deploy-landing', '/billing'];
const CTI_BLOCKED_ROUTES = ['/pricing', '/billing'];

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = request.headers.get('host') || '';
  const surface = surfaceFromHostname(hostname);
  const homePath = getBrandConfig(surface).homePath;
  const isDeployDomain = hostname.includes('deploy.foai.cloud');
  const isSqwaadrunDomain = hostname.includes('sqwaadrun.foai.cloud');

  // sqwaadrun.foai.cloud — dedicated subdomain for the Sqwaadrun.
  // Root and any non-plug path rewrites into /plug/sqwaadrun.
  if (isSqwaadrunDomain) {
    const isAllowed =
      pathname === '/' ||
      pathname.startsWith('/plug/sqwaadrun') ||
      pathname.startsWith('/api/sqwaadrun') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/billing') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/hawks/');

    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/plug/sqwaadrun', request.url));
    }

    if (!isAllowed) {
      return NextResponse.redirect(new URL('/plug/sqwaadrun', request.url));
    }

    return NextResponse.next();
  }

  // On cti.foai.cloud — root goes to ACHEEVY chat (owner's entry point)
  const isCtiDomain = hostname.includes('cti.foai.cloud');
  if (isCtiDomain && pathname === '/') {
    return NextResponse.rewrite(new URL('/chat', request.url));
  }
  if (isCtiDomain && (matchesRoute(pathname, DEPLOY_ONLY_ROUTES) || matchesRoute(pathname, CTI_BLOCKED_ROUTES))) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  // On deploy.foai.cloud — block owner-only routes entirely
  if (isDeployDomain) {
    if (pathname === '/pricing' || pathname.startsWith('/pricing/')) {
      return NextResponse.redirect(new URL('/billing', request.url));
    }

    const isAllowedRoute = pathname === '/' ||
      matchesRoute(pathname, DEPLOY_ROUTES) ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/plugs/');

    if (!isAllowedRoute) {
      return NextResponse.redirect(new URL(homePath, request.url));
    }

    // Landing page on deploy domain root
    if (pathname === '/') {
      return NextResponse.rewrite(new URL(homePath, request.url));
    }

    return NextResponse.next();
  }

  // On cti.foai.cloud — check owner-only routes
  const isRestricted = OWNER_ONLY_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
  if (!isRestricted) return NextResponse.next();

  // Check the auth cookie — verify JWT signature against Firebase JWKS
  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    const email = (payload.email as string) || '';
    if (OWNER_EMAILS.includes(email.toLowerCase())) {
      return NextResponse.next();
    }
  } catch {
    // Invalid/expired token — redirect
  }

  return NextResponse.redirect(new URL(homePath, request.url));
}

export const config = {
  matcher: [
    // Match everything except static files and API routes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.woff|.*\\.ttf|fonts/).*)',
  ],
};
