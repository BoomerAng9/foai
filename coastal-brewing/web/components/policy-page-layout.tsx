import * as React from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

interface PolicyPageLayoutProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

/**
 * Shared chrome for every legal / policy page. Same Nav + Footer + max-w-3xl
 * column as /about. Server component — no client state.
 */
export function PolicyPageLayout({
  eyebrow,
  title,
  lastUpdated,
  children,
}: PolicyPageLayoutProps) {
  return (
    <>
      <Nav />
      <main className="container py-16">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">
            {title}
          </h1>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Last updated: {lastUpdated}
          </p>

          <div className="prose-policy mt-10 space-y-5 text-base leading-relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
