import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Coastal Brewing Co. — official logo lockup.
 *
 * Owner-supplied raster (`/coastal-logo.png`): hand-drawn stork above
 * stacked `COASTAL / BREWING / CO.` on a parchment field. Renders the
 * image as-is — the parchment background is part of the brand stamp.
 * Used in: top nav, footer, hero ribbon backdrop.
 */
export function Wordmark({
  size = "md",
  className,
  // `withCo` is preserved on the API for back-compat; the official logo
  // already has "CO." baked into the lockup, so this prop is a no-op.
  withCo: _withCo = true,
  asLink = true,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  withCo?: boolean;
  asLink?: boolean;
}) {
  const px = size === "lg" ? 96 : size === "sm" ? 40 : 64;

  const inner = (
    <Image
      src="/coastal-logo.png"
      alt="Coastal Brewing Co."
      width={px}
      height={px}
      priority={size !== "sm"}
      className={cn("h-auto w-auto select-none", className)}
      style={{ height: px, width: px }}
    />
  );

  if (asLink) {
    return (
      <Link href="/" aria-label="Coastal Brewing Co. — home" className="inline-flex">
        {inner}
      </Link>
    );
  }
  return inner;
}
