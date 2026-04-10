'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Volume2, Shield } from 'lucide-react';

interface VoiceInfo {
  id: string;
  name: string;
  desc: string;
  gender: 'male' | 'female';
}

interface AgentInfo {
  voice: string;
  gender: 'male' | 'female';
  label: string;
  role: string;
  allowedVoices: string[];
  skills: string[];
}

interface VoicePickerProps {
  /** Currently active agent (lowercase key, e.g. 'acheevy') */
  activeAgent: string;
  onAgentChange: (agentKey: string) => void;
  onVoiceChange: (voiceId: string) => void;
}

export function VoicePicker({ activeAgent, onAgentChange, onVoiceChange }: VoicePickerProps) {
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [agents, setAgents] = useState<Record<string, AgentInfo>>({});
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'voices' }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.voices) setVoices(d.voices);
        if (d.agents) setAgents(d.agents);
        if (d.agents?.[activeAgent]) setSelectedVoice(d.agents[activeAgent].voice);
      })
      .catch(() => {});
  }, [activeAgent]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const agent = agents[activeAgent];
  const allowedVoices = agent
    ? voices.filter(v => agent.allowedVoices.includes(v.id))
    : voices;

  function selectAgent(key: string) {
    const a = agents[key];
    if (a) {
      onAgentChange(key);
      setSelectedVoice(a.voice);
      onVoiceChange(a.voice);
    }
    setOpen(false);
  }

  function selectVoice(voiceId: string) {
    setSelectedVoice(voiceId);
    onVoiceChange(voiceId);
  }

  const agentEntries = Object.entries(agents);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono uppercase tracking-wider bg-bg-elevated border border-border hover:border-accent/50 transition-colors"
      >
        <Volume2 className="w-3 h-3 text-accent" />
        <span className="text-fg-secondary">{agent?.label || 'ACHEEVY'}</span>
        <span className="text-fg-ghost">·</span>
        <span className="text-fg-ghost">{voices.find(v => v.id === selectedVoice)?.name || '...'}</span>
        <ChevronDown className="w-3 h-3 text-fg-ghost" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-72 bg-bg-surface border border-border shadow-xl z-50 max-h-[400px] overflow-y-auto">
          {/* Agent selector */}
          <div className="p-2 border-b border-border">
            <p className="text-[9px] font-mono uppercase tracking-wider text-fg-ghost mb-1.5">Active Agent</p>
            <div className="flex flex-wrap gap-1">
              {agentEntries.map(([key, a]) => (
                <button
                  key={key}
                  onClick={() => selectAgent(key)}
                  className={`px-2 py-1 text-[10px] font-mono transition-colors ${
                    key === activeAgent
                      ? 'bg-accent text-bg'
                      : 'bg-bg-elevated text-fg-secondary hover:bg-bg-elevated/80'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Agent info card */}
          {agent && (
            <div className="p-2 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-fg">{agent.label}</span>
                <span className="text-[9px] font-mono text-fg-ghost">{agent.role}</span>
              </div>
              <div className="flex items-center gap-1 mb-1.5">
                <Shield className="w-3 h-3 text-fg-ghost" />
                <span className="text-[9px] font-mono text-fg-ghost">
                  Gender-locked: {agent.gender} voices only
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {agent.skills.map(s => (
                  <span key={s} className="px-1.5 py-0.5 text-[9px] font-mono bg-accent/10 text-accent border border-accent/20">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Voice options — gender-locked to agent */}
          <div className="p-2">
            <p className="text-[9px] font-mono uppercase tracking-wider text-fg-ghost mb-1.5">
              Voice — {agent?.gender || 'all'} options
            </p>
            <div className="space-y-1">
              {allowedVoices.map(v => (
                <button
                  key={v.id}
                  onClick={() => selectVoice(v.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors ${
                    v.id === selectedVoice
                      ? 'bg-accent/10 border border-accent/30'
                      : 'hover:bg-bg-elevated border border-transparent'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${v.id === selectedVoice ? 'bg-accent' : 'bg-fg-ghost'}`} />
                  <span className="text-xs font-semibold text-fg">{v.name}</span>
                  <span className="text-[10px] text-fg-ghost flex-1">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
