'use client';

import { getTeamColors } from '@/lib/helmets/team-colors';
import { getFacemaskForPosition, FacemaskType } from '@/lib/helmets/facemasks';

interface PlayerHelmetProps {
  school: string;
  position: string;
  size?: number;
}

function renderFacemask(type: FacemaskType): React.ReactNode {
  const barColor = '#555';
  const barStroke = 2.5;

  if (type === 'open') {
    // 2-bar open facemask — QB visibility
    return (
      <g>
        {/* Top bar */}
        <path d="M28,42 Q18,44 12,52" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
        {/* Bottom bar */}
        <path d="M28,50 Q20,52 14,58" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
        {/* Vertical connector */}
        <path d="M12,52 L14,58" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
        {/* Chin guard */}
        <path d="M14,58 Q16,64 24,66" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
      </g>
    );
  }

  if (type === 'skill') {
    // 3-bar skill facemask — WR/CB/RB/LB
    return (
      <g>
        <path d="M28,40 Q16,42 10,50" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
        <path d="M28,47 Q18,48 12,54" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
        <path d="M28,54 Q20,55 14,60" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
        {/* Vertical connector */}
        <path d="M10,50 L12,54 L14,60" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
        {/* Chin guard */}
        <path d="M14,60 Q18,66 26,68" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
      </g>
    );
  }

  // cage — OL/DL full cage
  return (
    <g>
      <path d="M28,38 Q14,40 8,48" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
      <path d="M28,43 Q16,44 10,51" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
      <path d="M28,48 Q18,49 12,55" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
      <path d="M28,53 Q20,54 14,59" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
      <path d="M28,58 Q22,59 16,63" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
      {/* Vertical connector */}
      <path d="M8,48 L10,51 L12,55 L14,59 L16,63" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
      {/* Chin guard */}
      <path d="M16,63 Q20,68 28,70" stroke={barColor} strokeWidth={barStroke} fill="none" strokeLinecap="round" />
    </g>
  );
}

export function PlayerHelmet({ school, position, size = 120 }: PlayerHelmetProps) {
  const colors = getTeamColors(school);
  const maskType = getFacemaskForPosition(position);
  const id = `helmet-${school.replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`${school} ${position} helmet`}
    >
      <defs>
        {/* Visor gradient — dark mirror with reflection */}
        <linearGradient id={`${id}-visor`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#2a2a2a" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#444444" stopOpacity="0.7" />
          <stop offset="65%" stopColor="#2a2a2a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#111111" stopOpacity="0.95" />
        </linearGradient>
        {/* Visor shine highlight */}
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Shell highlight */}
        <radialGradient id={`${id}-shellHighlight`} cx="0.4" cy="0.3" r="0.6">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* === HELMET SHELL — side view === */}
      <path
        d="M30,18 Q50,8 75,16 Q92,22 95,42 Q96,55 90,65 Q85,72 75,75 L70,75 L60,72 Q45,70 35,68 L30,66 Q22,62 20,52 Q18,40 22,28 Q24,22 30,18 Z"
        fill={colors.primary}
      />
      {/* Shell highlight overlay */}
      <path
        d="M30,18 Q50,8 75,16 Q92,22 95,42 Q96,55 90,65 Q85,72 75,75 L70,75 L60,72 Q45,70 35,68 L30,66 Q22,62 20,52 Q18,40 22,28 Q24,22 30,18 Z"
        fill={`url(#${id}-shellHighlight)`}
      />

      {/* === STRIPE on top (if team has one) === */}
      {colors.stripe && (
        <path
          d="M42,10 Q52,7 62,10 L60,12 Q52,9.5 44,12 Z"
          fill={colors.stripe}
          opacity="0.9"
        />
      )}

      {/* === EAR HOLE / BACK ACCENT — secondary color === */}
      <ellipse cx="72" cy="52" rx="6" ry="10" fill={colors.secondary} opacity="0.7" />

      {/* === DARK MIRROR VISOR === */}
      <path
        d="M28,38 Q30,32 42,30 Q55,28 60,32 L58,46 Q52,52 40,54 Q32,54 28,50 Z"
        fill={`url(#${id}-visor)`}
      />
      {/* Visor shine reflection */}
      <path
        d="M32,34 Q38,30 50,30 L48,38 Q40,42 34,42 Z"
        fill={`url(#${id}-shine)`}
      />

      {/* === JAW / CHIN GUARD === */}
      <path
        d="M28,54 Q30,62 36,68 Q42,72 50,72 L50,70 Q42,70 37,66 Q32,62 30,56 Z"
        fill={colors.primary}
      />
      <path
        d="M28,54 Q30,62 36,68 Q42,72 50,72 L50,70 Q42,70 37,66 Q32,62 30,56 Z"
        fill={`url(#${id}-shellHighlight)`}
      />

      {/* === FACEMASK === */}
      {renderFacemask(maskType)}

      {/* === Thin shell outline === */}
      <path
        d="M30,18 Q50,8 75,16 Q92,22 95,42 Q96,55 90,65 Q85,72 75,75 L70,75 L60,72 Q45,70 35,68 L30,66 Q22,62 20,52 Q18,40 22,28 Q24,22 30,18 Z"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="0.5"
        fill="none"
      />
    </svg>
  );
}
