'use client';

import { useState, useEffect } from 'react';

const BC = {
  bg: '#0A0A0F',
  border: 'rgba(255,255,255,0.08)',
  gold: '#D4A853',
  amber: '#FFB300',
  text: '#FFFFFF',
  textSec: 'rgba(255,255,255,0.6)',
  textGhost: 'rgba(255,255,255,0.3)',
};

export interface CameraSpec {
  body: string;
  lens: string;
  aperture: string;
  focalLength: string;
  movement: string;
  profile: string;
  lighting: string;
  aspect: string;
  duration: string;
}

const DEFAULTS: CameraSpec = {
  body: 'Cinema',
  lens: '50mm',
  aperture: 'f/2.8',
  focalLength: '50mm',
  movement: 'Static',
  profile: 'ARRI',
  lighting: 'Natural',
  aspect: '16:9',
  duration: '5s',
};

const OPTIONS = {
  body: [
    { id: 'Cinema', label: 'Cinema', icon: '🎬' },
    { id: 'DSLR', label: 'DSLR', icon: '📷' },
    { id: 'Mirrorless', label: 'Mirrorless', icon: '📸' },
    { id: 'Drone', label: 'Drone', icon: '🛸' },
    { id: 'Action', label: 'Action', icon: '⚡' },
    { id: 'Phone', label: 'Phone', icon: '📱' },
  ],
  lens: [
    { id: '14mm', label: '14mm Ultra Wide' },
    { id: '24mm', label: '24mm Wide' },
    { id: '35mm', label: '35mm Standard' },
    { id: '50mm', label: '50mm Normal' },
    { id: '85mm', label: '85mm Portrait' },
    { id: '135mm', label: '135mm Tele' },
    { id: '200mm', label: '200mm Long' },
    { id: 'Anamorphic', label: 'Anamorphic' },
    { id: 'Macro', label: 'Macro' },
    { id: 'Tilt-Shift', label: 'Tilt-Shift' },
    { id: 'Fisheye', label: 'Fisheye' },
  ],
  aperture: ['f/1.4', 'f/2.0', 'f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11'],
  movement: [
    'Static', 'Pan Left', 'Pan Right', 'Tilt Up', 'Tilt Down',
    'Dolly In', 'Dolly Out', 'Tracking', 'Crane Up', 'Crane Down',
    'Orbit', 'Handheld', 'Steadicam', 'Zoom In', 'Zoom Out',
    'Whip Pan', 'Dutch Angle', 'Pull Focus', 'Push In', 'Reveal',
  ],
  profile: [
    { id: 'ARRI', label: 'ARRI Alexa 35', sub: 'LogC4' },
    { id: 'RED', label: 'RED V-Raptor', sub: 'IPP2' },
    { id: 'Sony', label: 'Sony Venice 2', sub: 'S-Log3' },
    { id: 'Panavision', label: 'Panavision DXL2', sub: 'Light Iron' },
    { id: '16mm', label: '16mm Film', sub: 'Grain + Gate Weave' },
    { id: 'Super8', label: 'Super 8', sub: 'Heavy Grain' },
    { id: 'VHS', label: 'VHS', sub: 'Analog Artifacts' },
    { id: 'Kodak', label: 'Kodak 35mm', sub: 'Vision3 500T' },
  ],
  lighting: [
    'Natural', 'Golden Hour', 'Blue Hour', 'Overcast', 'Studio',
    'Rim Light', 'Neon', 'Moonlight', 'Stadium', 'Candlelight',
    'Harsh Noon', 'Window Light', 'Silhouette', 'High Key', 'Low Key',
  ],
  aspect: ['16:9', '2.39:1', '4:3', '1:1', '9:16', '21:9'],
  duration: ['3s', '5s', '8s', '10s'],
};

function SelectorGroup({ label, options, selected, onSelect, compact = false }: {
  label: string;
  options: (string | { id: string; label: string; sub?: string; icon?: string })[];
  selected: string;
  onSelect: (val: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="mb-3">
      <span className="text-[8px] font-mono uppercase tracking-[0.15em] block mb-1.5" style={{ color: BC.textGhost }}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map(opt => {
          const id = typeof opt === 'string' ? opt : opt.id;
          const label = typeof opt === 'string' ? opt : (opt.icon ? `${opt.icon} ${opt.label}` : opt.label);
          const isActive = selected === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`px-2 py-1 text-[9px] font-mono transition-all ${compact ? 'px-1.5' : ''}`}
              style={{
                border: `1px solid ${isActive ? BC.gold : BC.border}`,
                background: isActive ? 'rgba(212,168,83,0.15)' : 'transparent',
                color: isActive ? BC.gold : BC.textSec,
              }}
            >
              {typeof opt === 'string' ? opt : opt.icon || ''} {typeof opt === 'string' ? '' : opt.label}
              {typeof opt !== 'string' && opt.sub && isActive && (
                <span className="block text-[7px] mt-0.5" style={{ color: BC.textGhost }}>{opt.sub}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface CameraMenuProps {
  spec: CameraSpec;
  onChange: (spec: CameraSpec) => void;
}

export function CameraMenu({ spec, onChange }: CameraMenuProps) {
  const update = (key: keyof CameraSpec, val: string) => {
    onChange({ ...spec, [key]: val });
  };

  return (
    <div className="space-y-1">
      <SelectorGroup label="Camera Body" options={OPTIONS.body} selected={spec.body} onSelect={v => update('body', v)} />
      <SelectorGroup label="Lens" options={OPTIONS.lens} selected={spec.lens} onSelect={v => { update('lens', v); update('focalLength', v); }} />
      <SelectorGroup label="Aperture" options={OPTIONS.aperture} selected={spec.aperture} onSelect={v => update('aperture', v)} />
      <SelectorGroup label="Camera Movement" options={OPTIONS.movement} selected={spec.movement} onSelect={v => update('movement', v)} compact />
      <SelectorGroup label="Film Profile" options={OPTIONS.profile} selected={spec.profile} onSelect={v => update('profile', v)} />
      <SelectorGroup label="Lighting" options={OPTIONS.lighting} selected={spec.lighting} onSelect={v => update('lighting', v)} compact />
      <SelectorGroup label="Aspect Ratio" options={OPTIONS.aspect} selected={spec.aspect} onSelect={v => update('aspect', v)} />
      <SelectorGroup label="Duration" options={OPTIONS.duration} selected={spec.duration} onSelect={v => update('duration', v)} />

      {/* Live spec summary */}
      <div className="mt-3 p-2" style={{ border: `1px solid ${BC.border}`, background: 'rgba(212,168,83,0.05)' }}>
        <span className="text-[8px] font-mono uppercase tracking-wider block mb-1" style={{ color: BC.gold }}>Active Spec</span>
        <span className="text-[9px] font-mono leading-relaxed block" style={{ color: BC.textSec }}>
          {spec.body} · {spec.lens} · {spec.aperture} · {spec.movement} · {spec.profile} · {spec.lighting} · {spec.aspect} · {spec.duration}
        </span>
      </div>
    </div>
  );
}

/**
 * Parse [CAMERA_SPEC] blocks from Iller_Ang's chat response
 */
export function parseCameraSpec(text: string): Partial<CameraSpec> | null {
  const match = text.match(/\[CAMERA_SPEC\]([\s\S]*?)\[\/CAMERA_SPEC\]/);
  if (!match) return null;

  const block = match[1];
  const spec: Partial<CameraSpec> = {};

  const fieldMap: Record<string, keyof CameraSpec> = {
    lens: 'lens',
    aperture: 'aperture',
    movement: 'movement',
    profile: 'profile',
    lighting: 'lighting',
    aspect: 'aspect',
    duration: 'duration',
    camera: 'movement',
    body: 'body',
    focal: 'focalLength',
  };

  for (const line of block.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const val = line.slice(colonIdx + 1).trim();
    const mappedKey = fieldMap[key];
    if (mappedKey && val) {
      spec[mappedKey] = val;
    }
  }

  return Object.keys(spec).length > 0 ? spec : null;
}

export { DEFAULTS as CAMERA_DEFAULTS };
