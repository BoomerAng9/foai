"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export default function VerifyPage() {
  return (
    <React.Suspense fallback={<VerifyShell><LoadingState /></VerifyShell>}>
      <VerifyInner />
    </React.Suspense>
  );
}

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = React.useState<"verifying" | "ok" | "error">("verifying");
  const [errorMsg, setErrorMsg] = React.useState("");

  React.useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMsg("Sign-in link missing token. Request a new one from the login page.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/v1/auth/verify?token=${encodeURIComponent(token)}`, {
          credentials: "include",
        });
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.detail || "Invalid or expired link");
        }
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (data.owner_redirect && data.owner_email) {
          const target = `${data.owner_redirect}?email=${encodeURIComponent(data.owner_email)}`;
          router.push(target);
          return;
        }
        setState("ok");
        window.setTimeout(() => router.push("/account"), 700);
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <VerifyShell>
      {state === "verifying" && <LoadingState />}
      {state === "ok" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Welcome back</p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">
            Signed in. Pouring you straight to the counter.
          </h1>
        </motion.div>
      )}
      {state === "error" && (
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-destructive">
            Link unavailable
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">
            That sign-in link didn&apos;t take.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {errorMsg || "The link may have expired (they last 30 minutes) or already been used."}
          </p>
          <Link
            href="/auth/login"
            className="mt-7 inline-flex items-center gap-2 border bg-foreground px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Request a new link
          </Link>
        </div>
      )}
    </VerifyShell>
  );
}

function VerifyShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="container py-24 md:py-32">
        <div className="mx-auto max-w-lg">{children}</div>
      </main>
      <Footer />
    </>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Verifying your sign-in…
      </p>
    </div>
  );
}
