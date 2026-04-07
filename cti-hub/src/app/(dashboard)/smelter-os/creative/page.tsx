'use client';

/**
 * /smelter-os/creative — Iller_Ang Creative Studio launcher
 * ==============================================================
 * Surface for dispatching visual asset production jobs to Iller_Ang,
 * the Creative Director Boomer_Ang (PMO-PRISM / Creative Ops).
 *
 * 13 output categories from the skill doc:
 * cti-hub/src/lib/skills/docs/iller-ang-creative-ops-SKILL.md
 *
 * Owner-only. Dispatch via chat — Iller_Ang reports to ACHEEVY,
 * requests Lil_Viz_Hawk and Lil_Blend_Hawk from Chicken Hawk for
 * execution support on complex renders.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  User,
  Tv,
  Trophy,
  Users,
  Brush,
  Bird,
  Mic,
  ShoppingBag,
  Gem,
  Palette,
  Film,
  Camera,
  Sparkles,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';

interface OutputCategory {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  examples: string[];
}

const CATEGORIES: OutputCategory[] = [
  {
    id: 'player_cards',
    number: 1,
    title: 'Player Cards',
    description: '4 styles — Glass/Acrylic, Retro Trading, Silver Border, Tech/Stat',
    icon: Trophy,
    examples: ['Per|Form prospect card', 'NFL rookie card', 'Fantasy team card'],
  },
  {
    id: 'broadcast_graphics',
    number: 2,
    title: 'Broadcast Graphics',
    description: 'ESPN/Fox quality, 3D extruded type, lower thirds',
    icon: Tv,
    examples: ['Game headline', 'Stat bug', 'Chyron overlay'],
  },
  {
    id: 'recruiting_predictions',
    number: 3,
    title: 'Recruiting Predictions',
    description: 'On3 RPM style prediction graphics with bars',
    icon: User,
    examples: ['RPM bars for 5-star QB', 'Transfer portal leader'],
  },
  {
    id: 'team_composites',
    number: 4,
    title: 'Team Composites',
    description: 'Multi-player roster graphics, class-wide visuals',
    icon: Users,
    examples: ['2026 class top 25', 'All-conference team'],
  },
  {
    id: 'character_illustrations',
    number: 5,
    title: 'Character Illustrations',
    description: 'Comic / concept art for mascots, characters',
    icon: Brush,
    examples: ['The Colonel', 'Haze / Void_Caster', 'Tailor ritual'],
  },
  {
    id: 'agent_character_art',
    number: 6,
    title: 'Agent Character Art',
    description: 'Boomer_Ang + Lil_Hawk visual identity',
    icon: Bird,
    examples: ['Chicken Hawk mech', 'General_Ang supervisor', '17 Lil_Hawks'],
  },
  {
    id: 'podcast_visuals',
    number: 7,
    title: 'Podcast & Media Studio',
    description: 'Cover art, episode graphics, studio backdrops',
    icon: Mic,
    examples: ['Per|Form Picks cover', 'AIR P.O.D. show art'],
  },
  {
    id: 'merch_concepts',
    number: 8,
    title: 'Merchandise Concepts',
    description: 'Product mockups — apparel, accessories, prints',
    icon: ShoppingBag,
    examples: ['Sqwaadrun tee', 'The Foundry poster', 'NURD deck'],
  },
  {
    id: 'nft_cards',
    number: 9,
    title: 'Profile / NFT Cards',
    description: 'NURD System — illustrated + tech styles, 6 rarity tiers',
    icon: Gem,
    examples: ['Player card → NFT', 'NURD profile'],
  },
  {
    id: 'digital_art',
    number: 10,
    title: 'Digital / Mixed Media',
    description: 'Standalone art for any vertical',
    icon: Palette,
    examples: ['Brand hero image', 'Editorial feature'],
  },
  {
    id: 'cinematic_action',
    number: 11,
    title: 'Cinematic Game Action',
    description: 'Film-grade freeze frames with motion blur',
    icon: Film,
    examples: ['Game-winning play still', 'Hero moment'],
  },
  {
    id: 'lifestyle_photography',
    number: 12,
    title: 'Lifestyle & Location',
    description: 'Photography direction — scene, mood, palette',
    icon: Camera,
    examples: ['War room scene', 'Film room backdrop'],
  },
  {
    id: 'motion_landing',
    number: 13,
    title: 'Motion Landing Pages',
    description: 'GSAP + Three.js + Remotion motion systems',
    icon: Sparkles,
    examples: ['/plug/sqwaadrun hero', 'Per|Form reveal'],
  },
];

export default function CreativePage() {
  const { user } = useAuth();
  const [category, setCategory] = useState<string | null>(null);
  const [brief, setBrief] = useState('');

  if (!user || !isOwner(user.email)) {
    return <OwnerGate />;
  }

  const selected = CATEGORIES.find((c) => c.id === category) || null;

  function handleDispatch() {
    if (!selected || !brief.trim()) return;
    const prompt = [
      `[AGENT: Iller_Ang — Creative Director — PMO-PRISM]`,
      `[CATEGORY: ${selected.number}. ${selected.title}]`,
      ``,
      `Dispatch a creative production job.`,
      ``,
      `Brief:`,
      brief,
      ``,
      `Category: ${selected.title} — ${selected.description}`,
      ``,
      `Chain of command:`,
      `  - Iller_Ang reports directly to ACHEEVY`,
      `  - May request Lil_Viz_Hawk + Lil_Blend_Hawk from Chicken Hawk for`,
      `    complex renders and 3D work`,
      ``,
      `Quality gate:`,
      `  - Min 1080px short edge`,
      `  - 300 DPI for print, 72 DPI for social`,
      `  - Iller_Ang design tokens: #0A0A0F bg, #00E5CC cyan, #FF6B00 orange,`,
      `    #D4A853 gold, #FFFFFF text primary`,
      ``,
      `Return the asset URL + metadata on completion.`,
    ].join('\n');

    const encoded = encodeURIComponent(prompt);
    window.location.href = `/chat?q=${encoded}`;
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: 'radial-gradient(ellipse at top, #121212 0%, #050505 70%)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link
          href="/smelter-os"
          className="text-[10px] font-mono tracking-[0.25em] opacity-60 hover:opacity-100 inline-block mb-6"
          style={{ color: '#ff5722' }}
        >
          ← SMELTEROS BRIDGE
        </Link>

        <div className="mb-10">
          <div className="text-[10px] font-mono tracking-[0.3em] mb-2" style={{ color: '#ff5722' }}>
            / CREATIVE DIRECTOR — PMO-PRISM
          </div>
          <h1 className="font-doto font-black text-5xl md:text-6xl tracking-tight uppercase leading-none">
            <span style={{ color: '#ff5722' }} className="smelter-glow-soft">ILLER</span>_ANG
          </h1>
          <p className="text-sm mt-4 max-w-2xl text-white/60">
            Creative Director Boomer_Ang. Handles the 13 visual output categories — player cards,
            broadcast graphics, character art, NFT cards, motion landing pages, and more. Dispatches
            Lil_Viz_Hawk + Lil_Blend_Hawk through Chicken Hawk for complex renders.
          </p>
        </div>

        {/* Category picker */}
        <div className="mb-8">
          <div
            className="text-[10px] font-mono tracking-[0.3em] mb-5 uppercase"
            style={{ color: '#ff5722' }}
          >
            / 13 Output Categories
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className="smelter-glass smelter-glass-hover p-4 text-left transition-all"
                style={{
                  borderTop:
                    category === c.id
                      ? '2px solid #ff5722'
                      : '2px solid rgba(255,87,34,0.25)',
                  borderRadius: '3px',
                  boxShadow: category === c.id ? '0 0 24px rgba(255,87,34,0.3)' : undefined,
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded border"
                    style={{
                      background: 'rgba(255,87,34,0.1)',
                      borderColor: 'rgba(255,87,34,0.35)',
                    }}
                  >
                    <c.icon className="w-4 h-4" style={{ color: '#ff5722' }} />
                  </div>
                  <div
                    className="text-[8px] font-mono opacity-50"
                    style={{ color: '#ff7a45' }}
                  >
                    #{c.number}
                  </div>
                </div>
                <div className="font-doto font-black text-sm uppercase tracking-tight leading-tight">
                  {c.title}
                </div>
                <div
                  className="text-[9px] opacity-60 mt-1 leading-snug"
                  style={{ color: '#94A3B8' }}
                >
                  {c.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Brief form */}
        {selected && (
          <div
            className="smelter-glass p-6 mb-8"
            style={{
              borderTop: '2px solid rgba(255,87,34,0.4)',
              borderRadius: '3px',
            }}
          >
            <div
              className="text-[10px] font-mono tracking-[0.25em] mb-3"
              style={{ color: '#ff5722' }}
            >
              / DISPATCH BRIEF — {selected.title.toUpperCase()}
            </div>
            <div className="text-[10px] font-mono opacity-60 mb-4">
              Examples: {selected.examples.join(' · ')}
            </div>

            <label className="block mb-5">
              <div className="text-[10px] font-mono tracking-[0.2em] opacity-60 mb-2 uppercase">
                Brief
              </div>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Describe the asset you need. Include subject, mood, palette, aspect ratio, use case."
                rows={4}
                className="w-full px-4 py-3 text-sm text-white outline-none resize-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,87,34,0.25)',
                  borderRadius: '2px',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </label>

            <button
              onClick={handleDispatch}
              disabled={!brief.trim()}
              className="px-7 py-3.5 font-bold text-sm tracking-wider flex items-center gap-3 disabled:opacity-40"
              style={{
                background: '#ff5722',
                color: 'white',
                boxShadow: '0 0 24px rgba(255,87,34,0.35)',
                borderRadius: '2px',
              }}
            >
              <Palette className="w-5 h-5" />
              DISPATCH TO ILLER_ANG
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Design tokens reference */}
        <div
          className="smelter-glass p-5 mb-6"
          style={{
            borderTop: '2px solid rgba(255,87,34,0.25)',
            borderRadius: '3px',
          }}
        >
          <div
            className="text-[10px] font-mono tracking-[0.25em] mb-3"
            style={{ color: '#ff5722' }}
          >
            / ILLER_ANG DESIGN TOKENS
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[10px] font-mono">
            <TokenSwatch hex="#0A0A0F" label="bg_primary" />
            <TokenSwatch hex="#00E5CC" label="accent_cyan" />
            <TokenSwatch hex="#FF6B00" label="accent_orange" />
            <TokenSwatch hex="#D4A853" label="accent_gold" />
            <TokenSwatch hex="#FFFFFF" label="text_primary" />
          </div>
          <div className="text-[9px] font-mono opacity-60 mt-3">
            6 vertical overrides: sports_nft · sneaker_drops · podcast · recruiting · blockchain · fintech
          </div>
        </div>

        {/* Reference link */}
        <div className="text-[10px] font-mono opacity-50 flex items-center gap-2">
          <FileText className="w-3 h-3" />
          <span>Full skill spec:</span>
          <span style={{ color: '#ff7a45' }}>
            cti-hub/src/lib/skills/docs/iller-ang-creative-ops-SKILL.md
          </span>
        </div>
      </div>
    </div>
  );
}

function TokenSwatch({ hex, label }: { hex: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded shrink-0 border border-white/20"
        style={{ background: hex }}
      />
      <div className="min-w-0">
        <div className="text-white truncate">{label}</div>
        <div className="opacity-50 truncate">{hex}</div>
      </div>
    </div>
  );
}

function OwnerGate() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 smelter-ember-bg"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="text-center max-w-md">
        <div className="text-[10px] font-mono tracking-[0.3em] mb-3" style={{ color: '#ff5722' }}>
          OWNER ACCESS REQUIRED
        </div>
        <h1 className="font-doto font-black text-4xl mb-4 uppercase">ILLER_ANG</h1>
        <p className="text-sm text-white/60 mb-8">Creative Studio is owner-only.</p>
        <Link
          href="/auth/login?next=/smelter-os/creative"
          className="inline-flex items-center gap-2 font-bold text-sm tracking-wider px-6 py-3"
          style={{ background: '#ff5722', color: 'white' }}
        >
          SIGN IN <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
