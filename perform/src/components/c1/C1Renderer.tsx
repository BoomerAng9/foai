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
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F8FC',
  border: '#E2E6EE',
  borderStrong: '#CDD3DF',
  text: '#0A0E1A',
  textMuted: '#5A6478',
  textSubtle: '#8B94A8',
  navy: '#0B1E3F',
  navyDeep: '#06122A',
  red: '#D40028',
  redSoft: '#FFE9ED',
  green: '#00874C',
  greenSoft: '#E0F5EB',
  amber: '#DC6B19',
  amberSoft: '#FFF1E0',
  blue: '#0A66E8',
  blueSoft: '#E0EDFF',
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
    case 'ProfileTile':    return <C1ProfileTile {...(props as ProfileTileProps)} key={key} />;
    case 'Stats':          return <C1Stats {...(props as StatsProps)} key={key} />;
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
        background: TONE.surface,
        border: `1px solid ${TONE.border}`,
        boxShadow: '0 1px 3px rgba(10,14,26,0.04), 0 20px 50px rgba(10,14,26,0.08)',
      }}
    >
      {/* Top accent stripe — navy to red */}
      <div
        className="absolute top-0 left-0 right-0 h-1 pointer-events-none"
        style={{ background: `linear-gradient(90deg, ${TONE.navy} 0%, ${TONE.red} 100%)` }}
      />
      <div className="relative p-6 md:p-8 space-y-6">{renderNode(children)}</div>
    </div>
  );
}

interface HeaderProps { title?: string; subtitle?: string }
function C1Header({ title, subtitle }: HeaderProps) {
  return (
    <div className="pb-5 border-b" style={{ borderColor: TONE.border }}>
      <div
        className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-[0.2em] uppercase mb-3"
        style={{
          color: '#FFFFFF',
          background: TONE.red,
        }}
      >
        Per|Form Intel
      </div>
      <h2
        className="text-3xl md:text-4xl font-black leading-tight tracking-tight"
        style={{ color: TONE.text, fontFamily: "'Outfit', sans-serif" }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm mt-2 font-semibold" style={{ color: TONE.textMuted }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface InlineHeaderProps { heading?: string; subheading?: string }
function C1InlineHeader({ heading, subheading }: InlineHeaderProps) {
  return (
    <div className="mb-4">
      <div
        className="text-[10px] font-bold tracking-[0.22em] uppercase"
        style={{ color: TONE.red }}
      >
        {heading}
      </div>
      {subheading && (
        <div className="text-xs mt-0.5" style={{ color: TONE.textMuted }}>{subheading}</div>
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
      className="relative p-4 rounded-lg"
      style={{
        background: TONE.surfaceAlt,
        border: `1px solid ${TONE.border}`,
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
      <div className="text-[9px] font-bold tracking-[0.22em] uppercase" style={{ color: TONE.textMuted }}>
        {description}
      </div>
      <div className="flex items-end gap-2 mt-1">
        <span
          className="text-4xl font-black leading-none tabular-nums"
          style={{
            color: TONE.navy,
            fontFamily: "'Outfit', sans-serif",
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
  const tones = {
    success: { color: TONE.green, bg: TONE.greenSoft },
    danger:  { color: TONE.red,   bg: TONE.redSoft },
    warning: { color: TONE.amber, bg: TONE.amberSoft },
    info:    { color: TONE.blue,  bg: TONE.blueSoft },
    neutral: { color: TONE.textMuted, bg: TONE.surfaceAlt },
  }[variant];
  return (
    <span
      className="inline-block px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] uppercase rounded"
      style={{
        color: tones.color,
        background: tones.bg,
        border: `1px solid ${tones.color}33`,
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
    <span style={{ color: TONE.navy, display: 'inline-flex' }}>
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
              style={{ color: TONE.navy, fontFamily: "'Outfit', sans-serif" }}
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
    <div className="space-y-6">
      {sections.map((s, i) => (
        <div key={i}>
          {s.trigger && (
            <div className="mb-3">
              <div
                className="text-[10px] font-bold tracking-[0.22em] uppercase"
                style={{ color: TONE.red }}
              >
                {s.trigger}
              </div>
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
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: TONE.textMuted }}>
          {title}
        </div>
      )}
      <div className="space-y-4">
        {data.map((row, i) => {
          const pct = ((row.value || 0) / max) * 100;
          return (
            <div key={i}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: TONE.text }}>
                  {row.label}
                </span>
                <span className="text-2xl font-black tabular-nums" style={{ color: TONE.navy, fontFamily: "'Outfit', sans-serif" }}>
                  {row.value?.toFixed(1)}
                </span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden" style={{ background: '#EAEDF3' }}>
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${TONE.navy}, ${TONE.blue})`,
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
  const tones = {
    info:    { color: TONE.blue,  bg: TONE.blueSoft },
    warning: { color: TONE.amber, bg: TONE.amberSoft },
    danger:  { color: TONE.red,   bg: TONE.redSoft },
    success: { color: TONE.green, bg: TONE.greenSoft },
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
        background: tones.bg,
        border: `1px solid ${tones.color}40`,
      }}
    >
      <div className="flex items-start gap-3">
        <div style={{ color: tones.color }}>{icon}</div>
        <div className="flex-1 min-w-0">
          {title && (
            <div
              className="text-[11px] font-bold tracking-[0.18em] uppercase mb-1"
              style={{ color: tones.color }}
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

interface ProfileTileProps {
  title?: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  iconName?: string;
  badge?: unknown;
  child?: unknown;
}
function C1ProfileTile({ title, subtitle, description, imageUrl, iconName, badge, child }: ProfileTileProps) {
  return (
    <div
      className="relative p-5 rounded-xl flex items-center gap-4"
      style={{
        background: TONE.surfaceAlt,
        border: `1px solid ${TONE.border}`,
        boxShadow: `inset 0 0 30px rgba(34,211,238,0.04)`,
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={title || ''}
          className="w-14 h-14 rounded-full object-cover"
          style={{ border: `2px solid ${TONE.navy}` }}
        />
      ) : iconName ? (
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: '#FFFFFF',
            border: `2px solid ${TONE.navy}`,
          }}
        >
          <C1Icon name={iconName} size={26} />
        </div>
      ) : null}
      <div className="flex-1 min-w-0">
        {title && <div className="text-base font-bold" style={{ color: TONE.text }}>{title}</div>}
        {subtitle && (
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase mt-0.5" style={{ color: TONE.textMuted }}>
            {subtitle}
          </div>
        )}
        {description && (
          <div className="text-xs mt-1" style={{ color: TONE.textMuted }}>{description}</div>
        )}
        {child !== undefined && <div className="mt-2">{renderNode(child)}</div>}
      </div>
      {badge !== undefined && <div>{renderNode(badge)}</div>}
    </div>
  );
}

interface StatsProps {
  stats?: Array<{ label?: string; value?: string | number; change?: string; trend?: 'up' | 'down' | 'flat' }>;
}
function C1Stats({ stats = [] }: StatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {stats.map((s, i) => (
        <div
          key={i}
          className="p-4 rounded-lg"
          style={{
            background: TONE.surfaceAlt,
            border: `1px solid ${TONE.border}`,
          }}
        >
          {s.label && (
            <div className="text-[9px] font-bold tracking-[0.22em] uppercase" style={{ color: TONE.textMuted }}>
              {s.label}
            </div>
          )}
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className="text-3xl font-black tabular-nums"
              style={{
                color: TONE.navy,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {s.value}
            </span>
            {s.change && (
              <span
                className="text-xs font-bold"
                style={{ color: s.trend === 'down' ? TONE.red : s.trend === 'up' ? TONE.green : TONE.textMuted }}
              >
                {s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→'} {s.change}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
