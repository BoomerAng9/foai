import * as React from "react";
import { ShelfCard } from "@/components/shelf-card";
import type { Product, ProductCategory } from "@/lib/api";

interface ShelfRowProps {
  id: string;
  label: string;
  blurb?: string;
  products: Product[];
}

/**
 * One shelf row. Sticky-position label at left, scrollable horizontal
 * track of <ShelfCard /> at right, with a wooden-edge divider beneath
 * suggesting a real shelf.
 */
export function ShelfRow({ id, label, blurb, products }: ShelfRowProps) {
  if (!products.length) return null;
  return (
    <section id={id} className="scroll-mt-20 py-10">
      <header className="mb-5 flex flex-col gap-1 px-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">{label}</p>
        {blurb && <p className="text-sm text-muted-foreground">{blurb}</p>}
        <p className="font-display text-xs text-muted-foreground">
          {products.length} {products.length === 1 ? "item" : "items"}
        </p>
      </header>
      {/* The shelf itself — horizontal scroll on mobile, multi-row wrap on lg */}
      <div className="relative">
        <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-6 lg:flex-wrap lg:overflow-visible">
          {products.map((p) => (
            <div key={p.sku} className="snap-start">
              <ShelfCard product={p} />
            </div>
          ))}
        </div>
        {/* Wooden shelf-edge graphic — a thin gradient bar suggesting wood */}
        <div className="h-2 rounded-sm bg-gradient-to-b from-[#8b6f47] via-[#6b5439] to-[#3d2a18] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.25)]" />
        {/* Subtle shadow under the shelf */}
        <div className="mx-auto h-3 w-[95%] bg-gradient-to-b from-foreground/15 to-transparent blur-md" />
      </div>
    </section>
  );
}

interface ShelfNavProps {
  shelves: { id: string; label: string; count: number }[];
}

export function ShelfNav({ shelves }: ShelfNavProps) {
  return (
    <nav className="sticky top-16 z-10 -mx-4 mb-4 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap gap-2 text-xs">
        {shelves.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-border bg-card px-3 py-1 font-mono uppercase tracking-widest text-foreground/80 transition-colors hover:border-accent hover:text-accent"
          >
            {s.label}
            <span className="ml-1.5 text-[9px] text-muted-foreground">({s.count})</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

// Category ordering on the shelf page — coffee first, ending with bundles.
export const SHELF_ORDER: { id: string; label: string; category: ProductCategory; blurb: string }[] = [
  { id: "shelf-coffee", label: "Coffee", category: "coffee", blurb: "Single-origin and house blends. Roasted small-batch this week." },
  { id: "shelf-flavored", label: "Flavored", category: "flavored_coffee", blurb: "Single-origin coffee with natural flavorings — coffee primary, flavor secondary." },
  { id: "shelf-specialty", label: "Specialty", category: "specialty_coffee", blurb: "Whiskey-barrel-aged, cold-brew-ready, coffee of the month." },
  { id: "shelf-tea", label: "Tea", category: "tea", blurb: "Lowcountry whole-leaf teas. Hojicha, matcha, and the rest of the cabinet." },
  { id: "shelf-kcup", label: "K-Cups", category: "kcup", blurb: "Recyclable single-use cups. Same Coastal beans, single-serve." },
  { id: "shelf-instant", label: "Instant", category: "instant", blurb: "Specialty-grade instant. Subscription required." },
  { id: "shelf-functional", label: "Functional", category: "functional", blurb: "Coffee + tea blended with Lion's Mane, Cordyceps, Reishi. Sold as food, not supplement." },
  { id: "shelf-samplers", label: "Samplers", category: "sample_pack", blurb: "Small bags, six SKUs at a time. The taste-and-decide path." },
  { id: "shelf-bundles", label: "Bundles", category: "bundle", blurb: "Curated multi-SKU sets. Discovery, household, gift." },
  { id: "shelf-subscriptions", label: "Subscriptions", category: "subscription", blurb: "One bag a month. Pause or cancel anytime." },
];
