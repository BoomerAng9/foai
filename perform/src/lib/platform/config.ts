export const CURRENT_DRAFT_CLASS_YEAR = '2026';

export const PLATFORM_ROUTES = {
  home: '/',
  draftHub: '/draft',
  draftBoard: '/draft/board',
  draftSimulation: '/draft/simulate',
  draftWarRoom: '/draft/war-room',
  playerIndex: '/players',
  playerCards: '/players/cards',
  shows: '/podcast/shows',
  studio: '/studio',
  analysts: '/analysts',
  franchise: '/franchise',
  huddle: '/huddle',
  dashboard: '/dashboard',
} as const;

export interface PlatformNavItem {
  label: string;
  href: string;
  matchPrefixes?: string[];
}

export const PRIMARY_NAV_ITEMS: PlatformNavItem[] = [
  { label: 'Home', href: PLATFORM_ROUTES.home },
  { label: 'Draft', href: PLATFORM_ROUTES.draftHub, matchPrefixes: ['/draft'] },
  { label: 'Simulate', href: PLATFORM_ROUTES.draftSimulation },
  { label: 'Players', href: PLATFORM_ROUTES.playerIndex, matchPrefixes: ['/players'] },
  { label: 'Shows', href: PLATFORM_ROUTES.shows, matchPrefixes: ['/podcast'] },
  { label: 'Studio', href: PLATFORM_ROUTES.studio },
  { label: 'Franchise', href: PLATFORM_ROUTES.franchise },
  { label: 'Huddle', href: PLATFORM_ROUTES.huddle },
  { label: 'Dashboard', href: PLATFORM_ROUTES.dashboard },
];

export function isActiveNavRoute(pathname: string, href: string, matchPrefixes: string[] = []): boolean {
  if (href === '/') {
    return pathname === '/';
  }

  if (pathname === href || pathname.startsWith(`${href}/`)) {
    return true;
  }

  return matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}