export type PlatformSurface = 'cti' | 'deploy';

export interface BrandConfig {
  surface: PlatformSurface;
  systemName: string;
  navLabel: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  homePath: string;
  billingPath: string | null;
  ownerHubUrl: string | null;
  themeStorageKey: string;
}

const BRAND_BY_SURFACE: Record<PlatformSurface, BrandConfig> = {
  cti: {
    surface: 'cti',
    systemName: 'CTI Hub',
    navLabel: 'CTI Hub',
    tagline: 'Coastal Talent & Innovation control plane',
    primaryColor: '#00A3FF',
    accentColor: '#14B8A6',
    metaTitle: 'CTI Hub | FOAI',
    metaDescription: 'Owner command center for CTI operations, partner workflows, and live agent oversight.',
    metaKeywords: ['CTI Hub', 'Coastal Talent & Innovation', 'AI operations', 'FOAI', 'ACHEEVY'],
    homePath: '/chat',
    billingPath: null,
    ownerHubUrl: null,
    themeStorageKey: 'cti-theme-preference',
  },
  deploy: {
    surface: 'deploy',
    systemName: 'The Deploy Platform',
    navLabel: 'Deploy Platform',
    tagline: 'AI-managed operations',
    primaryColor: '#E8A020',
    accentColor: '#00A3FF',
    metaTitle: 'The Deploy Platform | FOAI',
    metaDescription: 'Customer-facing deployment surface for launching agents, managing projects, and operating AI workflows.',
    metaKeywords: ['The Deploy Platform', 'AI-managed operations', 'Deploy Platform', 'FOAI', 'ACHEEVY'],
    homePath: '/deploy-landing',
    billingPath: '/billing',
    ownerHubUrl: 'https://cti.foai.cloud',
    themeStorageKey: 'deploy-theme-preference',
  },
};

function normalizeHostname(hostname: string | null | undefined): string {
  return (hostname || '').trim().toLowerCase().split(':')[0] || '';
}

export function surfaceFromHostname(hostname: string | null | undefined): PlatformSurface {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return 'deploy';
  if (normalized.includes('cti.foai.cloud') || normalized.includes('cti.localhost')) return 'cti';
  if (normalized.includes('deploy.foai.cloud') || normalized.includes('deploy.localhost')) return 'deploy';
  if (normalized.includes('localhost') || normalized.includes('127.0.0.1')) return 'cti';
  return 'deploy';
}

export function getBrandConfig(surface: PlatformSurface): BrandConfig {
  return BRAND_BY_SURFACE[surface];
}

export function getBrandConfigFromHostname(hostname: string | null | undefined): BrandConfig {
  return getBrandConfig(surfaceFromHostname(hostname));
}
