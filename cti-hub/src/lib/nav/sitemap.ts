/**
 * CTI Hub / Deploy Platform sitemap
 * ==================================
 * Single source of truth for left-panel navigation, grouped into
 * main branches with sub-pages. Host-aware so cti.foai.cloud and
 * deploy.foai.cloud can surface different trees from the same
 * codebase (middleware.ts already enforces the security boundary;
 * the sitemap only drives UI presentation).
 *
 * The Spinner chat function (formerly referred to as "Speakly"
 * in older memories) consumes this via /api/sitemap to self-
 * navigate the platform — so entries MUST include a stable id,
 * a human label, and a short description Spinner can match
 * against natural-language prompts like "take me to the Plug Bin."
 */

import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bird,
  Bot,
  Briefcase,
  Building2,
  CreditCard,
  FileText,
  FolderOpen,
  Handshake,
  HelpCircle,
  Home,
  Info,
  LayoutGrid,
  MessageSquare,
  Monitor,
  Package,
  Radio,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Terminal,
  TrendingUp,
  User,
  Users,
  Video,
  Wrench,
  Zap,
} from 'lucide-react';

export type NavHost = 'cti' | 'deploy';

export type NavEntryKind =
  | 'internal'    // Next.js route inside this app
  | 'external'    // http(s) link to another site (opens in new tab)
  | 'reroute';    // external but treated as a first-class platform access point

export interface NavEntry {
  /** Stable machine-readable id, e.g. "build.deploy-agent" */
  id: string;
  /** Short human label shown in the left panel */
  label: string;
  /** One-line description Spinner uses for intent matching */
  description: string;
  /** Target href (internal path like "/chat" or full URL) */
  href: string;
  kind: NavEntryKind;
  icon: LucideIcon;
  /** Which hosts render this entry. Middleware enforces the security boundary. */
  hosts: NavHost[];
  /** Owner-only (hides from non-admin users even on cti) */
  ownerOnly?: boolean;
  /** Optional children for branches that have sub-pages */
  children?: NavEntry[];
}

export interface NavBranch {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  hosts: NavHost[];
  ownerOnly?: boolean;
  /** Sub-pages under this branch */
  entries: NavEntry[];
}

/** Standalone entries that live at the top of the nav without a branch wrapper */
export const TOP_LEVEL_ENTRIES: NavEntry[] = [
  {
    id: 'home',
    label: 'Home',
    description: 'Landing page with the latest mission briefing.',
    href: '/',
    kind: 'internal',
    icon: Home,
    hosts: ['cti', 'deploy'],
  },
  {
    id: 'chat',
    label: 'Chat w/ ACHEEVY',
    description: 'Conversational kiosk with ACHEEVY and the Boomer_Angs. Type your intent and get routed.',
    href: '/chat',
    kind: 'internal',
    icon: MessageSquare,
    hosts: ['cti', 'deploy'],
  },
];

/** Main grouped branches — replaces the flat 24-item NAV array */
export const NAV_BRANCHES: NavBranch[] = [
  // ── BUILD ──────────────────────────────────────────────
  {
    id: 'build',
    label: 'Build',
    description: 'Create, deploy, and manage your aiPLUGs and workflows.',
    icon: Wrench,
    hosts: ['cti', 'deploy'],
    entries: [
      {
        id: 'build.deploy-agent',
        label: 'Deploy Agent',
        description: 'Launch a new agentic workflow in one click.',
        href: '/deploy-agent',
        kind: 'internal',
        icon: Zap,
        hosts: ['cti', 'deploy'],
      },
      {
        id: 'build.create',
        label: 'Create',
        description: 'Start a new project, plug, or workflow from scratch or a template.',
        href: '/create',
        kind: 'internal',
        icon: Sparkles,
        hosts: ['cti', 'deploy'],
      },
      {
        id: 'build.projects',
        label: 'My Projects',
        description: 'All your active and archived workflows and projects.',
        href: '/projects',
        kind: 'internal',
        icon: FolderOpen,
        hosts: ['cti', 'deploy'],
      },
      {
        id: 'build.assets',
        label: 'Plug Bin',
        description: 'Your library of reusable plugs, assets, and artifacts.',
        href: '/assets',
        kind: 'internal',
        icon: Package,
        hosts: ['cti', 'deploy'],
      },
      {
        id: 'build.plug-bin-admin',
        label: 'Plug Bin Admin',
        description: 'Owner admin view for managing the global plug catalog.',
        href: '/plug-bin',
        kind: 'internal',
        icon: LayoutGrid,
        hosts: ['cti'],
        ownerOnly: true,
      },
      {
        id: 'build.pipeline',
        label: 'Pipeline',
        description: 'Current build pipeline status across all projects.',
        href: '/pipeline',
        kind: 'internal',
        icon: Activity,
        hosts: ['cti', 'deploy'],
      },
      {
        id: 'build.process',
        label: 'Process',
        description: 'Workflow orchestration and process automation.',
        href: '/process',
        kind: 'internal',
        icon: Wrench,
        hosts: ['cti', 'deploy'],
      },
    ],
  },

  // ── SQUAD ──────────────────────────────────────────────
  {
    id: 'squad',
    label: 'Squad',
    description: 'Your Boomer_Angs, Hawks, and team members.',
    icon: Users,
    hosts: ['cti', 'deploy'],
    entries: [
      {
        id: 'squad.agents',
        label: 'Agent HQ',
        description: 'All available agents and their current status.',
        href: '/agents',
        kind: 'internal',
        icon: Bot,
        hosts: ['cti', 'deploy'],
      },
      {
        id: 'squad.sqwaadrun',
        label: 'Sqwaadrun',
        description: 'The 17-Hawk fleet — web intelligence, data procurement, long-loop missions.',
        href: '/sqwaadrun',
        kind: 'internal',
        icon: Bird,
        hosts: ['cti', 'deploy'],
      },
      {
        id: 'squad.team',
        label: 'My Squad',
        description: 'Human teammates, roles, and seat management.',
        href: '/team',
        kind: 'internal',
        icon: Users,
        hosts: ['cti'],
        ownerOnly: true,
      },
      {
        id: 'squad.code-ang',
        label: 'Code_Ang',
        description: 'Codebase agent for build and refactor tasks.',
        href: '/code-ang',
        kind: 'internal',
        icon: Terminal,
        hosts: ['cti'],
        ownerOnly: true,
      },
    ],
  },

  // ── BROADCAST ──────────────────────────────────────────
  {
    id: 'broadcast',
    label: 'Broadcast',
    description: 'Live operations, video production, and automation control.',
    icon: Radio,
    hosts: ['cti', 'deploy'],
    entries: [
      {
        id: 'broadcast.broadcast',
        label: 'Broad|cast Studio',
        description: 'Video production studio with multi-camera, overlays, and export.',
        href: '/broadcast',
        kind: 'internal',
        icon: Video,
        hosts: ['cti', 'deploy'],
      },
      {
        id: 'broadcast.live',
        label: 'Executions',
        description: 'Real-time feed of every running agent, mission, and workflow.',
        href: '/live',
        kind: 'internal',
        icon: Activity,
        hosts: ['cti'],
        ownerOnly: true,
      },
      {
        id: 'broadcast.automation',
        label: 'Automation',
        description: 'Scheduled jobs, triggers, and automated pipelines.',
        href: '/automation',
        kind: 'internal',
        icon: Monitor,
        hosts: ['cti'],
        ownerOnly: true,
      },
    ],
  },

  // ── COMMERCE ───────────────────────────────────────────
  {
    id: 'commerce',
    label: 'Commerce',
    description: 'Marketplace, enrollments, affiliates, and billing.',
    icon: ShoppingBag,
    hosts: ['cti', 'deploy'],
    entries: [
      {
        id: 'commerce.marketplace',
        label: 'Marketplace',
        description: 'Browse and purchase plugs, templates, and agent packages.',
        href: '/marketplace',
        kind: 'internal',
        icon: ShoppingBag,
        hosts: ['cti', 'deploy'],
      },
      {
        id: 'commerce.open-seats',
        label: 'Open Seats',
        description: 'Seats available for enrollment in current cohorts and programs.',
        href: '/open-seats',
        kind: 'internal',
        icon: Search,
        hosts: ['cti'],
        ownerOnly: true,
      },
      {
        id: 'commerce.enrollments',
        label: 'Enrollments',
        description: 'Active enrollments and cohort management.',
        href: '/enrollments',
        kind: 'internal',
        icon: TrendingUp,
        hosts: ['cti'],
        ownerOnly: true,
      },
      {
        id: 'commerce.affiliates',
        label: 'Affiliates',
        description: 'Affiliate program, referral tracking, and commission management.',
        href: '/affiliates',
        kind: 'internal',
        icon: Handshake,
        hosts: ['cti'],
        ownerOnly: true,
      },
      {
        id: 'commerce.billing',
        label: 'Billing',
        description: 'Subscription, invoices, and payment methods.',
        href: '/pricing',
        kind: 'internal',
        icon: CreditCard,
        hosts: ['cti'],
        ownerOnly: true,
      },
    ],
  },

  // ── PARTNERS (cti only, owner only — seeded with MindEdge for Task H) ──
  {
    id: 'partners',
    label: 'Partners',
    description: 'Owner-only partner workspaces. Upload, sub-pages, webhooks, and shared assets per partner.',
    icon: Handshake,
    hosts: ['cti'],
    ownerOnly: true,
    entries: [
      {
        id: 'partners.index',
        label: 'All Partners',
        description: 'List of onboarded partners.',
        href: '/partners',
        kind: 'internal',
        icon: Handshake,
        hosts: ['cti'],
        ownerOnly: true,
      },
      {
        id: 'partners.mindedge',
        label: 'MindEdge',
        description: 'MindEdge partner package — marketing materials, webhooks, and documents.',
        href: '/partners/mindedge',
        kind: 'internal',
        icon: Building2,
        hosts: ['cti'],
        ownerOnly: true,
      },
    ],
  },

  // ── KNOWLEDGE ──────────────────────────────────────────
  {
    id: 'knowledge',
    label: 'Knowledge',
    description: 'Research, how-to guides, and platform documentation.',
    icon: FileText,
    hosts: ['cti', 'deploy'],
    entries: [
      {
        id: 'knowledge.research',
        label: 'Research',
        description: 'Research agents, saved reports, and ongoing investigations.',
        href: '/research',
        kind: 'internal',
        icon: Search,
        hosts: ['cti'],
        ownerOnly: true,
      },
      {
        id: 'knowledge.how-to',
        label: 'How To',
        description: 'Step-by-step guides for every feature on the platform.',
        href: '/how-to',
        kind: 'internal',
        icon: HelpCircle,
        hosts: ['cti', 'deploy'],
      },
      {
        id: 'knowledge.about',
        label: 'About',
        description: 'About this platform and the FOAI ecosystem.',
        href: '/about',
        kind: 'internal',
        icon: Info,
        hosts: ['cti', 'deploy'],
      },
    ],
  },

  // ── ACCOUNT ────────────────────────────────────────────
  {
    id: 'account',
    label: 'Account',
    description: 'Your profile, settings, and workspace preferences.',
    icon: User,
    hosts: ['cti', 'deploy'],
    entries: [
      {
        id: 'account.settings',
        label: 'Settings',
        description: 'Account settings, integrations, and preferences.',
        href: '/settings',
        kind: 'internal',
        icon: Settings,
        hosts: ['cti', 'deploy'],
      },
      {
        id: 'account.profile',
        label: 'Profile',
        description: 'Your profile, avatar, and display info.',
        href: '/profile',
        kind: 'internal',
        icon: User,
        hosts: ['cti', 'deploy'],
      },
    ],
  },
];

/**
 * External reroutes — sit at the bottom of the nav, below branches.
 * Smelter OS is cti-only per the "smelter-os-tab-reroute" directive:
 * it links out to its own platform with its own theme, not embedded.
 * Per|Form is public and appears on both hosts.
 */
export const EXTERNAL_REROUTES: NavEntry[] = [
  {
    id: 'external.smelter-os',
    label: 'Smelter OS',
    description: 'Launch the Smelter OS file manager and platform (opens in a new window).',
    // TODO: confirm canonical URL with Rish — defaulting to smelter.foai.cloud.
    href: 'https://smelter.foai.cloud',
    kind: 'reroute',
    icon: Briefcase,
    hosts: ['cti'],
    ownerOnly: true,
  },
  {
    id: 'external.perform',
    label: 'Per|Form',
    description: 'Per|Form sports intelligence platform — NFL Draft rankings, grades, and broadcast studio.',
    href: 'https://perform.foai.cloud',
    kind: 'external',
    icon: Activity,
    hosts: ['cti', 'deploy'],
  },
];

/* ── Host detection + filtering ────────────────────────── */

/**
 * Derive the active host variant from a hostname string.
 * Defaults to 'deploy' so public/preview environments get the
 * public surface if we can't match cti.
 */
export function hostVariantFromHostname(hostname: string | null | undefined): NavHost {
  if (!hostname) return 'deploy';
  if (hostname.includes('cti.foai.cloud') || hostname.includes('cti.localhost')) return 'cti';
  // localhost development defaults to cti so the owner sees everything
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) return 'cti';
  return 'deploy';
}

export interface FilteredSitemap {
  host: NavHost;
  topLevel: NavEntry[];
  branches: NavBranch[];
  externals: NavEntry[];
}

/**
 * Filter the full sitemap for a specific host + owner state.
 * Branches with no surviving entries are dropped entirely.
 */
export function filterSitemap(host: NavHost, isOwner: boolean): FilteredSitemap {
  const entryVisible = (e: NavEntry) =>
    e.hosts.includes(host) && (isOwner || !e.ownerOnly);
  const branchVisible = (b: NavBranch) =>
    b.hosts.includes(host) && (isOwner || !b.ownerOnly);

  const topLevel = TOP_LEVEL_ENTRIES.filter(entryVisible);

  const branches = NAV_BRANCHES
    .filter(branchVisible)
    .map(b => ({
      ...b,
      entries: b.entries.filter(entryVisible),
    }))
    .filter(b => b.entries.length > 0);

  const externals = EXTERNAL_REROUTES.filter(entryVisible);

  return { host, topLevel, branches, externals };
}

/**
 * Flatten the entire sitemap for Spinner-style intent matching.
 * Returns every entry (filtered by host + owner) with its parent
 * branch label for context.
 */
export interface FlatEntry {
  id: string;
  label: string;
  description: string;
  href: string;
  kind: NavEntryKind;
  branch: string | null;
  ownerOnly: boolean;
}

export function flattenSitemap(host: NavHost, isOwner: boolean): FlatEntry[] {
  const out: FlatEntry[] = [];
  const filtered = filterSitemap(host, isOwner);

  for (const e of filtered.topLevel) {
    out.push({
      id: e.id,
      label: e.label,
      description: e.description,
      href: e.href,
      kind: e.kind,
      branch: null,
      ownerOnly: !!e.ownerOnly,
    });
  }

  for (const b of filtered.branches) {
    for (const e of b.entries) {
      out.push({
        id: e.id,
        label: e.label,
        description: e.description,
        href: e.href,
        kind: e.kind,
        branch: b.label,
        ownerOnly: !!e.ownerOnly,
      });
    }
  }

  for (const e of filtered.externals) {
    out.push({
      id: e.id,
      label: e.label,
      description: e.description,
      href: e.href,
      kind: e.kind,
      branch: 'External',
      ownerOnly: !!e.ownerOnly,
    });
  }

  return out;
}
