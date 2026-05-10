import Image from "next/image";
import { Suspense } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ChatPanel } from "@/components/chat-panel";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: "sales" | "marketing"; sku?: string }>;
}) {
  const { agent = "sales", sku } = await searchParams;
  return (
    <>
      <Nav />
      <main className="container py-10">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Live · Sal is online</p>
            <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">
              Welcome to Coastal Brewing Co.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              An AI Managed Organization. Made in Pooler, Georgia.
            </p>
          </div>
          <Image
            src="/brand/made-in-plr.png"
            alt="Made in PLR — Pooler, Georgia"
            width={88}
            height={88}
            className="h-auto w-16 shrink-0 select-none md:w-20"
            priority
          />
        </div>
        <div className="h-[70vh] min-h-[560px]">
          <Suspense fallback={<div className="h-full animate-pulse rounded-lg border border-border bg-card" />}>
            <ChatPanel initialAgent={agent} contextSku={sku} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
