'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Search,
  PenTool,
  TrendingUp,
  Activity,
  GraduationCap,
  DollarSign,
  Palette,
  MessageCircle,
  Plus,
  Hammer,
  GitFork,
  Code2,
  Monitor,
  Zap,
  Crown,
} from 'lucide-react'

const agents = [
  {
    name: 'Scout_Ang',
    role: 'Research & Intelligence',
    department: 'Research',
    icon: Search,
    tagline: 'The one who always knows what\u2019s happening before you ask.',
    capabilities: [
      'Scrapes the web for real-time intelligence and competitive insights',
      'Stores findings in semantic memory for instant recall',
      'Resurfaces past research on demand with full context',
      'Maps relationships between data points across sources',
    ],
  },
  {
    name: 'Content_Ang',
    role: 'Content Operations',
    department: 'Content',
    icon: PenTool,
    tagline: 'Writes like your best employee \u2014 if they never slept.',
    capabilities: [
      'Generates SEO-optimized content, blog articles, and newsletters',
      'Crafts social media posts calibrated to each platform',
      'Learns which topics performed and adjusts strategy accordingly',
      'Maintains brand voice consistency across all outputs',
    ],
  },
  {
    name: 'Biz_Ang',
    role: 'Business Development & Growth',
    department: 'Growth',
    icon: TrendingUp,
    tagline: 'Closes deals while you\u2019re asleep.',
    capabilities: [
      'Tracks pipeline stages and scores leads by conversion likelihood',
      'Drafts personalized outreach sequences at scale',
      'Manages CRM data and keeps records audit-ready',
      'Identifies growth opportunities from market signals',
    ],
  },
  {
    name: 'Ops_Ang',
    role: 'Operations & Health Monitoring',
    department: 'Operations',
    icon: Activity,
    tagline: 'Nothing gets past Ops.',
    capabilities: [
      'Monitors system health across all platform services',
      'Audits processes and flags anomalies before they escalate',
      'Tracks budgets and resource utilization in real time',
      'Generates operational reports with actionable recommendations',
    ],
  },
  {
    name: 'Edu_Ang',
    role: 'Education & Sales',
    department: 'Education / Sales',
    icon: GraduationCap,
    tagline: 'Turns strangers into students, students into advocates.',
    capabilities: [
      'Manages enrollment funnels from first touch to onboarding',
      'Tracks affiliate performance and commission payouts',
      'Automates student onboarding workflows and follow-ups',
      'Optimizes conversion rates across the education pipeline',
    ],
  },
  {
    name: 'CFO_Ang',
    role: 'Finance & Revenue',
    department: 'Finance',
    icon: DollarSign,
    tagline: 'Every dollar accounted for. Every cent justified.',
    capabilities: [
      'Tracks spending across subscriptions, tools, and services',
      'Generates financial reports and forecasts on demand',
      'Monitors revenue streams and flags budget variances',
      'Provides budget forecasting with scenario modeling',
    ],
  },
  {
    name: 'Iller_Ang',
    role: 'Creative Director & Design',
    department: 'Design',
    icon: Palette,
    tagline: 'Sees the world in pixels and palettes.',
    capabilities: [
      'Produces visual assets aligned with brand guidelines',
      'Generates creative briefs and text-to-image prompts',
      'Manages NFT metadata and digital asset pipelines',
      'Runs its own MCP server for direct IDE integration',
    ],
  },
  {
    name: 'BuildSmith',
    role: 'The Builder',
    department: 'Engineering',
    icon: Hammer,
    tagline: 'From zero to live in one dispatch.',
    capabilities: [
      'Scaffolds projects from specifications and briefs',
      'Writes production-grade code across frameworks',
      'Deploys containers and provisions infrastructure',
      'The backbone of every build cycle in the platform',
    ],
  },
  {
    name: 'Picker_Ang',
    role: 'The Selector',
    department: 'Orchestration',
    icon: GitFork,
    tagline: 'The right agent for the right job, every time.',
    capabilities: [
      'Intelligent agent routing across the entire workforce',
      'Scores agents against task requirements for optimal assignment',
      'Determines which agents handle which parts of a task',
      'Enables multi-agent collaboration on complex projects',
    ],
  },
  {
    name: 'Code_Ang',
    role: 'Full-Stack Coder',
    department: 'Engineering',
    icon: Code2,
    tagline: 'Reads codebases like novels. Writes them like poetry.',
    capabilities: [
      'Writes, reviews, tests, and deploys code across multiple languages',
      'Reads existing codebases and extends them with precision',
      'Full-stack capability — frontend, backend, infrastructure',
      'Integrates with CI/CD pipelines for automated deployment',
    ],
  },
  {
    name: 'Iller_Ang MCP',
    role: 'Design-to-IDE Bridge',
    department: 'Design / DevTools',
    icon: Monitor,
    tagline: 'Design assets generated right in your workflow.',
    capabilities: [
      'Model Context Protocol server for Iller_Ang',
      'Connect from Cursor, VS Code, or Claude Code',
      'Generate visual assets without leaving your IDE',
      'Brand-consistent design output on every call',
    ],
  },
]

export default function HouseOfAngPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <Link
            href="/about"
            className="flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-[#E8A020]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to About
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-20">
        {/* Background glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-[500px] w-[800px] rounded-full bg-[#E8A020]/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E8A020]/20 bg-[#E8A020]/5 px-4 py-1.5 text-sm text-[#E8A020]">
            <Crown className="h-4 w-4" />
            Executive AI Division
          </div>

          <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            The House of{' '}
            <span className="bg-gradient-to-r from-[#E8A020] to-[#F0C060] bg-clip-text text-transparent">
              ANG
            </span>
          </h1>

          <p className="mb-6 text-xl font-medium text-[#E8A020]/80 sm:text-2xl">
            Executive AI Agents &mdash; The Boomer_Angs
          </p>

          <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            These are the senior agents that handle strategic work on The Deploy
            Platform. Each has a distinct personality and specialty. They plan
            before they act, remember what worked, and are measured against KPIs.
            Seven agents. Seven departments. One unified mission.
          </p>
          {/* Hero Image */}
          <div className="mt-10 relative rounded-xl overflow-hidden border border-white/10 max-w-3xl mx-auto">
            <Image
              src="/boomer-angs-hero.png"
              alt="The Boomer_Angs"
              width={800}
              height={450}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
      </section>

      {/* Agent Cards */}
      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const Icon = agent.icon
            return (
              <div key={agent.name} className="group relative">
                {/* Gradient border */}
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#E8A020]/20 via-[#E8A020]/5 to-transparent opacity-50 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex h-full flex-col rounded-2xl border border-white/5 bg-[#111111] p-6 transition-all duration-500 group-hover:border-[#E8A020]/20 group-hover:bg-[#141414]">
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8A020]/10 text-[#E8A020] transition-all duration-300 group-hover:bg-[#E8A020]/20 group-hover:shadow-lg group-hover:shadow-[#E8A020]/10">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/40">
                      {agent.department}
                    </span>
                  </div>

                  {/* Name & Role */}
                  <h3 className="mb-1 text-xl font-bold text-[#E8A020]">
                    {agent.name}
                  </h3>
                  <p className="mb-3 text-sm font-medium text-white/50">
                    {agent.role}
                  </p>

                  {/* Tagline */}
                  <p className="mb-5 text-sm italic leading-relaxed text-white/30">
                    &ldquo;{agent.tagline}&rdquo;
                  </p>

                  {/* Capabilities */}
                  <ul className="mb-6 flex-1 space-y-2.5">
                    {agent.capabilities.map((cap, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm leading-relaxed text-white/60"
                      >
                        <Zap className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#E8A020]/50" />
                        {cap}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={`/chat?deploy=${encodeURIComponent(agent.name)}`}
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#E8A020]/20 bg-[#E8A020]/5 px-4 py-2.5 text-sm font-medium text-[#E8A020] transition-all duration-300 hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10 hover:shadow-lg hover:shadow-[#E8A020]/5"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Deploy this Boomer_Ang
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* How to Access */}
      <section className="border-t border-white/5 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-3 text-center text-3xl font-bold sm:text-4xl">
            How to Access the{' '}
            <span className="text-[#E8A020]">Boomer_Angs</span>
          </h2>
          <p className="mb-12 text-center text-white/40">
            Two ways to reach the executive agents
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Method 1 */}
            <div className="relative">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#E8A020]/10 to-transparent opacity-0 transition-opacity duration-500 hover:opacity-100" />
              <div className="relative rounded-2xl border border-white/5 bg-[#111111] p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8A020]/10 text-[#E8A020]">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">
                  Talk to ACHEEVY
                </h3>
                <p className="text-sm leading-relaxed text-white/50">
                  Just describe what you need in chat. ACHEEVY understands
                  context and automatically delegates to the right Boomer_Ang
                  based on your request. No routing required &mdash; the
                  intelligence layer handles it.
                </p>
              </div>
            </div>

            {/* Method 2 */}
            <div className="relative">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#E8A020]/10 to-transparent opacity-0 transition-opacity duration-500 hover:opacity-100" />
              <div className="relative rounded-2xl border border-white/5 bg-[#111111] p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8A020]/10 text-[#E8A020]">
                  <Plus className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">
                  Skills Menu
                </h3>
                <p className="text-sm leading-relaxed text-white/50">
                  Use the{' '}
                  <span className="font-mono text-[#E8A020]/70">+</span> button
                  in chat to open the Skills menu. Select a specific agent
                  directly when you know exactly who you need. Each agent is
                  listed with their specialty for quick access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-10">
        <p className="text-center text-sm text-white/25">
          The House of ANG &middot; The Deploy Platform &middot; FOAI.cloud
        </p>
      </footer>
    </div>
  )
}
