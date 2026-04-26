import * as React from "react";

/**
 * Coastal Brewing Co. — wood stork glyph.
 * Mycteria americana, the only stork native to North America.
 * Used as the brand mark above the wordmark on bags, tins, signage, nav, footer.
 * Minimal outline — never filled, never gradient.
 */
export function WoodStork({
  className = "",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Stylized wood stork in flight — head left, body right, long downcurved bill, trailing legs */}
      <path
        d="M3 13 L7 12 Q9 11 11 12 L14 13 Q17 14 20 13 L26 11 Q28 11 29 12 L27 13 L24 14 L26 15 L24 16 L20 15 L17 17 L14 18 Q11 18 9 17 L7 16 L5 17 L4 16 L5 15 L4 14 Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Long downcurved bill */}
      <path d="M3 13 L1 14 L3 14 Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      {/* Trailing legs */}
      <path d="M22 16 L24 20 M24 16 L26 20" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
