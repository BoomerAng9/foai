import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Public routes that never require authentication.
 * Static assets, _next internals, and the favicon are excluded by the
 * matcher config below so they never even hit this middleware.
 */
const PUBLIC_PATHS = [
  '/',
  '/tie',
  '/draft',
  '/players',
  '/rankings',
  '/flag-football',
  '/dashboard',
  '/analysts',
  '/podcast',
  '/film',
  '/studio',
  '/debate',
  '/data',
  '/reveal',
  '/access',
  '/audition/voice',
  '/huddle',
  '/grading',
  '/login',
  '/teams',
  '/podcasters',
];

/** Path prefixes that are always public (including sub-routes). */
const PUBLIC_PREFIXES = [
  '/tie/',
  '/draft/',
  '/players/',
  '/rankings/',
  '/analysts/',
  '/studio/',
  '/podcast/',
  '/api/cfb/',
  '/api/nfl/',
  '/api/auth/',
  '/api/players',
  '/api/tie/',
  '/api/feed',
  '/api/news',
  '/api/podcast/episodes',
  '/api/seed-board',
  '/teams/',
  '/huddle/',
  '/podcasters/',
  '/api/health',
  '/api/podcasters/upgrade-plan',
  '/api/webhooks/',
  '/generated/',
];

/** API paths that allow unauthenticated GET but protect POST/PUT/DELETE. */
const PUBLIC_GET_ONLY = [
  '/api/huddle/',
  '/api/webhooks/stepper',
];

const AUTH_COOKIE = 'firebase-auth-token';

/** Rate limit: 100 requests per minute per IP. */
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isPublic(pathname: string, method: string): boolean {
  // Exact public paths
  if (PUBLIC_PATHS.includes(pathname)) return true;

  // Public prefixes
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;

  // GET-only public endpoints
  if (method === 'GET' && PUBLIC_GET_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // ── Rate limiting on all /api/ routes ──
  if (pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const result = rateLimit(ip, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(result.resetMs / 1000)),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }
  }

  // Let public routes through
  if (isPublic(pathname, method)) {
    return NextResponse.next();
  }

  // Protected routes — check for session cookie.
  // Full token verification happens in the API route handlers via requireAuth().
  // Middleware performs a lightweight cookie-presence check and redirects
  // unauthenticated browsers; API routes get a 401 JSON response instead.
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    // API requests get a JSON 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Page requests redirect to home
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *  - _next/static, _next/image (Next.js internals)
     *  - favicon.ico, robots.txt, sitemap.xml
     *  - Static asset files (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
