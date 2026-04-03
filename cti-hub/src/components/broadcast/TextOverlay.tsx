'use client';

import { useState } from 'react';
import { Type, X } from 'lucide-react';

const BC = {
  border: 'rgba(255,255,255,0.08)',
  gold: '#D4A853',
  text: '#FFFFFF',
  textSec: 'rgba(255,255,255,0.6)',
  textGhost: 'rgba(255,255,255,0.3)',
};

export interface TextOverlayConfig {
  id: string;
  text: string;
  position: 'top' | 'center' | 'bottom' | 'lower-third';
  fontSize: number;
  color: string;
  bgColor: string;
  startTime: number;
  duration: number;
  fontWeight: 'normal' | 'bold';
  style: 'title' | 'lower-third' | 'watermark' | 'caption';
}

const PRESETS: { label: string; config: Partial<TextOverlayConfig> }[] = [
  { label: 'Title', config: { position: 'center', fontSize: 48, color: '#FFFFFF', bgColor: 'rgba(0,0,0,0.5)', fontWeight: 'bold', style: 'title' } },
  { label: 'Lower Third', config: { position: 'lower-third', fontSize: 24, color: '#FFFFFF', bgColor: 'rgba(212,168,83,0.9)', fontWeight: 'bold', style: 'lower-third' } },
  { label: 'Caption', config: { position: 'bottom', fontSize: 18, color: '#FFFFFF', bgColor: 'rgba(0,0,0,0.7)', fontWeight: 'normal', style: 'caption' } },
  { label: 'Watermark', config: { position: 'top', fontSize: 14, color: 'rgba(255,255,255,0.3)', bgColor: 'transparent', fontWeight: 'normal', style: 'watermark' } },
];

interface TextOverlayEditorProps {
  onAdd: (overlay: TextOverlayConfig) => void;
  onClose: () => void;
  currentTime: number;
}

export function TextOverlayEditor({ onAdd, onClose, currentTime }: TextOverlayEditorProps) {
  const [text, setText] = useState('');
  const [preset, setPreset] = useState(0);
  const [duration, setDuration] = useState(3);

  const handleAdd = () => {
    if (!text.trim()) return;
    const config = PRESETS[preset].config;
    onAdd({
      id: `text-${Date.now()}`,
      text: text.trim(),
      position: config.position || 'center',
      fontSize: config.fontSize || 24,
      color: config.color || '#FFFFFF',
      bgColor: config.bgColor || 'rgba(0,0,0,0.5)',
      startTime: currentTime,
      duration,
      fontWeight: config.fontWeight || 'normal',
      style: config.style || 'title',
    });
    setText('');
    onClose();
  };

  return (
    <div className="p-3 space-y-3" style={{ border: `1px solid ${BC.border}`, background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Type className="w-3 h-3" style={{ color: BC.gold }} />
          <span className="text-[10px] font-mono font-semibold" style={{ color: BC.text }}>Add Text</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-white/[0.05]">
          <X className="w-3 h-3" style={{ color: BC.textGhost }} />
        </button>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Enter text..."
        rows={2}
        className="w-full px-2 py-1.5 text-[11px] bg-transparent outline-none resize-none"
        style={{ border: `1px solid ${BC.border}`, color: BC.text, fontFamily: 'Inter, sans-serif' }}
      />

      <div>
        <span className="text-[8px] font-mono uppercase tracking-wider block mb-1" style={{ color: BC.textGhost }}>Style</span>
        <div className="flex gap-1">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPreset(i)}
              className="px-2 py-1 text-[9px] font-mono transition-all"
              style={{
                border: `1px solid ${preset === i ? BC.gold : BC.border}`,
                color: preset === i ? BC.gold : BC.textSec,
                background: preset === i ? 'rgba(212,168,83,0.1)' : 'transparent',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[8px] font-mono" style={{ color: BC.textGhost }}>Duration:</span>
        {[2, 3, 5, 8].map(d => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className="px-1.5 py-0.5 text-[9px] font-mono"
            style={{
              border: `1px solid ${duration === d ? BC.gold : BC.border}`,
              color: duration === d ? BC.gold : BC.textSec,
            }}
          >
            {d}s
          </button>
        ))}
      </div>

      <button
        onClick={handleAdd}
        disabled={!text.trim()}
        className="w-full py-1.5 text-[10px] font-mono font-bold tracking-wider transition-all disabled:opacity-30"
        style={{ background: BC.gold, color: '#0A0A0F' }}
      >
        ADD TO TIMELINE
      </button>
    </div>
  );
}
