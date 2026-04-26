import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { api, type Product } from "@/lib/api";

export const revalidate = 300;

async function getCatalog(): Promise<Product[]> {
  try {
    const r = await api.catalog();
    return r.products;
  } catch {
    return [];
  }
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const all = await getCatalog();
  const filtered = cat ? all.filter((p) => p.category === cat) : all;
  return (
    <>
      <Nav />
      <main className="container py-16">
        <div className="mb-10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            {cat ? cat : "Full catalog"}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">Shop the brew.</h1>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              itemListElement: filtered.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `https://brewing.foai.cloud/products/${p.sku}`,
                name: p.name,
              })),
            }),
          }}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.sku} product={p} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
