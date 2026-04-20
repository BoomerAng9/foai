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
  '/franchise',
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
  '/api/sports/',
  '/api/auth/',
  '/api/players',
  '/api/teams',         // Player Index Drawer — browse-first, public
  '/api/rankings',      // SSE stream + snapshot — browse-first, public
  '/api/tie/',
  '/api/feed',
  '/api/news',
  '/api/podcast/episodes',
  '/api/platform/freshness',
  '/api/draft/team-needs',
  '/api/seed-board',
  '/teams/',
  '/huddle/',
  '/podcasters/',
  '/api/health',
  '/api/podcasters/upgrade-plan',
  '/api/webhooks/',
  '/api/draft/tokens/webhook',
  '/generated/',
  '/franchise/',
  '/api/franchise/',
];

/** API paths that allow unauthenticated GET but protect POST/PUT/DELETE. */
const PUBLIC_GET_ONLY = [
  '/api/huddle/',
  '/api/webhooks/stepper',
  '/api/draft/tokens',
  '/api/draft/simulate/',
];

const AUTH_COOKIE = 'firebase-auth-token';

/**
 * Tighter caps for endpoints that call paid LLM / TTS / image / video APIs.
 * Prevents a single IP from burning the budget on any one expensive path.
 * First match wins. Authenticated callers get 3× these limits.
 */
const COST_HEAVY_LIMITS: Array<{ prefix: string; max: number }> = [
  { prefix: '/api/videos/generate', max: 3 },       // video gen — most expensive
  { prefix: '/api/generate-image', max: 5 },
  { prefix: '/api/players/generate-image', max: 5 },
  { prefix: '/api/film/analyze', max: 5 },
  { prefix: '/api/studio/debate', max: 8 },
  { prefix: '/api/podcast/generate', max: 8 },
  { prefix: '/api/cards/bakeoff', max: 8 },
  { prefix: '/api/grade/recalculate', max: 10 },
  { prefix: '/api/players/forecast', max: 10 },
  { prefix: '/api/analysts/auto-publish', max: 10 },
  { prefix: '/api/seed/expand', max: 5 },
  { prefix: '/api/voice/config', max: 20 },
];

function costHeavyMax(pathname: string, isAuthed: boolean): number | null {
  for (const rule of COST_HEAVY_LIMITS) {
    if (pathname.startsWith(rule.prefix)) return isAuthed ? rule.max * 3 : rule.max;
  }
  return null;
}

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

    // Tighter cap for expensive endpoints (LLM/image/video/voice gen).
    // Cookie presence is a proxy for "authenticated caller" — they get 3×.
    const isAuthed = !!request.cookies.get(AUTH_COOKIE)?.value;
    const heavyCap = costHeavyMax(pathname, isAuthed);
    const effectiveMax = heavyCap ?? RATE_LIMIT_MAX;
    // Use a separate bucket for heavy paths so global 100/min doesn't
    // mask the tighter limit, and vice versa.
    const bucketKey = heavyCap != null ? `${ip}:${pathname}` : ip;
    const result = rateLimit(bucketKey, effectiveMax, RATE_LIMIT_WINDOW_MS);

    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(result.resetMs / 1000)),
            'X-RateLimit-Limit': String(effectiveMax),
            'X-RateLimit-Remaining': '0',
            ...(heavyCap != null && { 'X-RateLimit-Scope': 'cost-heavy' }),
          },
        },
      );
    }
  }

  // Let public routes through
  if (isPublic(pathname, method)) {
    return NextResponse.next();
  }

  // Server-to-server bearer-token requests (scheduled crons, webhooks,
  // pipeline runners) don't carry a firebase cookie. Let them pass the
  // middleware — the route handler still enforces PIPELINE_AUTH_KEY via
  // safeCompare, so this is a cookie-check bypass, not an auth bypass.
  const authHeader = request.headers.get('authorization');
  if (pathname.startsWith('/api/') && authHeader?.startsWith('Bearer ')) {
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
