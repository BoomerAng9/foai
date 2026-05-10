import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">404</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">We couldn't find that page.</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          The brew may have moved. Try the catalog or ask our team.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild variant="accent"><Link href="/products">Shop the brew</Link></Button>
          <Button asChild variant="ghost"><Link href="/chat">Ask the team</Link></Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
