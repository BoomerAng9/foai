// A.I.M.S. light hero background — soft slate base + subtle amber wash.
// Per `reference_aims_light_theme_canon.md`. No glow, no diagonal cyan,
// no dark gradients — just a calm, breathable white-on-slate surface
// with a barely-there amber tint to anchor the brand.

export function FoaiBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
      {/* Slate-50 base */}
      <div className="absolute inset-0 bg-foai-bg" />

      {/* Soft amber wash — top-right, very subtle (matches AIMS landing register) */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 1200px 800px at 85% -10%, rgba(217, 119, 6, 0.08) 0%, transparent 60%)',
        }}
      />

      {/* Bottom-left companion wash — even softer */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 800px 600px at 10% 110%, rgba(217, 119, 6, 0.05) 0%, transparent 55%)',
        }}
      />

      {/* Optional subtle grid — matches AIMS skill spec for "subtle texture, never noisy" */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <pattern id="aims-soft-grid" width="56" height="56" patternUnits="userSpaceOnUse">
            <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#0F172A" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#aims-soft-grid)" />
      </svg>
    </div>
  );
}
