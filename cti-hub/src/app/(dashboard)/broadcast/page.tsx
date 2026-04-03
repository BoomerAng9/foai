'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Plus, FolderOpen, Image as ImageIcon, Film, FileText, Bot,
  Camera, Play, Pause, SkipBack, SkipForward, Square,
  Maximize2, ChevronDown, ChevronRight, Settings, Layout,
  Layers, Sliders, Music, Sparkles, ListTodo, MessageSquare,
  Send, CornerDownLeft,
} from 'lucide-react';

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

function TimelineTrack({ label, color, clips }: { label: string; color: string; clips: Scene[] }) {
  return (
    <div className="flex items-stretch h-10" style={{ borderBottom: `1px solid ${BC.border}` }}>
      <div className="w-12 shrink-0 flex items-center justify-center" style={{ borderRight: `1px solid ${BC.border}` }}>
        <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: BC.textGhost }}>{label}</span>
      </div>
      <div className="flex-1 relative flex items-center gap-0.5 px-1">
        {clips.filter(c => c.status === 'ready').map((clip, i) => (
          <div
            key={clip.id}
            className="h-7 px-2 flex items-center gap-1 cursor-pointer hover:brightness-110 transition-all"
            style={{
              background: color,
              minWidth: clip.duration ? `${Math.max(clip.duration * 8, 60)}px` : '80px',
            }}
          >
            <Film className="w-2.5 h-2.5" style={{ color: 'rgba(0,0,0,0.5)' }} />
            <span className="text-[8px] font-mono font-medium truncate" style={{ color: 'rgba(0,0,0,0.7)' }}>
              {clip.name || `Scene ${i + 1}`}
            </span>
          </div>
        ))}
        {clips.length === 0 && (
          <span className="text-[9px] font-mono" style={{ color: BC.textGhost }}>Empty track — add scenes to populate</span>
        )}
      </div>
    </div>
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  const addScene = useCallback(() => {
    if (!newSceneInput.trim()) return;
    const scene: Scene = {
      id: `scene-${Date.now()}`,
      name: `Scene ${scenes.length + 1}`,
      description: newSceneInput.trim(),
      status: 'pending',
    };
    setScenes(prev => [...prev, scene]);
    setNewSceneInput('');
  }, [newSceneInput, scenes.length]);

  const handleChatSend = useCallback(() => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', content: chatInput }]);
    // Grammar always-on: every message is processed through the intention engine
    const userMsg = chatInput;
    setChatInput('');
    // Simulate Iller_Ang response (will be wired to actual API)
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'iller_ang',
        content: `[Grammar Active] I'm interpreting your vision: "${userMsg}". Let me set up the cinematic specs — camera, lighting, movement. One moment...`,
      }]);
    }, 800);
  }, [chatInput]);

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
            <div className="space-y-2">
              <div>
                <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: BC.textGhost }}>Lens</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['24mm', '35mm', '50mm', '85mm', '135mm'].map(lens => (
                    <button key={lens} className="px-2 py-1 text-[9px] font-mono hover:bg-white/[0.08] transition-colors" style={{ border: `1px solid ${BC.border}`, color: BC.textSec }}>
                      {lens}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: BC.textGhost }}>Aperture</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['f/1.4', 'f/2.0', 'f/2.8', 'f/4', 'f/8'].map(ap => (
                    <button key={ap} className="px-2 py-1 text-[9px] font-mono hover:bg-white/[0.08] transition-colors" style={{ border: `1px solid ${BC.border}`, color: BC.textSec }}>
                      {ap}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: BC.textGhost }}>Movement</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['Static', 'Pan', 'Tilt', 'Dolly', 'Tracking', 'Crane', 'Handheld'].map(mv => (
                    <button key={mv} className="px-1.5 py-1 text-[8px] font-mono hover:bg-white/[0.08] transition-colors" style={{ border: `1px solid ${BC.border}`, color: BC.textSec }}>
                      {mv}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: BC.textGhost }}>Film Profile</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['ARRI', 'RED', 'Sony', '16mm', 'VHS'].map(prof => (
                    <button key={prof} className="px-2 py-1 text-[9px] font-mono hover:bg-white/[0.08] transition-colors" style={{ border: `1px solid ${BC.border}`, color: BC.textSec }}>
                      {prof}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
                controls={false}
              />
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
          </div>

          {/* Transport bar */}
          <div className="flex items-center justify-between px-4 h-10 shrink-0" style={{ borderTop: `1px solid ${BC.border}`, borderBottom: `1px solid ${BC.border}`, background: BC.surface }}>
            <Timecode />
            <TransportControls playing={playing} onPlayPause={() => setPlaying(!playing)} />
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono" style={{ color: BC.textGhost }}>{resolution}</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="h-44 shrink-0 overflow-y-auto" style={{ background: BC.bg }}>
            {/* Playhead ruler */}
            <div className="h-5 flex items-end px-12" style={{ borderBottom: `1px solid ${BC.border}` }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(sec => (
                <div key={sec} className="flex-1 text-right pr-1">
                  <span className="text-[7px] font-mono" style={{ color: BC.textGhost }}>{sec}s</span>
                </div>
              ))}
            </div>
            <TimelineTrack label="V1" color="rgba(212,168,83,0.4)" clips={scenes} />
            <TimelineTrack label="V2" color="rgba(139,92,246,0.3)" clips={[]} />
            <TimelineTrack label="A1" color="rgba(34,197,94,0.3)" clips={[]} />
            <TimelineTrack label="A2" color="rgba(59,130,246,0.3)" clips={[]} />
          </div>
        </div>

        {/* ── RIGHT SIDEBAR: Properties + Chat ── */}
        <div className="w-72 shrink-0 flex flex-col overflow-hidden" style={{ borderLeft: `1px solid ${BC.border}`, background: BC.surface }}>
          {/* Properties panels */}
          <div className="overflow-y-auto" style={{ maxHeight: '40%', borderBottom: `1px solid ${BC.border}` }}>
            {[
              { icon: Film, label: 'Scenes', count: scenes.length },
              { icon: Layers, label: 'Layers', count: 0 },
              { icon: Sparkles, label: 'Effects', count: 0 },
              { icon: Music, label: 'Audio', count: 0 },
              { icon: Sliders, label: 'Adjustments', count: 0 },
              { icon: ListTodo, label: 'Task List', count: 0 },
            ].map(panel => (
              <button key={panel.label} className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors" style={{ borderBottom: `1px solid ${BC.border}` }}>
                <div className="flex items-center gap-2">
                  <panel.icon className="w-3 h-3" style={{ color: BC.textGhost }} />
                  <span className="text-[10px] font-medium" style={{ color: BC.textSec, fontFamily: 'Inter, sans-serif' }}>{panel.label}</span>
                </div>
                {panel.count > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5" style={{ background: 'rgba(212,168,83,0.15)', color: BC.gold }}>{panel.count}</span>
                )}
              </button>
            ))}
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
