import * as React from "react";
import Link from "next/link";
import { WoodStork } from "@/components/icons/wood-stork";
import { cn } from "@/lib/utils";

/**
 * Coastal Brewing Co. — canonical wordmark lockup.
 *
 * Wood stork glyph above the stacked `COASTAL / BREWING / CO` lockup.
 * Used in: top nav, footer, hero ribbon backdrop.
 * Never colored, never gradient — inherits text color from the surface.
 */
export function Wordmark({
  size = "md",
  className,
  withCo = true,
  asLink = true,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  withCo?: boolean;
  asLink?: boolean;
}) {
  const dims =
    size === "lg"
      ? { glyph: "h-7 w-7", coastal: "text-base", co: "text-[10px]" }
      : size === "sm"
        ? { glyph: "h-3.5 w-3.5", coastal: "text-[10px]", co: "text-[8px]" }
        : { glyph: "h-5 w-5", coastal: "text-xs", co: "text-[9px]" };

  const inner = (
    <div className={cn("flex flex-col items-center leading-none", className)}>
      <WoodStork className={cn(dims.glyph, "mb-1.5 text-current")} />
      <div className={cn("font-sans font-semibold uppercase tracking-wordmark", dims.coastal)}>
        Coastal
      </div>
      <div className={cn("font-sans font-semibold uppercase tracking-wordmark", dims.coastal)}>
        Brewing
      </div>
      {withCo && (
        <div className={cn("mt-0.5 font-sans uppercase tracking-wordmark text-muted-foreground", dims.co)}>
          Co
        </div>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link href="/" aria-label="Coastal Brewing Co. — home">
        {inner}
      </Link>
    );
  }
  return inner;
}
