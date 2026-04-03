'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Star, TrendingUp, Award, MessageSquare,
  ChevronDown, ChevronUp, Filter, Search, Zap, Mic, Film, FileText,
} from 'lucide-react';
import { PlugChat } from '@/components/plug/PlugChat';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Prospect {
  id: string;
  name: string;
  school: string;
  position: string;
  height: string;
  weight: string;
  projectedRound: number;
  overallRank: number;
  grade: number;
  keyStats: string;
  scoutingSummary: string;
  analystName: string;
  analystPersona: 'film-first' | 'hot-take' | 'data-driven' | 'old-school';
  trend: 'rising' | 'falling' | 'steady';
}

interface AnalystTake {
  analyst: string;
  persona: string;
  color: string;
  text: string;
  prospect: string;
  agree?: boolean;
}

// ─── Synthetic Data ──────────────────────────────────────────────────────────

const PROSPECTS: Prospect[] = [
  {
    id: 'p1', name: 'Carson Beck', school: 'Georgia', position: 'QB',
    height: '6\'4"', weight: '220 lbs', projectedRound: 1, overallRank: 1,
    grade: 94, keyStats: '3,941 YDS · 28 TD · 6 INT',
    scoutingSummary: 'Elite pocket passer with NFL-ready processing speed. Anticipation throws are best in class. Needs to limit forcing balls into tight windows under duress.',
    analystName: 'Film-First Analyst', analystPersona: 'film-first', trend: 'steady',
  },
  {
    id: 'p2', name: 'Shedeur Sanders', school: 'Colorado', position: 'QB',
    height: '6\'2"', weight: '215 lbs', projectedRound: 1, overallRank: 2,
    grade: 92, keyStats: '4,134 YDS · 37 TD · 10 INT',
    scoutingSummary: 'Most polished passer in the class. Quick release, pinpoint accuracy on intermediate routes. Concerns about arm strength on deep outs in cold weather.',
    analystName: 'Data-Driven Analyst', analystPersona: 'data-driven', trend: 'rising',
  },
  {
    id: 'p3', name: 'Cam Ward', school: 'Miami', position: 'QB',
    height: '6\'2"', weight: '223 lbs', projectedRound: 1, overallRank: 3,
    grade: 91, keyStats: '4,313 YDS · 39 TD · 7 INT',
    scoutingSummary: 'Dynamic playmaker with the best raw arm in the class. Off-script creativity is elite. Needs to clean up mechanics and reduce hero-ball tendencies.',
    analystName: 'Hot-Take Artist', analystPersona: 'hot-take', trend: 'rising',
  },
  {
    id: 'p4', name: 'Travis Hunter', school: 'Colorado', position: 'WR/CB',
    height: '6\'1"', weight: '185 lbs', projectedRound: 1, overallRank: 4,
    grade: 96, keyStats: '1,152 REC YDS · 14 TD · 4 INT (def)',
    scoutingSummary: 'Generational two-way talent. Heisman winner who dominates on both sides of the ball. The question is not if he goes top-5, but which position he plays primarily.',
    analystName: 'Film-First Analyst', analystPersona: 'film-first', trend: 'steady',
  },
  {
    id: 'p5', name: 'Tetairoa McMillan', school: 'Arizona', position: 'WR',
    height: '6\'5"', weight: '212 lbs', projectedRound: 1, overallRank: 5,
    grade: 93, keyStats: '1,319 REC YDS · 11 TD',
    scoutingSummary: 'Best contested catch ability in college football. Uses his frame to high-point everything. Route running has improved dramatically — could be WR1 in this class.',
    analystName: 'Old-School Scout', analystPersona: 'old-school', trend: 'steady',
  },
  {
    id: 'p6', name: 'Mason Graham', school: 'Michigan', position: 'DT',
    height: '6\'3"', weight: '318 lbs', projectedRound: 1, overallRank: 6,
    grade: 95, keyStats: '7.5 SACKS · 42 TACKLES · 15 TFL',
    scoutingSummary: 'Best interior defensive lineman prospect since Aaron Donald. Explosive first step, violent hands, and three-down capability. Anchor against double teams is elite.',
    analystName: 'Data-Driven Analyst', analystPersona: 'data-driven', trend: 'steady',
  },
  {
    id: 'p7', name: 'Abdul Carter', school: 'Penn State', position: 'EDGE',
    height: '6\'3"', weight: '252 lbs', projectedRound: 1, overallRank: 7,
    grade: 92, keyStats: '12 SACKS · 48 TACKLES · 20 TFL',
    scoutingSummary: 'Converted linebacker with explosive athleticism off the edge. Speed-to-power conversion is already NFL-caliber. Still developing a full rush repertoire.',
    analystName: 'Hot-Take Artist', analystPersona: 'hot-take', trend: 'rising',
  },
  {
    id: 'p8', name: 'Will Johnson', school: 'Michigan', position: 'CB',
    height: '6\'2"', weight: '202 lbs', projectedRound: 1, overallRank: 8,
    grade: 91, keyStats: '3 INT · 12 PBU · 38 TACKLES',
    scoutingSummary: 'Shutdown corner with ideal size and ball skills. Mirror technique in press coverage is elite. Physical at the catch point. CB1 in this class.',
    analystName: 'Old-School Scout', analystPersona: 'old-school', trend: 'steady',
  },
];

const ANALYST_TAKES: AnalystTake[] = [
  {
    analyst: 'Film-First Analyst', persona: 'Meticulous film breakdown', color: '#3B82F6',
    text: "I've watched every snap of Carson Beck's junior film. His anticipation on third-and-medium is the best I've seen since Peyton Manning's college tape. This is a franchise QB.",
    prospect: 'Carson Beck',
  },
  {
    analyst: 'Hot-Take Artist', persona: 'Bold predictions', color: '#F43F5E',
    text: "Cam Ward is QB1 and it's not close. The arm talent is generational. I don't care about the turnovers — you can coach that out. You can't coach that kind of arm.",
    prospect: 'Cam Ward', agree: false,
  },
  {
    analyst: 'Data-Driven Analyst', persona: 'Stats and metrics', color: '#10B981',
    text: "The numbers tell a clear story: Shedeur Sanders' completion rate over expected is +8.7%, best in the FBS. His 2.1 second average release time suggests elite processing.",
    prospect: 'Shedeur Sanders',
  },
  {
    analyst: 'Old-School Scout', persona: 'Traditional evaluation', color: '#E8A020',
    text: "Travis Hunter reminds me of Deion Sanders — and I watched Deion play. The difference? Hunter might be a better receiver. Draft him top-3 and figure out the position later.",
    prospect: 'Travis Hunter',
  },
  {
    analyst: 'Hot-Take Artist', persona: 'Bold predictions', color: '#F43F5E',
    text: "Mason Graham is going to be a top-5 pick and everyone will act surprised. I'm telling you now — he's the safest pick in the draft. Easiest evaluation since Quinnen Williams.",
    prospect: 'Mason Graham',
  },
  {
    analyst: 'Film-First Analyst', persona: 'Meticulous film breakdown', color: '#3B82F6',
    text: "After watching the Big Ten championship, I'm upgrading Abdul Carter. His bend around the edge in the fourth quarter was something you see from Von Miller, not a college junior.",
    prospect: 'Abdul Carter',
  },
];

// ─── Components ──────────────────────────────────────────────────────────────

function GradeBadge({ grade }: { grade: number }) {
  const color = grade >= 95 ? '#E8A020' : grade >= 90 ? '#10B981' : grade >= 85 ? '#3B82F6' : '#8B5CF6';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-sm"
        style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>
        {grade}
      </div>
    </div>
  );
}

function TrendArrow({ trend }: { trend: Prospect['trend'] }) {
  if (trend === 'rising') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === 'falling') return <TrendingUp className="w-3.5 h-3.5 text-red-400 rotate-180" />;
  return <span className="text-[10px] text-white/30">—</span>;
}

function ProspectCard({ prospect, rank }: { prospect: Prospect; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-white/10 bg-white/[0.02] hover:border-[#E8A020]/30 transition-colors">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Rank */}
        <span className="font-mono text-2xl font-black text-white/20 w-8 text-center shrink-0">
          {rank}
        </span>

        {/* Grade */}
        <GradeBadge grade={prospect.grade} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-white">{prospect.name}</h3>
            <TrendArrow trend={prospect.trend} />
          </div>
          <p className="text-[10px] text-white/40 font-mono">
            {prospect.position} · {prospect.school} · {prospect.height} {prospect.weight}
          </p>
        </div>

        {/* Stats */}
        <div className="hidden sm:block text-right">
          <p className="text-[10px] text-white/50 font-mono">{prospect.keyStats}</p>
          <p className="text-[9px] text-[#E8A020]">Rd {prospect.projectedRound}</p>
        </div>

        {/* Expand */}
        {expanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3">
          <div className="flex items-start gap-2 mb-2">
            <Award className="w-3.5 h-3.5 text-[#E8A020] mt-0.5 shrink-0" />
            <div>
              <p className="text-[9px] text-[#E8A020] font-mono mb-1">{prospect.analystName}</p>
              <p className="text-xs text-white/60 leading-relaxed">{prospect.scoutingSummary}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[9px] text-white/30 font-mono">P.A.I. + AGI GRADE: {prospect.grade}</span>
            <span className="text-[9px] text-white/30 font-mono">ROUND: {prospect.projectedRound}</span>
            <span className="text-[9px] text-white/30 font-mono">OVERALL: #{prospect.overallRank}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PerFormPage() {
  const [posFilter, setPosFilter] = useState<string>('ALL');
  const [feedIndex, setFeedIndex] = useState(0);
  const [liveProspects, setLiveProspects] = useState<Prospect[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch real data from the player index DB
  useEffect(() => {
    async function loadPlayers() {
      try {
        const res = await fetch('/api/perform/players?sort=rank&limit=50');
        if (res.ok) {
          const data = await res.json();
          if (data.players && data.players.length > 0) {
            setLiveProspects(data.players.map((p: any, i: number) => ({
              id: `db-${p.id}`,
              name: p.name,
              school: p.school,
              position: p.position,
              height: p.height || '',
              weight: p.weight ? `${p.weight} lbs` : '',
              projectedRound: p.projected_round || 7,
              overallRank: p.overall_rank || i + 1,
              grade: parseFloat(p.grade) || 70,
              keyStats: p.key_stats || '',
              scoutingSummary: p.scouting_summary || '',
              analystName: 'Scout_Ang',
              analystPersona: 'data-driven' as const,
              trend: (p.trend || 'steady') as 'rising' | 'falling' | 'steady',
            })));
          }
        }
      } catch {}
      setLoading(false);
    }
    loadPlayers();
  }, []);

  // Auto-cycle analyst takes
  useEffect(() => {
    const interval = setInterval(() => {
      setFeedIndex(prev => (prev + 1) % ANALYST_TAKES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Use live data if available, fall back to seed data
  const activeProspects = liveProspects || PROSPECTS;
  const positions = ['ALL', ...new Set(activeProspects.map(p => p.position))];
  const filtered = posFilter === 'ALL' ? activeProspects : activeProspects.filter(p => p.position === posFilter);

  const currentTake = ANALYST_TAKES[feedIndex];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <nav className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link href="/deploy-landing" className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-white/40" />
          </Link>
          <div>
            <span className="font-mono text-xs font-bold tracking-wider text-[#E8A020]">PER|FORM</span>
            <span className="font-mono text-[9px] text-white/30 ml-2">2026 NFL MOCK DRAFT</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="font-mono text-[9px] text-white/40">LIVE · AI ANALYSTS ACTIVE</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
            2026 NFL Mock Draft
          </h1>
          <p className="text-sm text-white/40 max-w-xl mx-auto">
            AI analyst personas debate, scout, and rank every prospect. All grades pass through
            the P.A.I. + AGI formula. Personalities affect delivery — never the analysis.
          </p>
        </div>

        {/* Live Analyst Take Feed */}
        <div className="border border-white/10 bg-white/[0.02] p-4 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-3.5 h-3.5 text-[#E8A020]" />
            <span className="font-mono text-[9px] text-white/40 uppercase tracking-wider">Live Analyst Feed</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${currentTake.color}20`, border: `1px solid ${currentTake.color}40` }}>
              <Star className="w-4 h-4" style={{ color: currentTake.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[11px] font-bold" style={{ color: currentTake.color }}>
                  {currentTake.analyst}
                </span>
                <span className="text-[9px] text-white/30">on {currentTake.prospect}</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">&ldquo;{currentTake.text}&rdquo;</p>
            </div>
          </div>
        </div>

        {/* Data Source Indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${liveProspects ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          <span className="font-mono text-[9px] text-white/40">
            {loading ? 'Loading player index...' : liveProspects ? `LIVE DATABASE · ${liveProspects.length} prospects indexed` : 'SEED DATA · Run /api/perform/seed to populate live index'}
          </span>
        </div>

        {/* Position Filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter className="w-3.5 h-3.5 text-white/30 shrink-0" />
          {positions.map(pos => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={`px-3 py-1 font-mono text-[10px] transition-colors whitespace-nowrap ${
                posFilter === pos
                  ? 'bg-[#E8A020]/10 text-[#E8A020] border border-[#E8A020]/30'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:border-white/20'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Draft Board */}
        <div className="space-y-2">
          {filtered.map((prospect, idx) => (
            <ProspectCard key={prospect.id} prospect={prospect} rank={idx + 1} />
          ))}
        </div>

        {/* Live Analysis Panel */}
        <div className="mt-12 border border-white/10 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
            <Mic className="w-4 h-4 text-[#E8A020]" />
            <span className="font-mono text-xs text-white/60 uppercase tracking-wider">Live Analysis — Ask the Analysts</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10">
            <button
              onClick={() => {
                const el = document.getElementById('perform-chat');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-3 p-4 bg-[#0A0A0A] hover:bg-white/5 transition-colors"
            >
              <Search className="w-4 h-4 text-[#3B82F6]" />
              <div className="text-left">
                <p className="font-mono text-[10px] font-bold text-white">SCOUT REPORT</p>
                <p className="text-[9px] text-white/40">Deep dive on any prospect</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 bg-[#0A0A0A] hover:bg-white/5 transition-colors">
              <Film className="w-4 h-4 text-[#F97316]" />
              <div className="text-left">
                <p className="font-mono text-[10px] font-bold text-white">FILM BREAKDOWN</p>
                <p className="text-[9px] text-white/40">Play-by-play analysis</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 bg-[#0A0A0A] hover:bg-white/5 transition-colors">
              <Mic className="w-4 h-4 text-[#8B5CF6]" />
              <div className="text-left">
                <p className="font-mono text-[10px] font-bold text-white">PODCAST SCRIPT</p>
                <p className="text-[9px] text-white/40">Generate episode content</p>
              </div>
            </button>
          </div>
          <div id="perform-chat" className="h-96">
            <PlugChat
              agentName="Scout_Ang"
              agentRole="NFL Draft Analyst"
              agentColor="#3B82F6"
              systemPrompt="You are Scout_Ang, the lead NFL Draft analyst for Per|Form on The Deploy Platform.\n\nYOU ARE AN EXPERT IN:\n- NFL Draft scouting and prospect evaluation\n- Film analysis (route running, pass rush technique, coverage skills)\n- Combine and Pro Day metrics interpretation\n- Historical draft comparisons\n- Team needs and fit analysis\n- Mock draft predictions\n\nWhen asked about a prospect, give a FULL scouting report: size/speed, strengths (3-5), weaknesses (2-3), NFL comparison, draft grade (A+ through F), projected round, and team fit.\n\nWhen asked about team needs, be specific about roster gaps and which prospects fill them.\n\nFor podcast scripts, write in conversational tone with [PAUSE], [EMPHASIS], and [GRAPHIC] production cues.\n\nBe bold. Have takes. Back them with evidence."
              placeholder="Ask about any prospect, team need, or draft scenario..."
              welcomeMessage="I'm Scout_Ang — Per|Form's lead draft analyst. Ask me about any prospect, team need, mock draft scenario, or I can generate a podcast script for you. What do you want to break down?"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="font-mono text-[9px] text-white/20">
            PER|FORM 2026 · Powered by Boomer_Ang Analyst Personas · P.A.I. + AGI Grading Formula
          </p>
        </div>
      </div>
    </div>
  );
}
