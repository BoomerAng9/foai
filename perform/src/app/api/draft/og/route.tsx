/**
 * OG Image Route — Draft Report Card Social Images
 * Generates 1200x630 shareable images for X/Instagram.
 * Uses next/og (ImageResponse) built into Next.js.
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const GRADE_COLORS: Record<string, string> = {
  'A+': '#22C55E', A: '#22C55E', 'A-': '#22C55E',
  'B+': '#3B82F6', B: '#3B82F6', 'B-': '#3B82F6',
  'C+': '#F59E0B', C: '#F59E0B', 'C-': '#F59E0B',
  'D+': '#F97316', D: '#F97316', 'D-': '#F97316',
  F: '#EF4444',
};

const TEAM_COLORS: Record<string, string> = {
  BUF: '#00338D', MIA: '#008E97', NE: '#002244', NYJ: '#125740',
  BAL: '#241773', CIN: '#FB4F14', CLE: '#FF3C00', PIT: '#FFB612',
  HOU: '#03202F', IND: '#002C5F', JAX: '#006778', TEN: '#4B92DB',
  DEN: '#FB4F14', KC: '#E31837', LV: '#A5ACAF', LAC: '#0080C6',
  DAL: '#003594', NYG: '#0B2265', PHI: '#004C54', WAS: '#5A1414',
  CHI: '#0B162A', DET: '#0076B6', GB: '#203731', MIN: '#4F2683',
  ATL: '#A71930', CAR: '#0085CA', NO: '#D3BC8D', TB: '#D50A0A',
  ARI: '#97233F', LAR: '#003594', SF: '#AA0000', SEA: '#002244',
};

const TEAM_NAMES: Record<string, string> = {
  BUF: 'Buffalo Bills', MIA: 'Miami Dolphins', NE: 'New England Patriots', NYJ: 'New York Jets',
  BAL: 'Baltimore Ravens', CIN: 'Cincinnati Bengals', CLE: 'Cleveland Browns', PIT: 'Pittsburgh Steelers',
  HOU: 'Houston Texans', IND: 'Indianapolis Colts', JAX: 'Jacksonville Jaguars', TEN: 'Tennessee Titans',
  DEN: 'Denver Broncos', KC: 'Kansas City Chiefs', LV: 'Las Vegas Raiders', LAC: 'Los Angeles Chargers',
  DAL: 'Dallas Cowboys', NYG: 'New York Giants', PHI: 'Philadelphia Eagles', WAS: 'Washington Commanders',
  CHI: 'Chicago Bears', DET: 'Detroit Lions', GB: 'Green Bay Packers', MIN: 'Minnesota Vikings',
  ATL: 'Atlanta Falcons', CAR: 'Carolina Panthers', NO: 'New Orleans Saints', TB: 'Tampa Bay Buccaneers',
  ARI: 'Arizona Cardinals', LAR: 'Los Angeles Rams', SF: 'San Francisco 49ers', SEA: 'Seattle Seahawks',
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const team = searchParams.get('team') || 'NYG';
  const grade = searchParams.get('grade') || 'B+';
  const picks = searchParams.get('picks')?.split(',').slice(0, 3) || [];
  const bestPick = searchParams.get('best') || picks[0] || '';
  const reach = searchParams.get('reach') || '';

  const teamColor = TEAM_COLORS[team] || '#6B7280';
  const gradeColor = GRADE_COLORS[grade] || '#F59E0B';
  const teamName = TEAM_NAMES[team] || team;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: '#08080d',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Team color accent bar */}
        <div
          style={{
            width: '100%',
            height: '6px',
            background: teamColor,
            display: 'flex',
          }}
        />

        {/* Subtle radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${teamColor}15, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            padding: '48px 56px',
          }}
        >
          {/* Left side */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: teamColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 900,
                  }}
                >
                  {team}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 900,
                      color: '#FFFFFF',
                      lineHeight: 1.1,
                    }}
                  >
                    {teamName}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    2026 NFL Draft Grade
                  </div>
                </div>
              </div>
            </div>

            {/* Picks list */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginTop: '16px',
              }}
            >
              {picks.map((pick, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '18px',
                  }}
                >
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.3)',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      width: '32px',
                    }}
                  >
                    R{i + 1}
                  </span>
                  <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
                    {pick.trim()}
                  </span>
                </div>
              ))}
            </div>

            {/* Callouts */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginTop: '20px',
              }}
            >
              {bestPick && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(34,197,94,0.15)',
                      color: '#22C55E',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '11px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    Best Pick
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    {bestPick}
                  </span>
                </div>
              )}
              {reach && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(239,68,68,0.15)',
                      color: '#EF4444',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '11px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    Biggest Reach
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    {reach}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right side — Grade */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '280px',
            }}
          >
            <div
              style={{
                fontSize: '160px',
                fontWeight: 900,
                lineHeight: 1,
                color: gradeColor,
                textShadow: `0 0 80px ${gradeColor}40`,
              }}
            >
              {grade}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 56px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 900,
                color: '#D4A853',
                letterSpacing: '0.05em',
              }}
            >
              PER|FORM
            </div>
            <div
              style={{
                width: '1px',
                height: '16px',
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
              }}
            />
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.3)',
                fontWeight: 600,
              }}
            >
              perform.foai.cloud
            </div>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.2)',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
            }}
          >
            Simulated with Per|Form Draft AI
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
