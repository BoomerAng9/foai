import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/api";

// One-of-each-category surface so visitors see all three product lines at a
// glance — coffee, tea, and the functional/mushroom blend (TCR strict-lane).
// Images are hardcoded to files that exist in /public/products/. The API
// fallback is intentionally NOT used here because catalog rows currently
// reference image paths that haven't been generated (italian-roast,
// jasmine-3oz, italian-roast-2lb all 404). Fix the catalog images then
// re-enable the API override.
const OFFERINGS: { num: string; cat: string; label: string; copy: string; sku: string; image: string }[] = [
  {
    num: "01",
    cat: "Coffee",
    label: "Coffee",
    copy: "Specialty coffee, traced to roaster. Single-origin and signature blends, ground or whole bean.",
    sku: "coastal-blend-12oz",
    image: "/products/coastal-blend-12oz.png",
  },
  {
    num: "02",
    cat: "Tea",
    label: "Tea",
    copy: "Whole-leaf tea — jasmine green, English breakfast, masala chai, hibiscus berry, Moroccan mint.",
    sku: "lowcountry-tea-jasmine-green-2oz",
    image: "/products/lowcountry-tea-jasmine-green-2oz.png",
  },
  {
    num: "03",
    cat: "Mushroom",
    label: "Functional with Mushrooms",
    copy: "Coffee blended with Lion's Mane, Cordyceps, Reishi. Sold as food, never as a supplement.",
    sku: "coastal-functional-coffee-with-mushrooms-medium-ground-8oz",
    image: "/products/coastal-functional-coffee-with-mushrooms-medium-ground-8oz.png",
  },
];

export function Lineup({ products: _products }: { products?: Product[] }) {
  // API products intentionally ignored until catalog image paths are repaired.
  const items = OFFERINGS;

  return (
    <section className="border-b border-border/60">
      <div className="container py-20 md:py-28">
        <div className="mb-12">
          <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
            Our offerings.
          </h2>
        </div>

        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          {items.map((item) => (
            <article
              key={item.num}
              className="group flex flex-col"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-card">
                <Image
                  src={item.image}
                  alt={`${item.label} — Coastal Brewing Co. ${item.cat.toLowerCase()} hero`}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
              </div>
              <div className="mt-5 flex items-baseline gap-3">
                <span className="font-mono text-xs text-muted-foreground">{item.num}</span>
                <h3 className="font-display text-xl font-semibold">{item.label}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.copy}</p>
              <Link
                href={`/products/${item.sku}`}
                className="mt-5 inline-flex items-center gap-1 self-start font-mono text-[10px] uppercase tracking-wordmark text-foreground hover:text-muted-foreground"
              >
                Shop now <ArrowUpRight className="h-3 w-3" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
