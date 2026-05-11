/**
 * TierMark — per-tier brand mark for the /pricing comparison table.
 *
 * Variants:
 *  - "plr-cream"           Pooler Pass Standard. The canonical "Made in PLR"
 *                          logo (dark on cream) as published in `brand/made-in-plr.png`.
 *  - "plr-gold"            Pooler Pass Plus. Same logo, gold-tinted via CSS
 *                          filter to mark the higher Pooler tier.
 *  - "custee-card"         Coastal Custee Card ($199 default national tier).
 *                          Mini credit-card-style mark, cream + dark + gold
 *                          accent. Placeholder design — owner may replace
 *                          with a Higgsfield-rendered card asset later.
 *  - "wood-stork-standard" Wood Stork Standard ($499 B2B). Etched stork
 *                          motif on dark, sourced from the storefront-
 *                          window-etching brand canon asset.
 *  - "wood-stork-reserve"  Wood Stork Reserve ($999 whitelabel). Same
 *                          stork motif with deeper gold tint to mark the
 *                          highest tier.
 *
 * All marks render as a fixed 64x64 (16x16 mobile-tight) tile so the
 * /pricing table row heights stay aligned.
 */
import Image from "next/image";

type Variant =
  | "plr-cream"
  | "plr-gold"
  | "custee-card"
  | "wood-stork-standard"
  | "wood-stork-reserve";

interface Props {
  variant: Variant;
}

export function TierMark({ variant }: Props) {
  const box = "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md";

  if (variant === "plr-cream") {
    return (
      <div className={`${box} bg-[#f5efe2]`} data-tier-mark="plr-cream">
        <Image
          src="/brand/made-in-plr.png"
          alt="Made in PLR"
          fill
          sizes="64px"
          className="object-contain p-1"
        />
      </div>
    );
  }

  if (variant === "plr-gold") {
    // Gold tint applied via CSS filter (no second asset needed for v1).
    return (
      <div className={`${box} bg-[#1c1814]`} data-tier-mark="plr-gold">
        <Image
          src="/brand/made-in-plr.png"
          alt="Made in PLR — Plus tier"
          fill
          sizes="64px"
          className="object-contain p-1"
          style={{
            // sepia + warm hue rotation + boost = brushed-gold tint
            filter:
              "brightness(1.1) sepia(1) saturate(3.5) hue-rotate(-18deg) contrast(0.95)",
          }}
        />
      </div>
    );
  }

  if (variant === "custee-card") {
    // CSS-rendered "credit card" mark. Cream face, dark wordmark, gold
    // accent strip. Placeholder for a future Higgsfield-rendered card.
    return (
      <div
        className={`${box} bg-gradient-to-br from-[#f5efe2] to-[#e8dfc8] ring-1 ring-[#c9b78a] flex flex-col justify-between p-1.5`}
        data-tier-mark="custee-card"
      >
        <div className="h-1 w-3 rounded-sm bg-[#c9b78a]" />
        <div className="font-mono text-[6px] uppercase tracking-[0.15em] text-[#1c1814] leading-tight">
          Coastal
          <br />
          Custee
          <br />
          Card
        </div>
      </div>
    );
  }

  if (variant === "wood-stork-standard") {
    // CSS placeholder — dark tile, cream wordmark, no accent. Owner can
    // replace with a Higgsfield-rendered wood-stork card asset later.
    return (
      <div
        className={`${box} bg-[#1c1814] ring-1 ring-[#3a3128] flex flex-col justify-between p-1.5`}
        data-tier-mark="wood-stork-standard"
      >
        <div className="font-mono text-[5px] uppercase tracking-[0.15em] text-[#c9b78a] leading-tight">
          B2B
        </div>
        <div className="font-mono text-[6px] uppercase tracking-[0.15em] text-[#f5efe2] leading-tight">
          Wood
          <br />
          Stork
          <br />
          Standard
        </div>
      </div>
    );
  }

  // wood-stork-reserve — same CSS placeholder, deeper black + heavier
  // gold accent to mark the highest tier.
  return (
    <div
      className={`${box} bg-[#0a0907] ring-1 ring-[#c9b78a] flex flex-col justify-between p-1.5`}
      data-tier-mark="wood-stork-reserve"
    >
      <div className="font-mono text-[5px] uppercase tracking-[0.15em] text-[#c9b78a] leading-tight">
        Whitelabel
      </div>
      <div className="font-mono text-[6px] uppercase tracking-[0.15em] text-[#c9b78a] leading-tight">
        Wood
        <br />
        Stork
        <br />
        Reserve
      </div>
    </div>
  );
}
