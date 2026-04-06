'use client';

/**
 * C1 Spec Renderer — Per|Form themed
 * =====================================
 * Renders the JSON component tree returned by Thesys C1 using our own
 * broadcast-grade primitives. NO @thesysai/genui-sdk needed.
 *
 * Supports the Crayon UI components C1 emits:
 *   Card, Header, MiniCardBlock, MiniCard, DataTile, Tag, Icon,
 *   InlineHeader, List, SectionBlock, BarChartV2, CalloutV2,
 *   TagBlock, TextContent
 *
 * Theme: matches the NURD card energy — dark surface, cyan + orange
 * neon accents, gold value text, gaming-card framing.
 */

import React from 'react';
import {
  Trophy, Activity, Brain, Zap, Shield, AlertTriangle,
  Target, Award, TrendingUp, TrendingDown, Heart, Gamepad2,
  Star, Flame, Crown, Sparkles, Info,
} from 'lucide-react';

interface C1Node {
  component?: string;
  props?: Record<string, unknown>;
}

const TONE = {
  bg: '#070C16',
  surface: '#0E1525',
  surfaceAlt: '#141C2F',
  border: '#1F2A45',
  borderGlow: '#22D3EE',
  borderAccent: '#F97316',
  text: '#FFFFFF',
  textMuted: '#A8B2C8',
  textSubtle: '#6B7589',
  cyan: '#22D3EE',
  cyanGlow: 'rgba(34,211,238,0.4)',
  orange: '#F97316',
  orangeGlow: 'rgba(249,115,22,0.4)',
  gold: '#FFD700',
  goldDim: '#D4A853',
  green: '#34D399',
  red: '#F87171',
  amber: '#FBBF24',
};

/* ── Top-level entry point ── */
export function C1Renderer({ spec }: { spec: unknown }) {
  if (!spec || typeof spec !== 'object') {
    return <div className="p-6 text-red-400 text-sm">Invalid C1 spec</div>;
  }
  // Root has shape { component: { component: "Card", props: {...} } }
  const root = (spec as { component?: C1Node }).component;
  if (!root) return null;
  return <div className="c1-root">{renderNode(root)}</div>;
}

/* ── Recursive node renderer ── */
function renderNode(node: unknown, key?: React.Key): React.ReactNode {
  if (node === null || node === undefined) return null;
  if (typeof node === 'string' || typeof node === 'number') return node;
  if (Array.isArray(node)) {
    return node.map((n, i) => <React.Fragment key={i}>{renderNode(n, i)}</React.Fragment>);
  }
  if (typeof node !== 'object') return null;

  const n = node as C1Node;
  const Comp = n.component;
  const props = n.props || {};

  switch (Comp) {
    case 'Card':           return <C1Card {...(props as CardProps)} key={key} />;
    case 'Header':         return <C1Header {...(props as HeaderProps)} key={key} />;
    case 'InlineHeader':   return <C1InlineHeader {...(props as InlineHeaderProps)} key={key} />;
    case 'MiniCardBlock':  return <C1MiniCardBlock {...(props as MiniCardBlockProps)} key={key} />;
    case 'MiniCard':       return <C1MiniCard {...(props as MiniCardProps)} key={key} />;
    case 'DataTile':       return <C1DataTile {...(props as DataTileProps)} key={key} />;
    case 'Tag':            return <C1Tag {...(props as TagProps)} key={key} />;
    case 'TagBlock':       return <C1TagBlock {...(props as TagBlockProps)} key={key} />;
    case 'Icon':           return <C1Icon {...(props as IconProps)} key={key} />;
    case 'List':           return <C1List {...(props as ListProps)} key={key} />;
    case 'SectionBlock':   return <C1SectionBlock {...(props as SectionBlockProps)} key={key} />;
    case 'BarChartV2':     return <C1BarChart {...(props as BarChartProps)} key={key} />;
    case 'CalloutV2':      return <C1Callout {...(props as CalloutProps)} key={key} />;
    case 'TextContent':    return <C1TextContent {...(props as TextContentProps)} key={key} />;
    default:
      // Fallback: render children if any
      if (props.children) return <>{renderNode(props.children, key)}</>;
      return null;
  }
}

/* ═══════ Themed Primitives ═══════ */

interface CardProps { variant?: string; children?: unknown }
function C1Card({ children }: CardProps) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${TONE.surface} 0%, ${TONE.bg} 100%)`,
        border: `1px solid ${TONE.border}`,
        boxShadow: `0 0 0 1px ${TONE.cyan}33, 0 20px 60px rgba(0,0,0,0.6), inset 0 0 80px rgba(34,211,238,0.04)`,
      }}
    >
      {/* corner brackets — gaming card energy */}
      <CornerBrackets />
      <div className="relative p-6 space-y-5">{renderNode(children)}</div>
    </div>
  );
}

function CornerBrackets() {
  const corner = (style: React.CSSProperties) => (
    <div
      className="absolute w-5 h-5 pointer-events-none"
      style={{
        ...style,
        borderColor: TONE.cyan,
        boxShadow: `0 0 8px ${TONE.cyanGlow}`,
      }}
    />
  );
  return (
    <>
      {corner({ top: 8, left: 8, borderTop: '2px solid', borderLeft: '2px solid' })}
      {corner({ top: 8, right: 8, borderTop: '2px solid', borderRight: '2px solid' })}
      {corner({ bottom: 8, left: 8, borderBottom: '2px solid', borderLeft: '2px solid' })}
      {corner({ bottom: 8, right: 8, borderBottom: '2px solid', borderRight: '2px solid' })}
    </>
  );
}

interface HeaderProps { title?: string; subtitle?: string }
function C1Header({ title, subtitle }: HeaderProps) {
  return (
    <div className="pb-4 border-b" style={{ borderColor: TONE.border }}>
      <div
        className="inline-block px-3 py-1 rounded-md text-[10px] font-bold tracking-[0.22em] uppercase mb-3"
        style={{
          color: TONE.orange,
          background: `${TONE.orange}15`,
          border: `1px solid ${TONE.orange}40`,
          boxShadow: `0 0 12px ${TONE.orangeGlow}`,
        }}
      >
        ◢ Per|Form Intel
      </div>
      <h2
        className="text-3xl md:text-4xl font-black leading-tight tracking-tight"
        style={{ color: TONE.text, fontFamily: "'Outfit', sans-serif" }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm mt-1" style={{ color: TONE.cyan, fontFamily: "'JetBrains Mono', monospace" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface InlineHeaderProps { heading?: string; subheading?: string }
function C1InlineHeader({ heading, subheading }: InlineHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${TONE.cyan}, transparent)` }} />
      <div
        className="text-[10px] font-bold tracking-[0.25em] uppercase whitespace-nowrap"
        style={{ color: TONE.cyan, fontFamily: "'JetBrains Mono', monospace" }}
      >
        {heading}
      </div>
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${TONE.cyan})` }} />
      {subheading && (
        <div className="text-[10px] opacity-60" style={{ color: TONE.textMuted }}>{subheading}</div>
      )}
    </div>
  );
}

interface MiniCardBlockProps { children?: unknown }
function C1MiniCardBlock({ children }: MiniCardBlockProps) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{renderNode(children)}</div>;
}

interface MiniCardProps { lhs?: unknown; rhs?: unknown; title?: string; description?: string }
function C1MiniCard({ lhs, rhs, title, description }: MiniCardProps) {
  return (
    <div
      className="relative p-4 rounded-xl"
      style={{
        background: TONE.surfaceAlt,
        border: `1px solid ${TONE.border}`,
        boxShadow: `inset 0 0 30px rgba(34,211,238,0.04)`,
      }}
    >
      {(title || description) && (
        <div className="mb-2">
          {title && <div className="text-sm font-bold" style={{ color: TONE.text }}>{title}</div>}
          {description && <div className="text-[10px]" style={{ color: TONE.textSubtle }}>{description}</div>}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        {lhs !== undefined && <div className="flex-1">{renderNode(lhs)}</div>}
        {rhs !== undefined && <div>{renderNode(rhs)}</div>}
      </div>
    </div>
  );
}

interface DataTileProps { amount?: string | number; description?: string; child?: unknown }
function C1DataTile({ amount, description, child }: DataTileProps) {
  return (
    <div>
      <div className="text-[9px] font-bold tracking-[0.22em] uppercase" style={{ color: TONE.cyan }}>
        {description}
      </div>
      <div className="flex items-end gap-2 mt-1">
        <span
          className="text-4xl font-black leading-none tabular-nums"
          style={{
            color: TONE.gold,
            fontFamily: "'Outfit', sans-serif",
            textShadow: `0 0 18px rgba(255,215,0,0.4)`,
          }}
        >
          {amount}
        </span>
        {child !== undefined && <div className="mb-1">{renderNode(child)}</div>}
      </div>
    </div>
  );
}

interface TagProps { text?: string; variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral' }
function C1Tag({ text, variant = 'neutral' }: TagProps) {
  const color = {
    success: TONE.green,
    danger: TONE.red,
    warning: TONE.amber,
    info: TONE.cyan,
    neutral: TONE.textMuted,
  }[variant];
  return (
    <span
      className="inline-block px-2 py-0.5 text-[10px] font-bold tracking-[0.15em] uppercase rounded"
      style={{
        color,
        background: `${color}18`,
        border: `1px solid ${color}50`,
      }}
    >
      {text}
    </span>
  );
}

interface TagBlockProps { tags?: Array<{ text: string; variant?: TagProps['variant'] }> }
function C1TagBlock({ tags = [] }: TagBlockProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t, i) => <C1Tag key={i} {...t} />)}
    </div>
  );
}

interface IconProps { name?: string; category?: string; size?: number }
function C1Icon({ name, size = 18 }: IconProps) {
  const icon = ICON_MAP[name || ''] || <Sparkles size={size} />;
  return (
    <span style={{ color: TONE.cyan, display: 'inline-flex' }}>
      {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size })}
    </span>
  );
}

const ICON_MAP: Record<string, React.ReactElement> = {
  trophy: <Trophy />,
  award: <Award />,
  star: <Star />,
  crown: <Crown />,
  flame: <Flame />,
  'gamepad-2': <Gamepad2 />,
  activity: <Activity />,
  brain: <Brain />,
  zap: <Zap />,
  shield: <Shield />,
  heart: <Heart />,
  target: <Target />,
  'trending-up': <TrendingUp />,
  'trending-down': <TrendingDown />,
  'alert-triangle': <AlertTriangle />,
  info: <Info />,
};

interface ListItem {
  title?: string;
  subtitle?: string;
  iconName?: string;
  amount?: string | number;
  trailing?: unknown;
}
interface ListProps { variant?: string; items?: ListItem[] }
function C1List({ items = [] }: ListProps) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{ background: TONE.surfaceAlt, border: `1px solid ${TONE.border}` }}
        >
          {item.iconName && <C1Icon name={item.iconName} size={20} />}
          <div className="flex-1 min-w-0">
            {item.title && <div className="font-bold text-sm" style={{ color: TONE.text }}>{item.title}</div>}
            {item.subtitle && <div className="text-xs" style={{ color: TONE.textMuted }}>{item.subtitle}</div>}
          </div>
          {item.amount !== undefined && (
            <span
              className="text-2xl font-black tabular-nums"
              style={{ color: TONE.gold, fontFamily: "'Outfit', sans-serif" }}
            >
              {item.amount}
            </span>
          )}
          {item.trailing !== undefined && <div>{renderNode(item.trailing)}</div>}
        </div>
      ))}
    </div>
  );
}

interface Section { value?: string; trigger?: string; content?: unknown }
interface SectionBlockProps { sections?: Section[]; isFoldable?: boolean }
function C1SectionBlock({ sections = [] }: SectionBlockProps) {
  return (
    <div className="space-y-5">
      {sections.map((s, i) => (
        <div key={i}>
          {s.trigger && (
            <div className="flex items-center gap-3 mb-3">
              <div
                className="text-[10px] font-bold tracking-[0.22em] uppercase"
                style={{ color: TONE.orange, fontFamily: "'JetBrains Mono', monospace" }}
              >
                ◢ {s.trigger}
              </div>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${TONE.orange}80, transparent)` }} />
            </div>
          )}
          <div>{renderNode(s.content)}</div>
        </div>
      ))}
    </div>
  );
}

interface BarChartProps {
  data?: Array<{ label?: string; value?: number; secondaryValue?: number }>;
  title?: string;
}
function C1BarChart({ data = [], title }: BarChartProps) {
  const max = Math.max(100, ...data.map(d => Math.max(d.value || 0, d.secondaryValue || 0)));
  return (
    <div>
      {title && (
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: TONE.cyan }}>
          {title}
        </div>
      )}
      <div className="space-y-3">
        {data.map((row, i) => {
          const pct = ((row.value || 0) / max) * 100;
          const ghostPct = row.secondaryValue ? (row.secondaryValue / max) * 100 : 0;
          return (
            <div key={i}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: TONE.text }}>
                  {row.label}
                </span>
                <span className="text-lg font-black tabular-nums" style={{ color: TONE.gold, fontFamily: "'Outfit', sans-serif" }}>
                  {row.value?.toFixed(1)}
                </span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden" style={{ background: TONE.border }}>
                {row.secondaryValue && (
                  <div
                    className="absolute top-0 left-0 h-full"
                    style={{
                      width: `${ghostPct}%`,
                      background: `repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 6px)`,
                    }}
                  />
                )}
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${TONE.cyan}, ${TONE.gold})`,
                    boxShadow: `0 0 12px ${TONE.cyanGlow}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CalloutProps {
  variant?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  description?: string;
  children?: unknown;
}
function C1Callout({ variant = 'info', title, description, children }: CalloutProps) {
  const color = {
    info: TONE.cyan,
    warning: TONE.amber,
    danger: TONE.red,
    success: TONE.green,
  }[variant];
  const icon = {
    info: <Info size={20} />,
    warning: <AlertTriangle size={20} />,
    danger: <AlertTriangle size={20} />,
    success: <Shield size={20} />,
  }[variant];

  return (
    <div
      className="relative p-5 rounded-xl"
      style={{
        background: `${color}0D`,
        border: `1px solid ${color}50`,
        boxShadow: `0 0 20px ${color}20, inset 0 0 30px ${color}08`,
      }}
    >
      <div className="flex items-start gap-3">
        <div style={{ color }}>{icon}</div>
        <div className="flex-1 min-w-0">
          {title && (
            <div
              className="text-[11px] font-bold tracking-[0.18em] uppercase mb-1"
              style={{ color, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {title}
            </div>
          )}
          {description && (
            <div className="text-sm leading-relaxed" style={{ color: TONE.text }}>
              {description}
            </div>
          )}
          {children !== undefined && <div className="mt-3">{renderNode(children)}</div>}
        </div>
      </div>
    </div>
  );
}

interface TextContentProps { text?: string; content?: string; variant?: string }
function C1TextContent({ text, content, variant }: TextContentProps) {
  const value = text || content || '';
  if (variant === 'caption') {
    return <p className="text-[11px]" style={{ color: TONE.textSubtle }}>{value}</p>;
  }
  return (
    <p className="text-sm leading-relaxed" style={{ color: TONE.text }}>
      {value}
    </p>
  );
}
