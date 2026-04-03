'use client';

import { useState, useRef, useCallback } from 'react';
import { Film, Volume2, ZoomIn, ZoomOut, Scissors } from 'lucide-react';

const BC = {
  bg: '#0A0A0F',
  border: 'rgba(255,255,255,0.08)',
  gold: '#D4A853',
  amber: '#FFB300',
  text: '#FFFFFF',
  textSec: 'rgba(255,255,255,0.6)',
  textGhost: 'rgba(255,255,255,0.3)',
};

export interface TimelineClip {
  id: string;
  trackId: string;
  name: string;
  startTime: number;   // seconds from timeline start
  duration: number;     // seconds
  videoUrl?: string;
  type: 'video' | 'audio' | 'overlay';
  color: string;
}

export interface TimelineTrackDef {
  id: string;
  label: string;
  type: 'video' | 'audio';
  color: string;
}

const DEFAULT_TRACKS: TimelineTrackDef[] = [
  { id: 'V1', label: 'V1', type: 'video', color: 'rgba(212,168,83,0.5)' },
  { id: 'V2', label: 'V2', type: 'video', color: 'rgba(139,92,246,0.4)' },
  { id: 'A1', label: 'A1', type: 'audio', color: 'rgba(34,197,94,0.4)' },
  { id: 'A2', label: 'A2', type: 'audio', color: 'rgba(59,130,246,0.4)' },
];

interface TimelineProps {
  clips: TimelineClip[];
  onClipSelect: (clipId: string) => void;
  onClipMove?: (clipId: string, newStartTime: number) => void;
  onClipResize?: (clipId: string, newDuration: number) => void;
  selectedClipId: string | null;
  playheadTime: number;
  onPlayheadChange: (time: number) => void;
  totalDuration: number;
}

function TimeRuler({ totalDuration, zoom, onPlayheadChange }: {
  totalDuration: number;
  zoom: number;
  onPlayheadChange: (time: number) => void;
}) {
  const marks = [];
  const step = zoom > 1.5 ? 1 : zoom > 0.8 ? 2 : 5;
  for (let t = 0; t <= totalDuration; t += step) {
    marks.push(t);
  }

  return (
    <div
      className="h-5 relative cursor-pointer select-none"
      style={{ borderBottom: `1px solid ${BC.border}`, width: `${totalDuration * 80 * zoom}px`, minWidth: '100%' }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = x / (80 * zoom);
        onPlayheadChange(Math.max(0, Math.min(time, totalDuration)));
      }}
    >
      {marks.map(t => (
        <div
          key={t}
          className="absolute top-0 bottom-0 flex flex-col items-center"
          style={{ left: `${t * 80 * zoom}px` }}
        >
          <div className="w-[1px] h-2" style={{ background: BC.border }} />
          <span className="text-[7px] font-mono mt-0.5" style={{ color: BC.textGhost }}>
            {t < 60 ? `${t}s` : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`}
          </span>
        </div>
      ))}
    </div>
  );
}

function Playhead({ time, zoom, height }: { time: number; zoom: number; height: number }) {
  return (
    <div
      className="absolute top-0 z-20 pointer-events-none"
      style={{ left: `${12 * 4 + time * 80 * zoom}px`, height: `${height}px` }}
    >
      {/* Head */}
      <div className="w-3 h-3 -ml-1.5 -mt-0.5" style={{ background: BC.gold, clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
      {/* Line */}
      <div className="w-[1px] h-full mx-auto" style={{ background: BC.gold }} />
    </div>
  );
}

function ClipBlock({ clip, zoom, selected, onSelect, onDragStart }: {
  clip: TimelineClip;
  zoom: number;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const width = Math.max(clip.duration * 80 * zoom, 30);

  return (
    <div
      className="absolute top-1 bottom-1 cursor-pointer group transition-all"
      style={{
        left: `${clip.startTime * 80 * zoom}px`,
        width: `${width}px`,
        background: clip.color,
        border: selected ? `2px solid ${BC.gold}` : '1px solid rgba(255,255,255,0.1)',
        boxShadow: selected ? `0 0 8px ${BC.gold}40` : 'none',
      }}
      onClick={onSelect}
      onMouseDown={onDragStart}
    >
      <div className="flex items-center gap-1 px-1.5 h-full overflow-hidden">
        {clip.type === 'video' ? (
          <Film className="w-2.5 h-2.5 shrink-0" style={{ color: 'rgba(0,0,0,0.5)' }} />
        ) : (
          <Volume2 className="w-2.5 h-2.5 shrink-0" style={{ color: 'rgba(0,0,0,0.5)' }} />
        )}
        <span className="text-[8px] font-mono font-medium truncate" style={{ color: 'rgba(0,0,0,0.7)' }}>
          {clip.name}
        </span>
      </div>
      {/* Resize handle right */}
      <div className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: BC.gold }} />
    </div>
  );
}

export function Timeline({
  clips, onClipSelect, onClipMove, onClipResize,
  selectedClipId, playheadTime, onPlayheadChange, totalDuration,
}: TimelineProps) {
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((clipId: string, e: React.MouseEvent) => {
    if (!onClipMove) return;
    e.preventDefault();
    setDragging(clipId);

    const startX = e.clientX;
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;
    const startTime = clip.startTime;

    const handleMove = (moveE: MouseEvent) => {
      const dx = moveE.clientX - startX;
      const dt = dx / (80 * zoom);
      onClipMove(clipId, Math.max(0, startTime + dt));
    };

    const handleUp = () => {
      setDragging(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [clips, onClipMove, zoom]);

  const effectiveDuration = Math.max(totalDuration, 30);
  const trackHeight = 36;
  const totalHeight = DEFAULT_TRACKS.length * trackHeight + 20; // +ruler

  return (
    <div className="flex flex-col h-full" style={{ background: BC.bg }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 h-7 shrink-0" style={{ borderBottom: `1px solid ${BC.border}` }}>
        <div className="flex items-center gap-2">
          <Scissors className="w-3 h-3" style={{ color: BC.textGhost }} />
          <span className="text-[8px] font-mono" style={{ color: BC.textGhost }}>
            {clips.length} clip{clips.length !== 1 ? 's' : ''} · {effectiveDuration}s
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-0.5 hover:bg-white/[0.05]">
            <ZoomOut className="w-3 h-3" style={{ color: BC.textSec }} />
          </button>
          <span className="text-[8px] font-mono w-8 text-center" style={{ color: BC.textGhost }}>{zoom.toFixed(1)}x</span>
          <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-0.5 hover:bg-white/[0.05]">
            <ZoomIn className="w-3 h-3" style={{ color: BC.textSec }} />
          </button>
        </div>
      </div>

      {/* Timeline body */}
      <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden relative">
        <div style={{ position: 'relative', minHeight: `${totalHeight}px` }}>
          {/* Ruler */}
          <div className="pl-12">
            <TimeRuler totalDuration={effectiveDuration} zoom={zoom} onPlayheadChange={onPlayheadChange} />
          </div>

          {/* Tracks */}
          {DEFAULT_TRACKS.map((track, idx) => {
            const trackClips = clips.filter(c => c.trackId === track.id);
            return (
              <div
                key={track.id}
                className="flex"
                style={{ height: `${trackHeight}px`, borderBottom: `1px solid ${BC.border}` }}
              >
                {/* Track label */}
                <div className="w-12 shrink-0 flex items-center justify-center" style={{ borderRight: `1px solid ${BC.border}` }}>
                  <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: BC.textGhost }}>
                    {track.label}
                  </span>
                </div>
                {/* Track content */}
                <div className="flex-1 relative" style={{ minWidth: `${effectiveDuration * 80 * zoom}px` }}>
                  {trackClips.map(clip => (
                    <ClipBlock
                      key={clip.id}
                      clip={clip}
                      zoom={zoom}
                      selected={selectedClipId === clip.id}
                      onSelect={() => onClipSelect(clip.id)}
                      onDragStart={(e) => handleDragStart(clip.id, e)}
                    />
                  ))}
                  {trackClips.length === 0 && (
                    <div className="absolute inset-0 flex items-center pl-3">
                      <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.1)' }}>
                        {track.type === 'video' ? 'Drop video clips here' : 'Drop audio here'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Playhead */}
          <Playhead time={playheadTime} zoom={zoom} height={totalHeight} />
        </div>
      </div>
    </div>
  );
}
