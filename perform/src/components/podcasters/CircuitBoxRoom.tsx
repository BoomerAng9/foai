'use client';

/**
 * CircuitBoxRoom — Penthouse Office Visual Composite
 * ====================================================
 * CSS-only layered room with team branding, color overlays, and stats bar.
 * No images for MVP — pure gradients and box-shadows.
 */

interface CircuitBoxRoomProps {
  teamAbbrev: string;
  teamName: string;
  primaryColor: string;
  secondaryColor: string;
  conference?: string;
  division?: string;
  wins: number;
  losses: number;
  rosterCount: number;
  draftPicks: number;
}

export default function CircuitBoxRoom({
  teamAbbrev,
  teamName,
  primaryColor,
  secondaryColor,
  conference,
  division,
  wins,
  losses,
  rosterCount,
  draftPicks,
}: CircuitBoxRoomProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ height: 300 }}>
      {/* ── Base: dark penthouse gradient ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, #111827 0%, #0A0E1A 60%, #06080F 100%)`,
        }}
      />

      {/* ── Window reflections (subtle radial glows) ── */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          background: [
            'radial-gradient(ellipse 40% 60% at 15% 20%, rgba(255,255,255,0.5), transparent)',
            'radial-gradient(ellipse 35% 50% at 85% 25%, rgba(255,255,255,0.4), transparent)',
            'radial-gradient(ellipse 50% 30% at 50% 10%, rgba(255,255,255,0.3), transparent)',
          ].join(', '),
        }}
      />

      {/* ── Diagonal scan lines ── */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 80px, #FFFFFF 80px, #FFFFFF 81px)',
        }}
      />

      {/* ── Team color overlay (8% opacity) ── */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: primaryColor, opacity: 0.08 }}
      />

      {/* ── Wall asset zone: team logo glow + name ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        {/* Large color glow behind text */}
        <div
          className="absolute"
          style={{
            width: 320,
            height: 160,
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${primaryColor}40 0%, transparent 70%)`,
            filter: 'blur(40px)',
          }}
        />

        {/* Team abbreviation watermark */}
        <div
          className="absolute text-[120px] font-black leading-none opacity-[0.06] select-none"
          style={{ color: primaryColor, letterSpacing: '0.05em' }}
        >
          {teamAbbrev}
        </div>

        {/* Team name */}
        <h2
          className="relative text-4xl md:text-5xl font-black tracking-tight"
          style={{ color: primaryColor, textShadow: `0 0 40px ${primaryColor}30` }}
        >
          {teamName}
        </h2>

        {/* Conference + Division */}
        {(conference || division) && (
          <div className="relative mt-2 flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#8B94A8' }}>
            {conference && <span>{conference}</span>}
            {conference && division && <span style={{ color: secondaryColor }}>|</span>}
            {division && <span>{division}</span>}
          </div>
        )}
      </div>

      {/* ── Stats bar at bottom ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-8 px-6 py-3"
        style={{
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.8))',
        }}
      >
        <StatChip label="Record" value={`${wins}-${losses}`} accent={primaryColor} />
        <StatChip label="Roster" value={String(rosterCount)} accent="#D4A853" />
        <StatChip label="Draft Picks" value={String(draftPicks)} accent="#22D3EE" />
      </div>
    </div>
  );
}

function StatChip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="text-center">
      <div className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: '#8B94A8' }}>
        {label}
      </div>
      <div className="text-lg font-black tabular-nums" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}
