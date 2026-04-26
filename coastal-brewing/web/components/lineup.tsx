import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/api";

const FALLBACK_LINEUP: { num: string; cat: string; label: string; copy: string; sku: string; image: string }[] = [
  {
    num: "01",
    cat: "Coffee",
    label: "Coffee",
    copy: "House blend, dark roast, decaf. Small-lot sourcing. No flavorings, no fillers.",
    sku: "lowcountry-house-blend-12oz",
    image: "/static/mock-dark.png",
  },
  {
    num: "02",
    cat: "Tea",
    label: "Tea",
    copy: "Lowcountry breakfast, herbal, green. Whole-leaf. No dust, brewed how you like it.",
    sku: "lowcountry-breakfast-tea-50ct",
    image: "/static/mock-dark.png",
  },
  {
    num: "03",
    cat: "Matcha",
    label: "Matcha",
    copy: "Ceremonial-grade matcha for the mornings that ask for it.",
    sku: "ceremonial-matcha-30ct",
    image: "/static/mock-dark.png",
  },
];

export function Lineup({ products }: { products?: Product[] }) {
  // If real catalog products are provided, prefer them but keep the 01/02/03 framing.
  const items =
    products && products.length >= 3
      ? FALLBACK_LINEUP.map((f, i) => {
          const p = products.find((x) => x.category === f.cat.toLowerCase()) || products[i];
          return {
            ...f,
            label: p.name,
            copy: p.description || f.copy,
            sku: p.sku,
            image: p.image || f.image,
          };
        })
      : FALLBACK_LINEUP;

  return (
    <section className="border-b border-border/60">
      <div className="container py-20 md:py-28">
        <div className="mb-12">
          <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
            The lineup.
          </h2>
        </div>

        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          {items.map((item) => (
            <article
              key={item.num}
              className="group flex flex-col"
            >
              <div className="aspect-[4/5] overflow-hidden bg-card">
                <img
                  src={item.image}
                  alt={item.label}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
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
