"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/api";

// ACHEEVY's responses can include [product:sku-id] markers per the
// system prompt rule. This component scans the message text for those
// markers and renders an inline product card in their place — the
// surrounding text stays as flowing prose. The card is a chat-optimized
// variant of ProductCard: smaller, denser, fast to scan, links to the
// full product page on click.
//
// Catalog is passed as a prop so the parent (ChatPanel) can fetch once
// and cache it for the whole session. Unknown SKUs fall back to plain
// text (the marker is dropped silently — no broken-link visuals).

interface ChatMessageContentProps {
  text: string;
  catalog: Product[];
}

const PRODUCT_MARKER = /\[product:([a-z0-9_-]+)\]/gi;

export function ChatMessageContent({ text, catalog }: ChatMessageContentProps) {
  const segments = React.useMemo(
    () => parseMarkers(text, catalog),
    [text, catalog],
  );

  return (
    <div className="space-y-3">
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return seg.value ? (
            <p
              key={i}
              className="rounded-lg bg-secondary px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
            >
              {seg.value}
            </p>
          ) : null;
        }
        return <InlineProductCard key={i} product={seg.product} />;
      })}
    </div>
  );
}

type Segment =
  | { kind: "text"; value: string }
  | { kind: "product"; product: Product };

function parseMarkers(text: string, catalog: Product[]): Segment[] {
  const segments: Segment[] = [];
  // Build a quick sku→product map for lookups. Catalog rows expose either
  // `sku` or `id` (depending on which API surface filled them) — index
  // both so the marker resolver finds matches regardless.
  const bySku = new Map<string, Product>();
  for (const p of catalog) {
    if (p.sku) bySku.set(p.sku.toLowerCase(), p);
    const pid = (p as Product & { id?: string }).id;
    if (pid) bySku.set(pid.toLowerCase(), p);
  }

  let lastIndex = 0;
  // Reset regex state between calls
  const re = new RegExp(PRODUCT_MARKER.source, PRODUCT_MARKER.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) segments.push({ kind: "text", value: before });
    const sku = match[1].toLowerCase();
    const product = bySku.get(sku);
    if (product) {
      segments.push({ kind: "product", product });
    }
    // Unknown SKU → marker dropped silently (no broken card visual)
    lastIndex = match.index + match[0].length;
  }
  const tail = text.slice(lastIndex).trim();
  if (tail) segments.push({ kind: "text", value: tail });
  // If there were no markers and no segments yet, just return the whole text
  if (segments.length === 0 && text.trim()) {
    segments.push({ kind: "text", value: text });
  }
  return segments;
}

function InlineProductCard({ product }: { product: Product }) {
  const productId = product.sku || (product as Product & { id?: string }).id || "";
  return (
    <Link
      href={`/products/${productId}`}
      className="group flex gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3 transition-colors hover:border-accent/60 hover:bg-accent/10"
    >
      <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
        <Image
          src={product.image || "/products/coastal-blend-12oz.png"}
          alt={product.name}
          fill
          sizes="80px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between gap-1">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-accent/80">
            {product.category}
          </p>
          <p className="mt-0.5 font-display text-sm font-semibold leading-tight text-foreground">
            {product.name}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          {product.msrp ? (
            <span className="font-mono text-xs font-semibold text-foreground">
              ${product.msrp.toFixed(2)}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-0.5 font-mono text-[9px] uppercase tracking-widest text-accent group-hover:underline">
            Shop <ArrowUpRight className="h-2.5 w-2.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
