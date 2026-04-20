'use client';

/**
 * DestinationsCanvas — Phase 2: full interactive canvas.
 *
 * Wires together every ported component against a real tile-based map:
 *   - MapProvider (MapLibre or Google 3D Tiles, resolved via env/query)
 *   - DestinationPin · NeighborhoodPulseCard · IntentionComposer
 *   - ShortlistDock · ExpansionDrawer · ConstellationOverlay
 *   - StatusHUD with live provider + camera readout
 *
 * Intention edits + shortlist mutations are local state in this pass;
 * Phase 3 ties them to POST /api/intentions and /api/shortlist once the
 * auth-gated mutation routes are wired in.
 */

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MapLibreProvider } from '@/lib/map/maplibre';
import { Google3DTilesProvider } from '@/lib/map/google3d';
import {
  DEFAULT_CAMERA,
  resolveProvider,
  type MapCamera,
  type MapProviderProps,
} from '@/lib/map/provider';
import { DestinationPin, type PinStyle } from './DestinationPin';
import { NeighborhoodPulseCard } from './NeighborhoodPulseCard';
import { IntentionComposer, type ComposerPosition } from './IntentionComposer';
import { ShortlistDock, type DockPosition } from './ShortlistDock';
import { ExpansionDrawer, type ExpansionPosition } from './ExpansionDrawer';
import { ConstellationOverlay } from './ConstellationOverlay';
import type { AccentScheme } from '@/lib/color';
import type { ComingSoonRegion, Destination, Intention } from '@/lib/validation';

// Default user-facing configuration — production values. Dev overrides
// are exposed via a dev-only TweaksPanel behind NEXT_PUBLIC_ENABLE_TWEAKS
// (Phase 3 addition).
const DEFAULT_PIN_STYLE: PinStyle = 'glow';
const DEFAULT_ACCENT: AccentScheme = 'ambient';
const DEFAULT_DOCK: DockPosition = 'bottom';
const DEFAULT_COMPOSER: ComposerPosition = 'floating';
const DEFAULT_EXPANSION: ExpansionPosition = 'right drawer';

interface Props {
  initialDestinations: Destination[];
  initialComingSoon: ComingSoonRegion[];
}

export default function DestinationsCanvas({
  initialDestinations,
  initialComingSoon,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState<MapCamera>(DEFAULT_CAMERA);

  const [intentions, setIntentions] = useState<Intention[]>([
    { intentionId: 'int_01', phrase: 'walkable coastal town', weight: 0.9, displayOrder: 0 },
    { intentionId: 'int_02', phrase: 'under $850k', weight: 0.8, displayOrder: 1 },
    { intentionId: 'int_03', phrase: 'good public schools', weight: 0.7, displayOrder: 2 },
    { intentionId: 'int_04', phrase: 'artist-dense, creative scene', weight: 0.6, displayOrder: 3 },
  ]);

  const [shortlist, setShortlist] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const providerName = useMemo(() => {
    const searchParam =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('map')
        : null;
    return resolveProvider(searchParam);
  }, []);

  const Provider = providerName === 'google3d' ? Google3DTilesProvider : MapLibreProvider;

  const providerProps: MapProviderProps = {
    initialCamera: DEFAULT_CAMERA,
    style: 'tactical',
    onCameraChange: setCamera,
  };

  const activeId = pinnedId ?? hoveredId;
  const activeDestination = activeId
    ? initialDestinations.find((d) => d.destinationId === activeId) ?? null
    : null;

  const toggleShortlist = (id: string) => {
    setShortlist((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const activeCount = initialDestinations.length;
  const comingSoonCount = initialComingSoon.reduce((s, r) => s + r.destinationCount, 0);

  return (
    <main
      ref={stageRef}
      className="fixed inset-0 overflow-hidden"
      style={{ background: 'var(--stage)' }}
    >
      <Provider {...providerProps}>
        {/* HUD + brand */}
        <StatusHud
          providerName={providerName}
          camera={camera}
          liveCount={activeCount}
          comingSoonCount={comingSoonCount}
        />
        <Wordmark />
        <CompassReadout camera={camera} />

        {/* Constellation layer (z-5, between map and pins) */}
        <ConstellationOverlay shortlist={shortlist} destinations={initialDestinations} />

        {/* Pins (z-10) */}
        {initialDestinations.map((d) => (
          <DestinationPin
            key={d.destinationId}
            destination={d}
            style={DEFAULT_PIN_STYLE}
            accentScheme={DEFAULT_ACCENT}
            isActive={activeId === d.destinationId}
            isShortlisted={shortlist.includes(d.destinationId)}
            onHoverStart={() => setHoveredId(d.destinationId)}
            onHoverEnd={() => setHoveredId(null)}
            onClick={() =>
              setPinnedId((cur) => (cur === d.destinationId ? null : d.destinationId))
            }
          />
        ))}

        {/* Pulse card (z-40) */}
        <AnimatePresence>
          {activeDestination && (
            <NeighborhoodPulseCard
              key={activeDestination.destinationId}
              destination={activeDestination}
              pinned={pinnedId === activeDestination.destinationId}
              isShortlisted={shortlist.includes(activeDestination.destinationId)}
              accentScheme={DEFAULT_ACCENT}
              onShortlist={() => toggleShortlist(activeDestination.destinationId)}
              onClose={() => setPinnedId(null)}
            />
          )}
        </AnimatePresence>

        {/* Intention Composer (z-30) */}
        <IntentionComposer
          intentions={intentions}
          onChange={setIntentions}
          dragConstraints={stageRef}
          position={DEFAULT_COMPOSER}
        />

        {/* Shortlist Dock (z-30) */}
        <ShortlistDock
          shortlist={shortlist}
          destinations={initialDestinations}
          onRemove={(id) => setShortlist((prev) => prev.filter((d) => d !== id))}
          dragConstraints={stageRef}
          position={DEFAULT_DOCK}
        />

        {/* Expansion Drawer — Coming Soon roster (z-30) */}
        {initialComingSoon.length > 0 && (
          <ExpansionDrawer
            regions={initialComingSoon}
            dragConstraints={stageRef}
            position={DEFAULT_EXPANSION}
          />
        )}
      </Provider>
    </main>
  );
}

function StatusHud({
  providerName,
  camera,
  liveCount,
  comingSoonCount,
}: {
  providerName: string;
  camera: MapCamera;
  liveCount: number;
  comingSoonCount: number;
}) {
  return (
    <div
      className="absolute top-5 right-5 z-20 flex items-center gap-3 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-2xl"
      style={{
        background: 'var(--panel-bg-depth)',
        boxShadow: 'var(--panel-shadow)',
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: 9,
        letterSpacing: '0.16em',
      }}
    >
      <div className="flex items-center gap-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full bg-[#9AE66E] animate-pulse-orange"
          style={{ boxShadow: '0 0 6px #9AE66E' }}
        />
        <span className="text-zinc-400">SIGNAL LIVE</span>
      </div>
      <div className="w-px h-3 bg-white/10" />
      <span className="text-zinc-500">
        {liveCount} LIVE · +{comingSoonCount} QUEUED
      </span>
      <div className="w-px h-3 bg-white/10" />
      <span className="text-zinc-500 uppercase">{providerName}</span>
      <div className="w-px h-3 bg-white/10" />
      <span className="text-zinc-500">
        Z{camera.zoom.toFixed(1)}
      </span>
    </div>
  );
}

function Wordmark() {
  return (
    <div className="absolute top-5 left-5 z-20 flex items-center gap-2">
      <div
        className="relative w-6 h-6 rounded-md"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #FFB073, #FF6B00 60%, #7A3300 100%)',
          boxShadow: '0 0 20px rgba(255,107,0,0.55), inset 0 1px 0 rgba(255,255,255,0.35)',
        }}
      >
        <div
          className="absolute inset-1 rounded-sm"
          style={{ background: 'rgba(10,10,15,0.35)', backdropFilter: 'blur(4px)' }}
        />
      </div>
      <div>
        <div
          className="text-white font-bold"
          style={{
            fontFamily: 'var(--font-geist-sans), sans-serif',
            letterSpacing: '0.22em',
            fontSize: 12,
          }}
        >
          DESTINATIONS
        </div>
        <div
          className="text-[#FF8A3D]"
          style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: 8,
            letterSpacing: '0.28em',
            marginTop: -1,
          }}
        >
          AI · DISCOVERY CANVAS
        </div>
      </div>
    </div>
  );
}

function CompassReadout({ camera }: { camera: MapCamera }) {
  return (
    <div
      className="absolute bottom-6 left-6 z-20 flex items-center gap-3"
      style={{
        color: 'var(--text-dim)',
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: 9,
        letterSpacing: '0.18em',
      }}
    >
      <div className="flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="0.8" />
          <path d="M6 1V6L8.5 8.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
        <span>
          LAT {camera.lat.toFixed(3)}°N · LNG {camera.lng.toFixed(3)}°W
        </span>
      </div>
      <div className="w-px h-3 bg-white/10" />
      <span>
        ZOOM {camera.zoom.toFixed(1)} · TILT {(camera.pitch ?? 0).toFixed(0)}°
      </span>
    </div>
  );
}
