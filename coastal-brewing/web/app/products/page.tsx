import { Suspense } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ShelfRow, ShelfNav, SHELF_ORDER } from "@/components/shelf-row";
import { ChatPanel } from "@/components/chat-panel";
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

interface SearchParams {
  // Mode signals which CoT-research path the customer is on:
  //   guided  = ACHEEVY tour mode → right-column chat alongside catalog
  //   curated = Shop-For-Me → right-column chat with curated picks
  //   browse  = Direct to Marketplace → mini collapsed chat (Sal-on-standby)
  mode?: "guided" | "curated" | "browse";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { mode } = await searchParams;
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

  // mode=guided / curated → split-screen with chat in right column
  // mode=browse → catalog full-width with mini chat in bottom-right corner
  const splitScreen = mode === "guided" || mode === "curated";
  const browseMode = mode === "browse";

  const modeLabel = mode === "guided" ? "Tour with ACHEEVY"
    : mode === "curated" ? "Shopping for you"
    : mode === "browse" ? "Browsing on your own"
    : null;

  const catalogContent = (
    <>
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
          {modeLabel ? `${modeLabel} · the catalog` : "The catalog"}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight md:text-5xl">
          Shop the brew.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          {mode === "guided" ? (
            <>
              ACHEEVY is alongside — keep the conversation going while you
              browse. He&apos;ll point at the right shelves as you go.
            </>
          ) : mode === "curated" ? (
            <>
              These are picks shaped by what you&apos;ve told ACHEEVY.
              Anything looks off, just say so in the chat.
            </>
          ) : (
            <>
              Coastal carries every coffee, tea, K-Cup, and curated bundle
              we offer — branded, retailed, and roasted-to-order under
              our flying-stork mark.{" "}
              <strong className="text-foreground">{totalCount} items</strong>.
              Hover any card for tasting notes and certifications.
            </>
          )}
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
    </>
  );

  return (
    <>
      <Nav />
      <main
        className="container py-12 lg:py-16"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top, rgba(200,115,43,0.04) 0%, transparent 60%)",
        }}
      >
        {splitScreen ? (
          // Two-column layout — products on left (60%), persistent chat on
          // right (40%, sticky). Per CoT research line 996, the customer
          // continues their conversation with ACHEEVY while looking at the
          // shelves. ChatPanel rehydrates from sessionStorage so the
          // conversation continues seamlessly.
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">{catalogContent}</div>
            <aside className="lg:col-span-5">
              <div className="lg:sticky lg:top-6 h-[calc(100vh-3rem)] min-h-[600px]">
                <Suspense fallback={<div className="h-full animate-pulse rounded-lg border border-border bg-card" />}>
                  <ChatPanel initialAgent="sales" />
                </Suspense>
              </div>
            </aside>
          </div>
        ) : (
          <>
            {catalogContent}
            {browseMode && (
              // Mini chat for Direct-to-Marketplace browse mode.
              // Sticky bottom-right, expands to full panel on click.
              // Per CoT research line 996 + 1033 — Sal-on-standby pattern.
              <div className="fixed bottom-4 right-4 z-30 h-[600px] w-full max-w-md md:right-6 md:bottom-6">
                <Suspense fallback={null}>
                  <ChatPanel initialAgent="sales" />
                </Suspense>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
