'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Brain, Bot, Volume2 } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { LucReceipt } from './LucReceipt';
import type { Message } from '@/lib/chat/types';

function SpeakButton({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function handleSpeak() {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }

    setPlaying(true);
    try {
      // Strip markdown for cleaner speech
      const cleanText = text.replace(/[#*`\[\]()_~>|]/g, '').replace(/\n{2,}/g, '. ').slice(0, 4000);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
      });
      if (!res.ok) { setPlaying(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlaying(false); URL.revokeObjectURL(url); };
      audio.play();
    } catch {
      setPlaying(false);
    }
  }

  return (
    <button onClick={handleSpeak} className="p-1 hover:bg-bg-elevated transition-colors" title={playing ? 'Stop' : 'Listen'}>
      <Volume2 className={`w-3.5 h-3.5 ${playing ? 'text-accent animate-pulse' : 'text-fg-tertiary hover:text-fg-secondary'}`} />
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 bg-fg-tertiary"
          style={{ animation: 'typing-dot 1.4s infinite', animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

function ThinkingBlock({ text, streaming }: { text: string; streaming?: boolean }) {
  return (
    <div className="mb-3 border-l-2 border-amber-500/40 pl-3 py-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Brain className="w-3 h-3 text-amber-500" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500/80">Reasoning</span>
        {streaming && (
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
        )}
      </div>
      <p className="text-xs text-fg-tertiary italic leading-relaxed">{text}</p>
    </div>
  );
}

function AgentBadge({ agent }: { agent: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-2 bg-accent/10 border border-accent/20 text-[10px] font-mono uppercase tracking-wider text-accent">
      <Bot className="w-3 h-3" />
      <span>Routed to {agent}</span>
    </div>
  );
}

// Mermaid diagram renderer — loads mermaid.js on demand
function MermaidBlock({ code, id }: { code: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Dynamic import — only loads when needed
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, theme: 'dark', themeVariables: {
          primaryColor: '#E8A020', primaryTextColor: '#fff', primaryBorderColor: '#E8A020',
          lineColor: '#666', secondaryColor: '#1a1a2e', tertiaryColor: '#0A0A0F',
        }});
        const { svg: rendered } = await mermaid.render(`mermaid-${id}`, code);
        if (!cancelled) setSvg(rendered);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Diagram render failed');
      }
    })();
    return () => { cancelled = true; };
  }, [code, id]);

  if (error) return <div className="text-xs text-signal-error p-2 border border-signal-error/20 my-2">{error}</div>;
  if (!svg) return <div className="text-xs text-fg-ghost p-4 text-center my-2">Rendering diagram...</div>;
  return <div ref={ref} className="my-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}

// Chart data renderer — uses inline SVG bar chart (no dependency needed)
function ChartBlock({ data }: { data: { title?: string; type?: string; labels: string[]; values: number[]; color?: string } }) {
  const max = Math.max(...data.values, 1);
  const barColor = data.color || '#E8A020';

  return (
    <div className="my-3 p-4 bg-bg-elevated border border-border">
      {data.title && <p className="font-mono text-[10px] font-bold mb-3 text-fg-secondary">{data.title}</p>}
      <div className="flex items-end gap-2 h-32">
        {data.labels.map((label, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative" style={{ height: `${(data.values[i] / max) * 100}%`, minHeight: 4 }}>
              <div className="absolute inset-0 rounded-t-sm transition-all" style={{ background: barColor, opacity: 0.8 }} />
            </div>
            <span className="font-mono text-[8px] text-fg-ghost truncate max-w-full">{label}</span>
            <span className="font-mono text-[9px] text-fg-secondary font-bold">{data.values[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderContent(content: string) {
  // Split on code blocks (```mermaid, ```chart) and image patterns
  const blocks = content.split(/(```(?:mermaid|chart)[\s\S]*?```|!\[.*?\]\(.*?\))/g);

  return blocks.map((part, i) => {
    // Mermaid diagram
    const mermaidMatch = part.match(/^```mermaid\n([\s\S]*?)```$/);
    if (mermaidMatch) {
      return <MermaidBlock key={i} code={mermaidMatch[1].trim()} id={String(i)} />;
    }

    // Chart JSON
    const chartMatch = part.match(/^```chart\n([\s\S]*?)```$/);
    if (chartMatch) {
      try {
        const chartData = JSON.parse(chartMatch[1].trim());
        if (chartData.labels && chartData.values) {
          return <ChartBlock key={i} data={chartData} />;
        }
      } catch { /* not valid JSON — render as text */ }
      return <span key={i}>{part}</span>;
    }

    // Image
    const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const src = imgMatch[2];
      if (!src.startsWith('data:') && !src.startsWith('https://') && !src.startsWith('http://')) {
        return <span key={i}>{part}</span>;
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={src} alt={imgMatch[1]}
          className="max-w-full max-h-[400px] object-contain my-3 border border-border" />
      );
    }

    // Plain text
    return <span key={i}>{part}</span>;
  });
}

export function MessageBubble({ msg }: { msg: Message }) {
  return (
    <div className="group animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        {msg.role === 'acheevy' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={msg.activeAgent && msg.activeAgent !== 'ACHEEVY' ? '/boomer-ang-icon.png' : '/acheevy-helmet.png'}
            alt=""
            className="w-5 h-5 object-contain"
          />
        )}
        <span className="label-mono">
          {msg.role === 'user' ? 'YOU' : msg.activeAgent || 'ACHEEVY'}
        </span>
        {msg.streaming && <TypingIndicator />}
        <div className="flex-1" />
        {!msg.streaming && msg.role === 'acheevy' && (
          <>
            <SpeakButton text={msg.content} />
            <CopyButton text={msg.content} />
          </>
        )}
      </div>

      {msg.attachments && msg.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {msg.attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-bg-elevated border border-border text-[10px] font-mono">
              {att.type.startsWith('image/') ? (
                att.url ? (
                  <img src={att.url} alt={att.name} className="w-8 h-8 object-cover" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-fg-tertiary" />
                )
              ) : (
                <FileText className="w-3.5 h-3.5 text-fg-tertiary" />
              )}
              <span className="text-fg-secondary truncate max-w-[120px]">{att.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Thinking / Reasoning block */}
      {msg.thinking && msg.role === 'acheevy' && (
        <ThinkingBlock text={msg.thinking} streaming={msg.streaming && !msg.content} />
      )}

      {/* Agent routing badge */}
      {msg.activeAgent && msg.role === 'acheevy' && (
        <AgentBadge agent={msg.activeAgent} />
      )}

      <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
        msg.role === 'user' ? 'text-fg' : 'text-fg-secondary'
      }`}>
        {renderContent(msg.content)}
        {msg.streaming && msg.content && (
          <span className="inline-block w-1.5 h-4 bg-fg ml-0.5 align-text-bottom animate-cursor-blink" />
        )}
      </div>

      {msg.metadata && !msg.streaming && msg.role === 'acheevy' && (
        <LucReceipt metadata={msg.metadata} />
      )}
    </div>
  );
}
