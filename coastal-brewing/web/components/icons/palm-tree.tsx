import * as React from "react";

/**
 * Coastal Brewing Co. — palm tree silhouette.
 * Tropical fronded palm, NOT palmetto.
 * Anchors the bottom-right corner of the dark-theme footer.
 * Off-white at low opacity — ornament only, never decorative-heavy.
 */
export function PalmTree({
  className = "",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Slim curving trunk */}
      <path
        d="M30 80 Q32 60 30 40 Q28 25 32 18"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Crown — six fronds radiating outward */}
      <path d="M32 18 Q22 14 10 18 Q18 18 24 22" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M32 18 Q24 8 14 6 Q22 12 28 18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M32 18 Q34 6 30 0 Q32 8 32 16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M32 18 Q40 8 50 6 Q42 12 36 18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M32 18 Q42 14 54 18 Q46 18 40 22" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M32 18 Q40 22 48 30 Q40 24 36 22" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
