'use client';

import { useState, useRef, useCallback, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus, FolderOpen, Image as ImageIcon, Film, FileText, Bot,
  Camera, Play, Pause, SkipBack, SkipForward, Square,
  Maximize2, ChevronDown, ChevronRight, Settings, Layout,
  Layers, Sliders, Music, Sparkles, ListTodo, MessageSquare,
  Send, CornerDownLeft, Volume2, VolumeX, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { CameraMenu, parseCameraSpec, CAMERA_DEFAULTS } from '@/components/broadcast/CameraMenu';
import type { CameraSpec } from '@/components/broadcast/CameraMenu';
import { Timeline } from '@/components/broadcast/Timeline';
import type { TimelineClip, ClipTransition, TransitionType } from '@/components/broadcast/Timeline';
import { TextOverlayEditor } from '@/components/broadcast/TextOverlay';
import type { TextOverlayConfig } from '@/components/broadcast/TextOverlay';

// ── Error Boundary ──
interface ErrorBoundaryState { hasError: boolean; error: Error | null }
class BroadcastErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[Broad|Cast] Crash:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4" style={{ background: '#0A0A0F', color: '#fff' }}>
          <AlertTriangle className="w-10 h-10" style={{ color: '#EF4444' }} />
          <span className="text-[14px] font-mono" style={{ color: '#EF4444' }}>Broad|Cast Studio encountered an error</span>
          <span className="text-[11px] font-mono max-w-md text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </span>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-4 py-2 text-[11px] font-mono font-bold tracking-wider transition-all hover:brightness-110"
            style={{ background: '#D4A853', color: '#0A0A0F' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            RECOVER
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const { user } = useAuth();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [playing, setPlaying] = useState(false);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string; id?: string }[]>([
    { role: 'system', content: 'ILLA is ready. Describe your vision and I\'ll set up the cinematic specs.' },
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
  const [showScenarios, setShowScenarios] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  // Grammar status from the chat-route SSE meta frame.
  // 'applied'     enriched the user's prompt with NTNTN output
  // 'passthrough' message bypassed Grammar (passthrough phrase)
  // 'failed'      Grammar call errored — falling back to raw input
  const [grammarStatus, setGrammarStatus] = useState<'applied' | 'passthrough' | 'failed' | null>(null);
  const [grammarError, setGrammarError] = useState<string | null>(null);
  // Video generation state
  const [videoTaskId, setVideoTaskId] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStatus, setVideoStatus] = useState<'idle' | 'generating' | 'complete' | 'error'>('idle');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [pendingVideoPrompt, setPendingVideoPrompt] = useState<string | null>(null);
  const [pendingCameraSpec, setPendingCameraSpec] = useState<Record<string, string> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for video generation status
  useEffect(() => {
    if (!videoTaskId || videoStatus !== 'generating') return;
    pollRef.current = setInterval(async () => {
      try {
        const idToken = user ? await user.getIdToken(true) : '';
        const res = await fetch(`/api/video/seedance?taskId=${videoTaskId}`, {
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.progress !== undefined) setVideoProgress(data.progress);
        if (data.status === 'SUCCESS' || data.status === 'completed' || data.videoUrl) {
          setVideoStatus('complete');
          setGeneratedVideoUrl(data.videoUrl || null);
          setVideoProgress(100);
          if (pollRef.current) clearInterval(pollRef.current);
          // Add to scenes + timeline
          if (data.videoUrl) {
            const sceneId = `scene-${Date.now()}`;
            const dur = parseInt(pendingCameraSpec?.duration || '8') || 8;
            setScenes(prev => [...prev, {
              id: sceneId,
              name: `Scene ${prev.length + 1}`,
              description: pendingVideoPrompt?.slice(0, 60) || 'Generated scene',
              videoUrl: data.videoUrl,
              duration: dur,
              status: 'ready',
            }]);
            setTimelineClips(prev => {
              const existingEnd = prev.filter(c => c.trackId === 'V1').reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
              return [...prev, {
                id: `clip-${sceneId}`,
                trackId: 'V1',
                name: `Scene ${scenes.length + 1}`,
                startTime: existingEnd,
                duration: dur,
                videoUrl: data.videoUrl,
                type: 'video' as const,
                color: 'rgba(212,168,83,0.5)',
              }];
            });
            setSelectedScene(sceneId);
            setChatMessages(prev => [...prev, { role: 'illa', content: 'Your video is ready and on the timeline. Check the preview canvas.' }]);
          }
        } else if (data.status === 'FAILED' || data.status === 'failed' || data.error) {
          setVideoStatus('error');
          if (pollRef.current) clearInterval(pollRef.current);
          setChatMessages(prev => [...prev, { role: 'illa', content: `Video generation failed: ${data.error || 'Unknown error'}. Let me know if you want to retry.` }]);
        }
      } catch (err) {
        console.warn('[Broad|Cast] Video poll error:', err);
      }
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoTaskId, videoStatus]);

  const handleGenerateVideo = useCallback(async () => {
    if (!pendingVideoPrompt) return;
    setVideoStatus('generating');
    setVideoProgress(0);
    setGeneratedVideoUrl(null);
    setChatMessages(prev => [...prev, { role: 'illa', content: 'Sending to the production floor. Your video is now generating...' }]);
    try {
      const idToken = user ? await user.getIdToken(true) : '';
      // Map cinematic aspect ratios to Seedance-supported ratios
      const rawAspect = pendingCameraSpec?.aspect || cameraSpec.aspect || '16:9';
      const ASPECT_MAP: Record<string, string> = {
        '2.39:1': '21:9', '2.35:1': '21:9', '2.40:1': '21:9', 'cinemascope': '21:9',
        '1.85:1': '16:9', '1.78:1': '16:9', 'widescreen': '16:9',
        '1.33:1': '4:3', 'standard': '4:3',
        '0.75:1': '3:4', 'portrait': '9:16', 'vertical': '9:16',
      };
      const aspect = ASPECT_MAP[rawAspect.toLowerCase()] || rawAspect;
      const dur = parseInt(pendingCameraSpec?.duration || cameraSpec.duration || '8') || 8;
      const res = await fetch('/api/video/seedance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          prompt: pendingVideoPrompt,
          duration: Math.min(dur, 15),
          aspectRatio: aspect,
          generateAudio: true,
          fast: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        setVideoStatus('error');
        setChatMessages(prev => [...prev, { role: 'illa', content: `Generation issue: ${err.error || 'Service unavailable'}. We can retry when ready.` }]);
        return;
      }
      const data = await res.json();
      if (data.taskId) {
        setVideoTaskId(data.taskId);
      } else {
        setVideoStatus('error');
        setChatMessages(prev => [...prev, { role: 'illa', content: 'No task ID returned. Check your video credits.' }]);
      }
    } catch {
      setVideoStatus('error');
      setChatMessages(prev => [...prev, { role: 'illa', content: 'Connection error starting video generation. Please try again.' }]);
    }
  }, [pendingVideoPrompt, pendingCameraSpec, cameraSpec, user]);

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
      const idToken = user ? await user.getIdToken(true) : '';
      const dur = parseInt(cameraSpec.duration) || 5;
      const res = await fetch('/api/broadcast/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          description: `${scene.description}. Camera: ${cameraSpec.movement}. Lens: ${cameraSpec.lens}, ${cameraSpec.aperture}. Film profile: ${cameraSpec.profile}. Lighting: ${cameraSpec.lighting}. Aspect: ${cameraSpec.aspect}.`,
          camera: cameraSpec.movement.toLowerCase().replace(/\s+/g, '_'),
          mood: cameraSpec.lighting.toLowerCase(),
          duration: dur,
          engine: 'seedance',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: 'error' } : s));
        if (res.status === 401 || res.status === 403) {
          setChatMessages(prev => [...prev, { role: 'illa', content: 'Please sign in to generate scenes. Your session may have expired.' }]);
        } else {
          setChatMessages(prev => [...prev, { role: 'illa', content: `Generation issue: ${err.error || 'Service unavailable'}. The scene is saved — we can retry when ready.` }]);
        }
        return;
      }

      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'illa', content: `Scene "${scene.name}" is generating. I'll let you know when it's ready.` }]);

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const pollToken = user ? await user.getIdToken(true) : '';
          const statusRes = await fetch(`/api/broadcast/generate?id=${data.generation_id}&engine=${data.engine}`, {
            headers: pollToken ? { 'Authorization': `Bearer ${pollToken}` } : {},
          });
          if (!statusRes.ok) return; // keep polling on transient errors
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
            setChatMessages(prev => [...prev, { role: 'illa', content: `"${scene.name}" is ready and on the timeline. Looking good — check the preview canvas.` }]);
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: 'error' } : s));
            setChatMessages(prev => [...prev, { role: 'illa', content: `"${scene.name}" failed to generate: ${statusData.error || 'Unknown reason'}. Let me know if you want to retry with different specs.` }]);
          }
        } catch {
          // Keep polling on network errors
        }
      }, 5000);

      // Stop polling after 3 minutes
      setTimeout(() => clearInterval(pollInterval), 180000);
    } catch (err) {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: 'error' } : s));
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setChatMessages(prev => [...prev, { role: 'illa', content: `Failed to start scene generation: ${msg}` }]);
    }
  }, [newSceneInput, scenes.length, cameraSpec, user]);

  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');

    // Add streaming placeholder
    const streamId = `illa-${Date.now()}`;
    setChatMessages(prev => [...prev, { role: 'illa', content: '', id: streamId }]);

    try {
      // Get fresh token and send as Bearer — bypasses stale cookie issues
      const idToken = user ? await user.getIdToken(true) : '';
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
      };

      const res = await fetch('/api/broadcast/chat', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          message: userMsg,
          history: chatMessages.slice(-10),
        }),
      });

      if (!res.ok || !res.body) {
        // Descriptive error based on status code
        if (res.status === 401 || res.status === 403) {
          // Auto-refresh session on 401 and retry once
          if (res.status === 401 && user) {
            try {
              const freshToken = await user.getIdToken(true);
              await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: freshToken }),
              });
              const retryRes = await fetch('/api/broadcast/chat', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${freshToken}`,
                },
                body: JSON.stringify({ message: userMsg, history: chatMessages.slice(-10) }),
              });
              if (retryRes.ok && retryRes.body) {
                // Fall through to streaming with retry response
                const reader = retryRes.body.getReader();
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
                          m.id === streamId ? { ...m, content: m.content + data.content } : m
                        ));
                        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }
                      if (data.video_ready) {
                        setPendingVideoPrompt(data.video_prompt || null);
                        setPendingCameraSpec(data.camera_spec || null);
                        setVideoStatus('idle');
                        setGeneratedVideoUrl(null);
                        setVideoTaskId(null);
                      }
                      if (data.done) break;
                    } catch {}
                  }
                }
                return;
              }
            } catch {}
          }
          // Auth definitely failed
          setChatMessages(prev => prev.map(m =>
            m.id === streamId ? { role: 'illa', content: 'Please sign in to use Broad|Cast Studio. Your session may have expired.' } : m
          ));
          return;
        }
        // Non-auth error — parse server response for details
        let errorDetail = `Server returned ${res.status}`;
        try {
          const errBody = await res.json();
          if (errBody.error) errorDetail = errBody.error;
        } catch {}
        setChatMessages(prev => prev.map(m =>
          m.id === streamId ? { role: 'illa', content: `ILLA is temporarily unavailable: ${errorDetail}. Please try again in a moment.` } : m
        ));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullVoiceText = '';

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
              fullVoiceText += data.content;
              setChatMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, content: m.content + data.content } : m
              ));
              chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

              // Parse camera specs from ILLA's response — auto-populate camera menu
              setChatMessages(prev => {
                const currentMsg = prev.find(m => m.id === streamId);
                if (currentMsg) {
                  const parsed = parseCameraSpec(currentMsg.content + data.content);
                  if (parsed) {
                    setCameraSpec(prev => ({ ...prev, ...parsed }));
                  }
                }
                return prev;
              });
            }
            // Grammar status from SSE meta frame (sent before content stream).
            if (data.meta?.grammar_status) {
              setGrammarStatus(data.meta.grammar_status as 'applied' | 'passthrough' | 'failed');
              setGrammarError(data.meta.grammar_error ?? null);
            }
            // Detect video_ready signal from chat route
            if (data.video_ready) {
              setPendingVideoPrompt(data.video_prompt || null);
              setPendingCameraSpec(data.camera_spec || null);
              setVideoStatus('idle');
              setGeneratedVideoUrl(null);
              setVideoTaskId(null);
            }
            if (data.done) {
              // Auto-voice: read ILLA's response aloud
              if (voiceEnabled && fullVoiceText) {
                const cleanText = fullVoiceText
                  .replace(/!\[.*?\]\(.*?\)/g, '')
                  .replace(/\[CAMERA_SPEC\][\s\S]*?\[\/CAMERA_SPEC\]/g, '')
                  .replace(/\*\*/g, '')
                  .slice(0, 500)
                  .trim();
                if (cleanText) {
                  fetch('/api/voice/synthesize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: cleanText }),
                  }).then(r => r.json()).then(d => {
                    if (d.audio) {
                      const audio = new Audio(d.audio);
                      audioRef.current = audio;
                      audio.play().catch(() => {});
                    }
                  }).catch(() => {});
                }
              }
              break;
            }
          } catch {}
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setChatMessages(prev => prev.map(m =>
        m.id === streamId ? { role: 'illa', content: `Network error: ${msg}. Check your connection and try again.` } : m
      ));
    }
  }, [chatInput, chatMessages, voiceEnabled, user]);

  return (
    <BroadcastErrorBoundary>
    <div className="flex flex-col h-full" style={{ background: BC.bg, color: BC.text }}>
      {/* ── Studio Header ── */}
      <div className="flex items-center justify-between px-4 h-11 shrink-0" style={{ borderBottom: `1px solid ${BC.border}` }}>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-semibold tracking-wider hover:bg-white/[0.05] transition-colors" style={{ border: `1px solid ${BC.gold}`, color: BC.gold }}>
          <Plus className="w-3 h-3" /> NEW PROJECT
        </button>

        <div className="flex items-center">
          {/* Full Broad|Cast logo — mark + text as single image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/broadcast-logo.svg" alt="Broad|Cast Video Creation Studio" className="h-10 w-auto object-contain" />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: BC.amber }} />
          <span className="text-[10px] font-mono" style={{ color: BC.textSec }}>ILLA</span>
        </div>
      </div>

      {/* ── Three-Panel Layout (responsive: stack on small screens) ── */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">

        {/* ── LEFT SIDEBAR (hidden on mobile, shown as drawer concept) ── */}
        <div className="hidden md:flex w-56 shrink-0 flex-col overflow-y-auto" style={{ borderRight: `1px solid ${BC.border}`, background: BC.surface }}>
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
                { name: 'ILLA', role: 'Head of Studio', color: BC.amber, active: true },
                { name: 'ACHEEVY', role: 'AI Operations Manager', color: BC.gold, active: true },
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
            {/* Show generated video in player */}
            {generatedVideoUrl ? (
              <video
                src={generatedVideoUrl}
                className="max-w-full max-h-full"
                controls
                autoPlay
                style={{ maxHeight: '100%' }}
              />
            ) : selectedScene && scenes.find(s => s.id === selectedScene)?.videoUrl ? (
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
            ) : videoStatus === 'generating' ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
                    <circle cx="40" cy="40" r="34" stroke={BC.gold} strokeWidth="6" fill="none"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - videoProgress / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[13px] font-mono font-bold" style={{ color: BC.gold }}>
                    {videoProgress}%
                  </span>
                </div>
                <span className="text-[11px] font-mono" style={{ color: BC.amber }}>
                  Generating video...
                </span>
                <span className="text-[9px] font-mono" style={{ color: BC.textGhost }}>
                  This typically takes 30-90 seconds
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/broadcast-logo.svg" alt="" className="h-12 w-auto object-contain opacity-15" />
                <span className="text-[11px] font-mono" style={{ color: BC.textGhost }}>
                  Add scenes or describe your vision in chat
                </span>
              </div>
            )}

            {/* GENERATE VIDEO button — appears when ILLA provides camera specs */}
            {pendingVideoPrompt && videoStatus === 'idle' && (
              <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1.5">
                <button
                  onClick={handleGenerateVideo}
                  className="flex items-center gap-2 px-4 py-2 text-[11px] font-mono font-bold tracking-wider transition-all hover:brightness-110 active:scale-95"
                  style={{ background: BC.gold, color: BC.bg, boxShadow: '0 0 20px rgba(212,168,83,0.3)' }}
                >
                  <Film className="w-3.5 h-3.5" />
                  GENERATE VIDEO
                </button>
                <span className="text-[8px] font-mono px-2" style={{ color: BC.textGhost }}>
                  Camera specs ready
                </span>
              </div>
            )}

            {/* Generating overlay */}
            {(scenes.some(s => s.status === 'generating') || videoStatus === 'generating') && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5" style={{ background: 'rgba(0,0,0,0.8)', border: `1px solid ${BC.border}` }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: BC.amber }} />
                <span className="text-[9px] font-mono" style={{ color: BC.amber }}>
                  {videoStatus === 'generating' ? `Generating video... ${videoProgress}%` : 'Generating scene...'}
                </span>
              </div>
            )}

            {/* Error state */}
            {videoStatus === 'error' && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5" style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
                <span className="text-[9px] font-mono" style={{ color: '#EF4444' }}>Generation failed</span>
                {pendingVideoPrompt && (
                  <button
                    onClick={() => { setVideoStatus('idle'); }}
                    className="text-[9px] font-mono px-2 py-0.5 ml-1"
                    style={{ border: `1px solid ${BC.border}`, color: BC.textSec }}
                  >
                    RETRY
                  </button>
                )}
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
                  setChatMessages(prev => [...prev, { role: 'illa', content: 'Rendering your timeline. I\'ll let you know when the export is ready.' }]);
                  try {
                    const idToken = user ? await user.getIdToken(true) : '';
                    const transMap: Record<string, { type: string; duration: number }> = {};
                    clipTransitions.forEach(t => {
                      transMap[`${t.fromClipId}-${t.toClipId}`] = { type: t.type, duration: 15 };
                    });
                    const res = await fetch('/api/broadcast/render', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
                      },
                      body: JSON.stringify({ clips: timelineClips, transitions: transMap, resolution }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({ error: 'Render request failed' }));
                      setChatMessages(prev => [...prev, { role: 'illa', content: `Render error: ${err.error || 'Service unavailable'}` }]);
                      return;
                    }
                    const data = await res.json();
                    setChatMessages(prev => [...prev, { role: 'illa', content: `Render ${data.status}: ${data.message}` }]);
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Unknown error';
                    setChatMessages(prev => [...prev, { role: 'illa', content: `Render failed: ${msg}. Let me know if you want to retry.` }]);
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
                  setChatMessages(prev => [...prev, { role: 'illa', content: 'Publishing to CDN... generating shareable link.' }]);
                  try {
                    const idToken = user ? await user.getIdToken(true) : '';
                    const res = await fetch('/api/broadcast/publish', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
                      },
                      body: JSON.stringify({ videoUrl: timelineClips[0]?.videoUrl || '', platform: 'cdn' }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({ error: 'Publish request failed' }));
                      setChatMessages(prev => [...prev, { role: 'illa', content: `Publish error: ${err.error || 'Service unavailable'}` }]);
                      return;
                    }
                    const data = await res.json();
                    setChatMessages(prev => [...prev, { role: 'illa', content: `Published. Share link: ${data.url || 'Generation in progress'}` }]);
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Unknown error';
                    setChatMessages(prev => [...prev, { role: 'illa', content: `Publish failed: ${msg}. Render the video first, then publish.` }]);
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

        {/* ── RIGHT SIDEBAR: Properties + Chat (stacks below on mobile) ── */}
        <div className="w-full md:w-96 shrink-0 flex flex-col overflow-hidden md:max-h-full max-h-[50vh]" style={{ borderLeft: `1px solid ${BC.border}`, background: BC.surface }}>
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
              <span className="text-[10px] font-semibold tracking-wide" style={{ color: BC.text, fontFamily: "'Inter', sans-serif" }}>Team Chat</span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => {
                    if (voiceEnabled && audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                    setVoiceEnabled(!voiceEnabled);
                  }}
                  className="p-0.5 hover:bg-white/[0.05] transition-colors"
                  title={voiceEnabled ? 'Mute ILLA' : 'Unmute ILLA'}
                >
                  {voiceEnabled
                    ? <Volume2 className="w-3 h-3" style={{ color: BC.amber }} />
                    : <VolumeX className="w-3 h-3" style={{ color: BC.textGhost }} />
                  }
                </button>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: BC.amber }} />
                <span className="text-[8px] font-mono" style={{ color: BC.textGhost }}>ILLA</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.role !== 'user' && (
                    <span className="text-[8px] font-mono font-bold tracking-wider mb-0.5" style={{ color: msg.role === 'illa' ? BC.amber : BC.gold }}>
                      {msg.role === 'illa' ? 'ILLA' : 'SYSTEM'}
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

            {/* Scenarios overlay */}
            {showScenarios && (
              <div className="px-2 py-2 space-y-1.5" style={{ borderTop: `1px solid ${BC.border}`, background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center justify-between px-1">
                  <span className="text-[8px] font-mono font-bold tracking-[0.15em] uppercase" style={{ color: BC.textGhost }}>Scenarios</span>
                  <button onClick={() => setShowScenarios(false)} className="text-[9px] font-mono hover:text-white/60 transition-colors" style={{ color: BC.textGhost }}>x</button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'media', label: 'Media', icon: '🎬' },
                    { id: 'slides', label: 'Slides', icon: '📊' },
                    { id: 'voice', label: 'Voice', icon: '🎙' },
                    { id: 'content', label: 'Content', icon: '✏️' },
                    { id: 'brand', label: 'Brand', icon: '🎨' },
                    { id: 'sports', label: 'Sports', icon: '🏆' },
                  ].map(tile => (
                    <button
                      key={tile.id}
                      onClick={() => {
                        setChatInput(prev => prev + `[${tile.label}] `);
                        setShowScenarios(false);
                      }}
                      className="flex flex-col items-center gap-0.5 py-1.5 hover:bg-white/[0.05] transition-colors"
                      style={{ border: `1px solid ${BC.border}` }}
                    >
                      <span className="text-[12px]">{tile.icon}</span>
                      <span className="text-[7px] font-mono" style={{ color: BC.textSec }}>{tile.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat input */}
            <div className="px-2 py-2 shrink-0" style={{ borderTop: `1px solid ${BC.border}` }}>
              {/* Grammar status indicator — sourced from chat-route SSE meta frame */}
              {grammarStatus && (
                <div
                  className="flex items-center gap-1 mb-1.5 px-1 text-[7px] font-mono uppercase tracking-wider"
                  style={{
                    color:
                      grammarStatus === 'failed'
                        ? '#f97316'
                        : grammarStatus === 'applied'
                          ? BC.gold
                          : BC.textGhost,
                  }}
                  title={grammarError ?? undefined}
                >
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }} />
                  Grammar: {grammarStatus}
                  {grammarStatus === 'failed' && grammarError && (
                    <span className="ml-1 opacity-60">— {grammarError.slice(0, 40)}</span>
                  )}
                </div>
              )}
              <div className="flex items-end gap-1.5">
                <button
                  onClick={() => setShowScenarios(!showScenarios)}
                  className="p-2 shrink-0 transition-colors hover:bg-white/[0.05]"
                  style={{ border: `1px solid ${BC.border}`, color: showScenarios ? BC.gold : BC.textGhost }}
                >
                  <Plus className="w-3 h-3" />
                </button>
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
                <span className="text-[7px] font-mono" style={{ color: BC.textGhost }}>
                  + scenarios &amp; plugins
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </BroadcastErrorBoundary>
  );
}
