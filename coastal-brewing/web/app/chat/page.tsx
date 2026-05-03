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
        <div className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Live · ACHEEVY is online</p>
          <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">
            Find your cup with ACHEEVY.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Coffee, tea, matcha. Tell ACHEEVY what you&apos;re after and
            you&apos;ll be on a recommendation in two questions, on a
            checkout in five.
          </p>
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
