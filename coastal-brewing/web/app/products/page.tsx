import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ShelfRow, ShelfNav, SHELF_ORDER } from "@/components/shelf-row";
import { api, type Product } from "@/lib/api";

export const revalidate = 300;

export const metadata = {
  title: "Shop the brew — Coastal Brewing Co.",
  description:
    "Coastal Brewing's full Lowcountry catalog — coffees, flavored coffees, single-origin Fairtrade, teas, K-Cups, samplers, and subscriptions. Browse the shelves.",
};

async function getCatalog(): Promise<Product[]> {
  try {
    const r = await api.catalog();
    return r.products;
  } catch {
    return [];
  }
}

export default async function ProductsPage() {
  const all = await getCatalog();

  // Group by category, preserving SHELF_ORDER sequence
  const byCategory = new Map<Product["category"], Product[]>();
  for (const p of all) {
    const arr = byCategory.get(p.category) || [];
    arr.push(p);
    byCategory.set(p.category, arr);
  }
  // Sort each shelf's products by name for stable display
  for (const arr of byCategory.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }

  const shelves = SHELF_ORDER.map((shelf) => ({
    ...shelf,
    products: byCategory.get(shelf.category) || [],
  })).filter((s) => s.products.length > 0);

  const totalCount = all.length;

  return (
    <>
      <Nav />
      {/* Wooden-shelving aesthetic background — subtle warm grain on cream */}
      <main
        className="container py-12 lg:py-16"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top, rgba(200,115,43,0.04) 0%, transparent 60%)",
        }}
      >
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            The catalog
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight md:text-5xl">
            Shop the brew.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Coastal carries every coffee, tea, K-Cup, and curated bundle our
            Temecula-roastery partner produces — branded, retailed, and
            roasted-to-order under our flying-stork mark.{" "}
            <strong className="text-foreground">{totalCount} items</strong>.
            Hover any card for tasting notes and certifications.
          </p>
        </div>

        <ShelfNav
          shelves={shelves.map((s) => ({
            id: s.id,
            label: s.label,
            count: s.products.length,
          }))}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              itemListElement: all.slice(0, 100).map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `https://brewing.foai.cloud/products/${p.sku}`,
                name: p.name,
              })),
            }),
          }}
        />

        <div className="space-y-2">
          {shelves.map((s) => (
            <ShelfRow
              key={s.id}
              id={s.id}
              label={s.label}
              blurb={s.blurb}
              products={s.products}
            />
          ))}
        </div>

        {totalCount === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              The catalog is currently unavailable. Try refreshing in a moment.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
