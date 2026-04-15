'use client';

import { useState } from 'react';
import {
  TTS_PROVIDERS,
  STT_PROVIDERS,
  type ProviderOption,
  type VoiceProvider,
} from '@/lib/voice/pricing';

const T = {
  bg: 'var(--pf-bg)',
  surface: '#111118',
  card: '#161620',
  gold: '#D4A853',
  green: '#34D399',
  blue: '#60A5FA',
  purple: '#A78BFA',
  red: '#EF4444',
  text: 'rgba(255,255,255,0.9)',
  textMuted: 'rgba(255,255,255,0.5)',
  border: 'rgba(255,255,255,0.08)',
};

const BADGE_COLORS: Record<string, string> = {
  'fastest': T.green,
  'cheapest': T.gold,
  'best-quality': T.blue,
  'most-languages': T.purple,
};

interface Props {
  direction: 'tts' | 'stt';
  selected: VoiceProvider;
  onSelect: (provider: VoiceProvider) => void;
  isPPU: boolean;
  compact?: boolean;
}

function ProviderCard({
  provider,
  isSelected,
  onSelect,
  isPPU,
  compact,
}: {
  provider: ProviderOption;
  isSelected: boolean;
  onSelect: () => void;
  isPPU: boolean;
  compact?: boolean;
}) {
  const cost = isPPU ? provider.costPerMinPPU : provider.costPerMinPlan;
  const costLabel = cost < 0.01 ? `$${(cost * 1000).toFixed(1)}/1K min` : `$${cost.toFixed(3)}/min`;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-xl p-4 transition-all"
      style={{
        background: isSelected ? `${T.gold}10` : T.card,
        border: `2px solid ${isSelected ? T.gold : T.border}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: isSelected ? T.gold : T.text }}>
            {provider.name}
          </span>
          {provider.badge && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
              style={{
                background: `${BADGE_COLORS[provider.badge]}20`,
                color: BADGE_COLORS[provider.badge],
              }}
            >
              {provider.badge.replace('-', ' ')}
            </span>
          )}
        </div>
        <span className="text-xs font-mono" style={{ color: T.gold }}>
          #{provider.qualityRank}
        </span>
      </div>

      {!compact && (
        <>
          <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: T.textMuted }}>
            <span>Latency: <strong style={{ color: T.text }}>{provider.latencyMs}ms</strong></span>
            <span>Languages: <strong style={{ color: T.text }}>{provider.languages}</strong></span>
            <span>Cost: <strong style={{ color: T.gold }}>{costLabel}</strong></span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {provider.features.map((f, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.05)', color: T.textMuted }}
              >
                {f}
              </span>
            ))}
          </div>

          {isPPU && (
            <p className="text-[10px] mt-2" style={{ color: T.textMuted }}>
              PPU rate includes 30% markup over plan pricing
            </p>
          )}
        </>
      )}

      {compact && (
        <div className="flex items-center gap-3 text-xs" style={{ color: T.textMuted }}>
          <span>{provider.latencyMs}ms</span>
          <span style={{ color: T.gold }}>{costLabel}</span>
          {provider.badge && (
            <span style={{ color: BADGE_COLORS[provider.badge] }}>
              {provider.badge.replace('-', ' ')}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export default function VoiceProviderSwitcher({ direction, selected, onSelect, isPPU, compact }: Props) {
  const providers = direction === 'tts' ? TTS_PROVIDERS : STT_PROVIDERS;
  const [showAll, setShowAll] = useState(!compact);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textMuted }}>
          {direction === 'tts' ? 'Voice Output' : 'Voice Input'} Provider
        </h4>
        {compact && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[10px] underline"
            style={{ color: T.gold }}
          >
            {showAll ? 'Collapse' : 'Compare options'}
          </button>
        )}
      </div>

      {showAll ? (
        <div className="space-y-2">
          {providers.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              isSelected={selected === p.id}
              onSelect={() => onSelect(p.id)}
              isPPU={isPPU}
              compact={compact}
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="flex-1 text-center py-2 px-3 rounded-lg text-xs font-medium transition-all"
              style={{
                background: selected === p.id ? `${T.gold}15` : T.card,
                border: `1px solid ${selected === p.id ? T.gold : T.border}`,
                color: selected === p.id ? T.gold : T.textMuted,
              }}
            >
              {p.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
