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
    // Cream paper card, "COASTAL CUSTEE CARD" wordmark in dark coffee,
    // gold pinstripe border, small wood stork stamp lower-right.
    // Higgsfield render via nano_banana_2 (2026-05-11) per brand canon.
    return (
      <div className={`${box} bg-[#1c1814]`} data-tier-mark="custee-card">
        <Image
          src="/brand/cards/coastal-custee-card.png"
          alt="Coastal Custee Card"
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
    );
  }

  if (variant === "wood-stork-standard") {
    // Dark espresso card with cream wood stork etching center,
    // "WOOD STORK · STANDARD" wordmark, thin gold pinstripe edge.
    // Higgsfield render via nano_banana_2 (2026-05-11).
    return (
      <div className={`${box} bg-[#1c1814]`} data-tier-mark="wood-stork-standard">
        <Image
          src="/brand/cards/wood-stork-standard.png"
          alt="Wood Stork Standard"
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
    );
  }

  // wood-stork-reserve — jet-black card with ornate gold-foil engraved
  // wood stork + gold filigree border. Highest tier (whitelabel).
  // Higgsfield render via nano_banana_2 (2026-05-11).
  return (
    <div className={`${box} bg-[#0a0907]`} data-tier-mark="wood-stork-reserve">
      <Image
        src="/brand/cards/wood-stork-reserve.png"
        alt="Wood Stork Reserve"
        fill
        sizes="64px"
        className="object-cover"
      />
    </div>
  );
}
