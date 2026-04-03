'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Plus, FolderOpen, Image as ImageIcon, Film, FileText, Bot,
  Camera, Play, Pause, SkipBack, SkipForward, Square,
  Maximize2, ChevronDown, ChevronRight, Settings, Layout,
  Layers, Sliders, Music, Sparkles, ListTodo, MessageSquare,
  Send, CornerDownLeft,
} from 'lucide-react';
import { CameraMenu, parseCameraSpec, CAMERA_DEFAULTS } from '@/components/broadcast/CameraMenu';
import type { CameraSpec } from '@/components/broadcast/CameraMenu';
import { Timeline } from '@/components/broadcast/Timeline';
import type { TimelineClip, ClipTransition, TransitionType } from '@/components/broadcast/Timeline';
import { TextOverlayEditor } from '@/components/broadcast/TextOverlay';
import type { TextOverlayConfig } from '@/components/broadcast/TextOverlay';

// Broad|Cast brand colors
const BC = {
  bg: '#0A0A0F',
  surface: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.08)',
  gold: '#D4A853',
  silver: '#C0C0C0',
  amber: '#FFB300',
  text: '#FFFFFF',
  textSec: 'rgba(255,255,255,0.6)',
  textGhost: 'rgba(255,255,255,0.3)',
  track: 'rgba(255,255,255,0.06)',
};

interface Scene {
  id: string;
  name: string;
  description: string;
  videoUrl?: string;
  duration?: number;
  status: 'pending' | 'generating' | 'ready' | 'error';
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: typeof Plus;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${BC.border}` }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" style={{ color: BC.textSec }} /> : <ChevronRight className="w-3 h-3" style={{ color: BC.textSec }} />}
        <Icon className="w-3.5 h-3.5" style={{ color: BC.gold }} />
        <span className="text-[11px] font-medium tracking-wide" style={{ color: BC.textSec, fontFamily: 'Inter, sans-serif' }}>
          {title}
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function TransportControls({ playing, onPlayPause }: { playing: boolean; onPlayPause: () => void }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button className="p-1.5 hover:bg-white/[0.05] transition-colors" style={{ color: BC.textSec }}>
        <Square className="w-3.5 h-3.5" />
      </button>
      <button className="p-1.5 hover:bg-white/[0.05] transition-colors" style={{ color: BC.textSec }}>
        <SkipBack className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onPlayPause}
        className="p-2 hover:bg-white/[0.08] transition-colors"
        style={{ color: BC.gold }}
      >
        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </button>
      <button className="p-1.5 hover:bg-white/[0.05] transition-colors" style={{ color: BC.textSec }}>
        <SkipForward className="w-3.5 h-3.5" />
      </button>
      <button className="p-1.5 hover:bg-white/[0.05] transition-colors" style={{ color: BC.textSec }}>
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function Timecode({ time = '00:00:00:00' }: { time?: string }) {
  return (
    <span className="text-[11px] tabular-nums tracking-wider" style={{ color: BC.gold, fontFamily: 'IBM Plex Mono, monospace' }}>
      {time}
    </span>
  );
}


export default function BroadcastStudio() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [playing, setPlaying] = useState(false);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    { role: 'system', content: 'Iller_Ang is ready. Describe your vision — Grammar will handle the technical specs.' },
  ]);
  const [newSceneInput, setNewSceneInput] = useState('');
  const [resolution, setResolution] = useState('4K UHD');
  const [cameraSpec, setCameraSpec] = useState<CameraSpec>(CAMERA_DEFAULTS);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [clipTransitions, setClipTransitions] = useState<ClipTransition[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [textOverlays, setTextOverlays] = useState<TextOverlayConfig[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const addScene = useCallback(async () => {
    if (!newSceneInput.trim()) return;
    const sceneId = `scene-${Date.now()}`;
    const scene: Scene = {
      id: sceneId,
      name: `Scene ${scenes.length + 1}`,
      description: newSceneInput.trim(),
      status: 'pending',
    };
    setScenes(prev => [...prev, scene]);
    setNewSceneInput('');
    setSelectedScene(sceneId);

    // Submit to generation API
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: 'generating' } : s));

    try {
      const dur = parseInt(cameraSpec.duration) || 5;
      const res = await fetch('/api/broadcast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `${scene.description}. Camera: ${cameraSpec.movement}. Lens: ${cameraSpec.lens}, ${cameraSpec.aperture}. Film profile: ${cameraSpec.profile}. Lighting: ${cameraSpec.lighting}. Aspect: ${cameraSpec.aspect}.`,
          camera: cameraSpec.movement.toLowerCase().replace(/\s+/g, '_'),
          mood: cameraSpec.lighting.toLowerCase(),
          duration: dur,
          engine: 'seedance',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: 'error' } : s));
        setChatMessages(prev => [...prev, { role: 'iller_ang', content: `Generation issue: ${err.error || 'Service unavailable'}. The scene is saved — we can retry when ready.` }]);
        return;
      }

      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'iller_ang', content: `Scene "${scene.name}" is generating. Estimated cost: ${data.estimated_cost < 0.01 ? '<$0.01' : `$${data.estimated_cost.toFixed(2)}`}. I'll let you know when it's ready.` }]);

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/broadcast/generate?id=${data.generation_id}&engine=${data.engine}`);
          const statusData = await statusRes.json();

          if (statusData.status === 'done') {
            clearInterval(pollInterval);
            const clipDuration = dur;
            setScenes(prev => prev.map(s => s.id === sceneId ? {
              ...s,
              status: 'ready',
              videoUrl: statusData.video_url,
              duration: clipDuration,
            } : s));
            // Auto-add to timeline V1 track
            setTimelineClips(prev => {
              const existingEnd = prev.filter(c => c.trackId === 'V1').reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
              return [...prev, {
                id: `clip-${sceneId}`,
                trackId: 'V1',
                name: scene.name,
                startTime: existingEnd,
                duration: clipDuration,
                videoUrl: statusData.video_url,
                type: 'video' as const,
                color: 'rgba(212,168,83,0.5)',
              }];
            });
            setChatMessages(prev => [...prev, { role: 'iller_ang', content: `"${scene.name}" is ready and on the timeline. Looking good — check the preview canvas.` }]);
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: 'error' } : s));
            setChatMessages(prev => [...prev, { role: 'iller_ang', content: `"${scene.name}" failed to generate. Let me know if you want to retry with different specs.` }]);
          }
        } catch {
          // Keep polling on network errors
        }
      }, 5000);

      // Stop polling after 3 minutes
      setTimeout(() => clearInterval(pollInterval), 180000);
    } catch {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: 'error' } : s));
    }
  }, [newSceneInput, scenes.length, chatMessages]);

  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');

    // Add streaming placeholder
    const streamId = `iller-${Date.now()}`;
    setChatMessages(prev => [...prev, { role: 'iller_ang', content: '', id: streamId }]);

    try {
      const res = await fetch('/api/broadcast/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: chatMessages.slice(-10),
        }),
      });

      if (!res.ok || !res.body) {
        setChatMessages(prev => prev.map(m =>
          (m as any).id === streamId ? { role: 'iller_ang', content: 'Connection issue. Try again.' } : m
        ));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              setChatMessages(prev => prev.map(m =>
                (m as any).id === streamId ? { ...m, content: m.content + data.content } : m
              ));
              // Auto-scroll chat
              chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

              // Parse camera specs from Iller_Ang's response — auto-populate camera menu
              setChatMessages(prev => {
                const currentMsg = prev.find(m => (m as any).id === streamId);
                if (currentMsg) {
                  const parsed = parseCameraSpec(currentMsg.content + data.content);
                  if (parsed) {
                    setCameraSpec(prev => ({ ...prev, ...parsed }));
                  }
                }
                return prev;
              });
            }
            if (data.done) break;
          } catch {}
        }
      }
    } catch {
      setChatMessages(prev => prev.map(m =>
        (m as any).id === streamId ? { role: 'iller_ang', content: 'Connection error. Please try again.' } : m
      ));
    }
  }, [chatInput, chatMessages]);

  return (
    <div className="flex flex-col h-full" style={{ background: BC.bg, color: BC.text }}>
      {/* ── Studio Header ── */}
      <div className="flex items-center justify-between px-4 h-11 shrink-0" style={{ borderBottom: `1px solid ${BC.border}` }}>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-semibold tracking-wider hover:bg-white/[0.05] transition-colors" style={{ border: `1px solid ${BC.gold}`, color: BC.gold }}>
          <Plus className="w-3 h-3" /> NEW PROJECT
        </button>

        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
            <line x1="20" y1="80" x2="80" y2="20" stroke={BC.silver} strokeWidth="12" strokeLinecap="round" />
            <line x1="20" y1="20" x2="80" y2="80" stroke={BC.silver} strokeWidth="12" strokeLinecap="round" />
            <circle cx="15" cy="50" r="6" fill={BC.silver} />
          </svg>
          <div className="flex flex-col items-center">
            <span className="text-[13px] font-extrabold tracking-[0.25em]" style={{ color: BC.gold, fontFamily: 'Outfit, sans-serif' }}>
              BROAD<span style={{ color: BC.silver }}>|</span>CAST
            </span>
            <span className="text-[7px] tracking-[0.3em] uppercase" style={{ color: BC.textGhost, fontFamily: 'Inter, sans-serif' }}>
              Video Creation Studio
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: BC.amber }} />
          <span className="text-[10px] font-mono" style={{ color: BC.textSec }}>Iller_Ang</span>
        </div>
      </div>

      {/* ── Three-Panel Layout ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── LEFT SIDEBAR ── */}
        <div className="w-56 shrink-0 flex flex-col overflow-y-auto" style={{ borderRight: `1px solid ${BC.border}`, background: BC.surface }}>
          {/* Nav items */}
          {[
            { icon: Layout, label: 'Dashboard' },
            { icon: FolderOpen, label: 'Projects' },
            { icon: ImageIcon, label: 'Media Library' },
            { icon: Film, label: 'Templates' },
            { icon: Settings, label: 'Settings' },
          ].map(item => (
            <button key={item.label} className="flex items-center gap-2.5 px-3 py-2 text-[11px] hover:bg-white/[0.03] transition-colors w-full" style={{ color: BC.textSec, fontFamily: 'Inter, sans-serif' }}>
              <item.icon className="w-3.5 h-3.5" style={{ color: BC.textGhost }} />
              {item.label}
            </button>
          ))}

          <div style={{ borderTop: `1px solid ${BC.border}` }} className="mt-1" />

          {/* Project Details */}
          <div className="px-3 py-3" style={{ borderBottom: `1px solid ${BC.border}` }}>
            <span className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase" style={{ color: BC.textGhost }}>Project Details</span>
            <div className="mt-2 space-y-2">
              <input
                placeholder="Tags..."
                className="w-full px-2 py-1.5 text-[10px] font-mono bg-transparent outline-none"
                style={{ border: `1px solid ${BC.border}`, color: BC.text }}
              />
              <select
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                className="w-full px-2 py-1.5 text-[10px] font-mono bg-transparent outline-none cursor-pointer"
                style={{ border: `1px solid ${BC.border}`, color: BC.text }}
              >
                <option value="720p" style={{ background: BC.bg }}>720p HD</option>
                <option value="1080p" style={{ background: BC.bg }}>1080p Full HD</option>
                <option value="4K UHD" style={{ background: BC.bg }}>4K UHD</option>
              </select>
            </div>
          </div>

          {/* Collapsible sections */}
          <CollapsibleSection title="Media" icon={ImageIcon}>
            <button className="w-full py-2 text-[10px] font-mono tracking-wide hover:bg-white/[0.05] transition-colors" style={{ border: `1px dashed ${BC.border}`, color: BC.textSec }}>
              Upload or Import
            </button>
          </CollapsibleSection>

          <CollapsibleSection title="Scenes" icon={Film} defaultOpen>
            <div className="space-y-1.5">
              {scenes.map(scene => (
                <button
                  key={scene.id}
                  onClick={() => setSelectedScene(scene.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-white/[0.05] transition-colors"
                  style={{
                    background: selectedScene === scene.id ? 'rgba(212,168,83,0.1)' : 'transparent',
                    border: selectedScene === scene.id ? `1px solid ${BC.gold}` : `1px solid ${BC.border}`,
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{
                    background: scene.status === 'ready' ? '#22C55E' : scene.status === 'generating' ? BC.amber : BC.textGhost,
                  }} />
                  <span className="text-[10px] font-mono truncate" style={{ color: BC.text }}>{scene.name}</span>
                </button>
              ))}
              <div className="flex gap-1">
                <input
                  value={newSceneInput}
                  onChange={e => setNewSceneInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addScene()}
                  placeholder="Describe scene..."
                  className="flex-1 px-2 py-1.5 text-[10px] font-mono bg-transparent outline-none"
                  style={{ border: `1px solid ${BC.border}`, color: BC.text }}
                />
                <button
                  onClick={addScene}
                  className="px-2 py-1.5 text-[10px] font-mono font-semibold hover:brightness-110 transition-colors"
                  style={{ background: BC.gold, color: BC.bg }}
                >
                  +
                </button>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Scripts" icon={FileText}>
            <span className="text-[10px] font-mono" style={{ color: BC.textGhost }}>No scripts yet</span>
          </CollapsibleSection>

          <CollapsibleSection title="AI Assistants" icon={Bot}>
            <div className="space-y-1">
              {[
                { name: 'Iller_Ang', role: 'Head of Studio', color: BC.amber, active: true },
                { name: 'ACHEEVY', role: 'Digital CEO', color: BC.gold, active: true },
                { name: 'Beat_Ang', role: 'Audio & Music', color: '#A855F7', active: true },
                { name: 'CUT_Ang', role: 'Video Editing', color: '#EC4899', active: true },
                { name: 'Social_Ang', role: 'Social Distribution', color: '#14B8A6', active: false },
                { name: 'Publish_Ang', role: 'Publishing & CDN', color: '#6366F1', active: false },
                { name: 'PROMO_Ang', role: 'Marketing & Promo', color: '#F59E0B', active: false },
              ].map(agent => (
                <div key={agent.name} className="flex items-center gap-2 px-2 py-1.5" style={{ opacity: agent.active ? 1 : 0.5 }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: agent.color }} />
                  <div>
                    <span className="text-[10px] font-mono font-medium block" style={{ color: BC.text }}>{agent.name}</span>
                    <span className="text-[8px] font-mono" style={{ color: BC.textGhost }}>{agent.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Camera" icon={Camera}>
            <CameraMenu spec={cameraSpec} onChange={setCameraSpec} />
          </CollapsibleSection>
        </div>

        {/* ── CENTER: Canvas + Timeline ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video Preview Canvas */}
          <div className="flex-1 flex items-center justify-center relative" style={{ background: '#000' }}>
            {selectedScene && scenes.find(s => s.id === selectedScene)?.videoUrl ? (
              <video
                src={scenes.find(s => s.id === selectedScene)?.videoUrl}
                className="max-w-full max-h-full"
                controls
                style={{ maxHeight: '100%' }}
              />
            ) : timelineClips.filter(c => c.videoUrl).length > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-mono" style={{ color: BC.textSec }}>
                  {timelineClips.filter(c => c.videoUrl).length} clips on timeline
                </span>
                <span className="text-[9px] font-mono" style={{ color: BC.textGhost }}>
                  Select a clip or hit EXPORT MP4 to render
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <svg width="48" height="48" viewBox="0 0 100 100" fill="none" opacity="0.2">
                  <line x1="20" y1="80" x2="80" y2="20" stroke={BC.silver} strokeWidth="10" strokeLinecap="round" />
                  <line x1="20" y1="20" x2="80" y2="80" stroke={BC.silver} strokeWidth="10" strokeLinecap="round" />
                  <circle cx="15" cy="50" r="5" fill={BC.silver} />
                </svg>
                <span className="text-[11px] font-mono" style={{ color: BC.textGhost }}>
                  Add scenes or describe your vision in chat
                </span>
              </div>
            )}
            {/* Generating overlay */}
            {scenes.some(s => s.status === 'generating') && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5" style={{ background: 'rgba(0,0,0,0.8)', border: `1px solid ${BC.border}` }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: BC.amber }} />
                <span className="text-[9px] font-mono" style={{ color: BC.amber }}>Generating scene...</span>
              </div>
            )}
          </div>

          {/* Transport bar */}
          <div className="flex items-center justify-between px-4 h-10 shrink-0" style={{ borderTop: `1px solid ${BC.border}`, borderBottom: `1px solid ${BC.border}`, background: BC.surface }}>
            <Timecode />
            <TransportControls playing={playing} onPlayPause={() => setPlaying(!playing)} />
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono" style={{ color: BC.textGhost }}>{resolution}</span>
            </div>
          </div>

          {/* Render bar */}
          {timelineClips.filter(c => c.videoUrl).length > 0 && (
            <div className="flex items-center justify-between px-4 h-8 shrink-0" style={{ borderTop: `1px solid ${BC.border}`, background: BC.surface }}>
              <span className="text-[9px] font-mono" style={{ color: BC.textGhost }}>
                {timelineClips.filter(c => c.videoUrl).length} clip{timelineClips.filter(c => c.videoUrl).length !== 1 ? 's' : ''} ready
              </span>
              <button
                onClick={async () => {
                  setRendering(true);
                  setChatMessages(prev => [...prev, { role: 'iller_ang', content: 'Rendering your timeline. I\'ll let you know when the export is ready.' }]);
                  try {
                    const transMap: Record<string, { type: string; duration: number }> = {};
                    clipTransitions.forEach(t => {
                      transMap[`${t.fromClipId}-${t.toClipId}`] = { type: t.type, duration: 15 };
                    });
                    const res = await fetch('/api/broadcast/render', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clips: timelineClips, transitions: transMap, resolution }),
                    });
                    const data = await res.json();
                    setChatMessages(prev => [...prev, { role: 'iller_ang', content: `Render ${data.status}: ${data.message}` }]);
                  } catch {
                    setChatMessages(prev => [...prev, { role: 'iller_ang', content: 'Render failed. Let me know if you want to retry.' }]);
                  } finally {
                    setRendering(false);
                  }
                }}
                disabled={rendering}
                className="px-3 py-1 text-[9px] font-mono font-bold tracking-wider transition-all disabled:opacity-50"
                style={{ background: BC.gold, color: BC.bg }}
              >
                {rendering ? 'RENDERING...' : 'EXPORT MP4'}
              </button>
              <button
                onClick={async () => {
                  setChatMessages(prev => [...prev, { role: 'iller_ang', content: 'Publishing to CDN... generating shareable link.' }]);
                  try {
                    const res = await fetch('/api/broadcast/publish', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ videoUrl: timelineClips[0]?.videoUrl || '', platform: 'cdn' }),
                    });
                    const data = await res.json();
                    setChatMessages(prev => [...prev, { role: 'iller_ang', content: `Published. Share link: ${data.url || 'Generation in progress'}` }]);
                  } catch {
                    setChatMessages(prev => [...prev, { role: 'iller_ang', content: 'Publish failed. Render the video first, then publish.' }]);
                  }
                }}
                className="px-3 py-1 text-[9px] font-mono font-bold tracking-wider transition-all hover:bg-white/[0.08]"
                style={{ border: `1px solid ${BC.border}`, color: BC.textSec }}
              >
                PUBLISH
              </button>
            </div>
          )}

          {/* Timeline */}
          <div className="h-44 shrink-0">
            <Timeline
              clips={timelineClips}
              transitions={clipTransitions}
              onClipSelect={(id) => {
                setSelectedClipId(id);
                const clip = timelineClips.find(c => c.id === id);
                if (clip) {
                  const sceneId = clip.id.replace('clip-', '');
                  setSelectedScene(sceneId);
                }
              }}
              onClipMove={(id, newStart) => {
                setTimelineClips(prev => prev.map(c => c.id === id ? { ...c, startTime: newStart } : c));
              }}
              onTransitionChange={(fromId, toId, type) => {
                setClipTransitions(prev => {
                  const existing = prev.findIndex(t => t.fromClipId === fromId && t.toClipId === toId);
                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = { fromClipId: fromId, toClipId: toId, type };
                    return updated;
                  }
                  return [...prev, { fromClipId: fromId, toClipId: toId, type }];
                });
              }}
              selectedClipId={selectedClipId}
              playheadTime={playheadTime}
              onPlayheadChange={setPlayheadTime}
              totalDuration={Math.max(30, timelineClips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0) + 10)}
            />
          </div>
        </div>

        {/* ── RIGHT SIDEBAR: Properties + Chat ── */}
        <div className="w-72 shrink-0 flex flex-col overflow-hidden" style={{ borderLeft: `1px solid ${BC.border}`, background: BC.surface }}>
          {/* Properties panels */}
          <div className="overflow-y-auto" style={{ maxHeight: '40%', borderBottom: `1px solid ${BC.border}` }}>
            {[
              { icon: Film, label: 'Scenes', count: scenes.length, action: undefined },
              { icon: Layers, label: 'Layers', count: textOverlays.length, action: () => setShowTextEditor(!showTextEditor) },
              { icon: Sparkles, label: 'Effects', count: 0, action: undefined },
              { icon: Music, label: 'Audio', count: 0, action: undefined },
              { icon: Sliders, label: 'Adjustments', count: 0, action: undefined },
              { icon: ListTodo, label: 'Task List', count: scenes.filter(s => s.status === 'generating').length, action: undefined },
            ].map(panel => (
              <button key={panel.label} onClick={panel.action} className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors" style={{ borderBottom: `1px solid ${BC.border}` }}>
                <div className="flex items-center gap-2">
                  <panel.icon className="w-3 h-3" style={{ color: BC.textGhost }} />
                  <span className="text-[10px] font-medium" style={{ color: BC.textSec, fontFamily: 'Inter, sans-serif' }}>{panel.label}</span>
                </div>
                {panel.count > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5" style={{ background: 'rgba(212,168,83,0.15)', color: BC.gold }}>{panel.count}</span>
                )}
              </button>
            ))}
            {/* Text Overlay Editor */}
            {showTextEditor && (
              <TextOverlayEditor
                currentTime={playheadTime}
                onAdd={(overlay) => {
                  setTextOverlays(prev => [...prev, overlay]);
                  // Add to V2 track as overlay clip
                  setTimelineClips(prev => [...prev, {
                    id: overlay.id,
                    trackId: 'V2',
                    name: overlay.text.slice(0, 20),
                    startTime: overlay.startTime,
                    duration: overlay.duration,
                    type: 'overlay' as const,
                    color: 'rgba(139,92,246,0.5)',
                  }]);
                }}
                onClose={() => setShowTextEditor(false)}
              />
            )}
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ borderBottom: `1px solid ${BC.border}` }}>
              <MessageSquare className="w-3 h-3" style={{ color: BC.gold }} />
              <span className="text-[10px] font-semibold tracking-wide" style={{ color: BC.text, fontFamily: 'Inter, sans-serif' }}>Team Chat</span>
              <div className="ml-auto flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: BC.amber }} />
                <span className="text-[8px] font-mono" style={{ color: BC.amber }}>GRAMMAR ON</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.role !== 'user' && (
                    <span className="text-[8px] font-mono font-bold tracking-wider mb-0.5" style={{ color: msg.role === 'iller_ang' ? BC.amber : BC.gold }}>
                      {msg.role === 'iller_ang' ? 'ILLER_ANG' : 'SYSTEM'}
                    </span>
                  )}
                  <div
                    className="px-2.5 py-1.5 max-w-[95%]"
                    style={{
                      background: msg.role === 'user' ? 'rgba(212,168,83,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${msg.role === 'user' ? 'rgba(212,168,83,0.3)' : BC.border}`,
                    }}
                  >
                    <span className="text-[10px] leading-relaxed" style={{ color: BC.text, fontFamily: 'Inter, sans-serif' }}>{msg.content}</span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="px-2 py-2 shrink-0" style={{ borderTop: `1px solid ${BC.border}` }}>
              <div className="flex items-end gap-1.5">
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                  placeholder="Describe your vision..."
                  rows={1}
                  className="flex-1 px-2.5 py-2 text-[10px] bg-transparent outline-none resize-none"
                  style={{ border: `1px solid ${BC.border}`, color: BC.text, fontFamily: 'Inter, sans-serif', maxHeight: '80px' }}
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim()}
                  className="p-2 shrink-0 transition-colors disabled:opacity-30"
                  style={{ background: BC.gold, color: BC.bg }}
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-1">
                <div className="flex items-center gap-1">
                  <CornerDownLeft className="w-2.5 h-2.5" style={{ color: BC.textGhost }} />
                  <span className="text-[7px] font-mono" style={{ color: BC.textGhost }}>ENTER</span>
                </div>
                <div className="flex gap-2">
                  {['Media', 'Task', 'Request'].map(action => (
                    <button key={action} className="text-[7px] font-mono uppercase tracking-wider hover:text-white/60 transition-colors" style={{ color: BC.textGhost }}>
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
