/**
 * AnonymousHelmet
 * ================
 * Reusable tactical helmet silhouette component. Default rendering for every
 * player surface on Per|Form — cards, rankings, detail pages, broadcast
 * graphics. Opaque visor, facemask bars, no face visible, no team logos.
 *
 * Default-and-Custom UX pattern:
 *   - Default: helmet silhouette (faceless). Canonical, privacy-preserving.
 *   - Custom:  pass `allowImage` + `imageUrl` to render a real photo instead
 *              (opt-in only; use sparingly — typically for paid/NIL features).
 *
 * Props:
 *   - accentColor — the tier badge color from @aims/tie-matrix, applied to
 *                   the helmet shell + glow. Pass `band.badgeColor` directly.
 *   - size        — pixel width of the rendered SVG (height scales 7:8).
 *   - crown       — optional golden crown above helmet (PRIME tier ≥101 only).
 *   - jerseyNumber — rendered beneath helmet when provided.
 *   - allowImage  — set true AND provide imageUrl to show a real headshot.
 *                   When false (default), helmet renders no matter what.
 *   - imageUrl    — real player photo URL (only used when allowImage=true).
 *   - label       — optional caption below (e.g., player's last name).
 *   - className   — additional wrapper classes.
 */

interface AnonymousHelmetProps {
  accentColor?: string;
  size?: number;
  crown?: boolean;
  jerseyNumber?: number | string | null;
  allowImage?: boolean;
  imageUrl?: string | null;
  label?: string;
  className?: string;
}

const DEFAULT_ACCENT = '#FF6B00';

export function AnonymousHelmet({
  accentColor = DEFAULT_ACCENT,
  size = 200,
  crown = false,
  jerseyNumber,
  allowImage = false,
  imageUrl,
  label,
  className = '',
}: AnonymousHelmetProps) {
  // Custom mode: show the real photo (explicit opt-in).
  // ESPN CDN headshots are 350x254 (landscape) — we render them square with
  // object-cover so the player's face fills the badge/circle cleanly instead
  // of letterboxing. Caller controls outer border-radius (square vs full).
  if (allowImage && imageUrl) {
    return (
      <div
        className={className}
        style={{
          position: 'relative',
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          filter: `drop-shadow(0 0 36px ${accentColor}44)`,
        }}
      >
        <img
          src={imageUrl}
          alt={label || 'Player'}
          style={{
            width: size,
            height: size,
            objectFit: 'cover',
            objectPosition: 'center 18%',
            borderRadius: 8,
          }}
        />
        {label && (
          <div
            style={{
              marginTop: 8,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 3,
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            {label}
          </div>
        )}
      </div>
    );
  }

  // Default mode: anonymous tactical helmet (the canonical Per|Form rendering)
  const height = Math.round(size * 1.17);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        filter: `drop-shadow(0 0 36px ${accentColor}44)`,
      }}
    >
      <svg
        width={size}
        height={height}
        viewBox="0 0 240 280"
        aria-label={label ? `${label} — anonymous helmet silhouette` : 'Anonymous player helmet silhouette'}
      >
        {crown && (
          <path
            d="M70 42 L90 20 L110 42 L130 20 L150 42 L170 20 L162 62 L78 62 Z"
            fill="#FFD700"
            opacity={0.92}
          />
        )}
        {/* Shoulder pads */}
        <path
          d="M20 240 Q120 220 220 240 L220 276 L20 276 Z"
          fill="#0A0A0F"
          opacity={0.92}
        />
        {/* Jersey neck tint */}
        <path
          d="M85 232 Q120 216 155 232 L155 248 L85 248 Z"
          fill={accentColor}
          opacity={0.32}
        />
        {/* Helmet dome */}
        <path
          d="M40 175 Q40 70 120 70 Q200 70 200 175 L200 215 L40 215 Z"
          fill={accentColor}
          opacity={0.88}
        />
        {/* Single accent stripe */}
        <path
          d="M120 72 L120 180"
          stroke="white"
          strokeWidth="3"
          opacity={0.38}
        />
        {/* Visor — FULLY OPAQUE, the "no face" rule rendered literally */}
        <rect x="65" y="115" width="110" height="36" rx="6" fill="#000" />
        <rect x="65" y="115" width="110" height="36" rx="6" fill={accentColor} opacity={0.1} />
        {/* Facemask bars */}
        <path
          d="M58 170 L182 170 M70 185 L170 185 M80 200 L160 200"
          stroke="#0A0A0F"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Chin strap */}
        <path
          d="M72 208 Q120 224 168 208"
          stroke="#0A0A0F"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      {jerseyNumber != null && (
        <div
          style={{
            position: 'absolute',
            bottom: label ? 48 : 12,
            right: 8,
            fontSize: Math.round(size * 0.22),
            fontWeight: 900,
            color: 'rgba(255,255,255,0.92)',
            lineHeight: 1,
            textShadow: `0 0 12px ${accentColor}99`,
            fontStyle: 'italic',
          }}
        >
          {jerseyNumber}
        </div>
      )}
      {label && (
        <div
          style={{
            marginTop: 10,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 3,
            color: 'rgba(255,255,255,0.55)',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

export default AnonymousHelmet;
