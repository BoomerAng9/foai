"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Coffee } from "lucide-react";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";

// Owner-canon 2026-05-12 PM: signup no longer binds the email or creates a
// Stripe customer at form submit. The POST sends a magic-link to the user's
// inbox; clicking the link finalizes the account (server-side at
// /api/v1/auth/verify). This page renders a "check your inbox" success
// state instead of redirecting to /account.

export default function SignupPage() {
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [state, setState] = React.useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [magicLink, setMagicLink] = React.useState<string | null>(null); // dev-mode only

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    setErrorMsg("");
    try {
      const r = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), name: name.trim() || null }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${r.status}`);
      }
      const data = await r.json().catch(() => ({}));
      // Dev-mode only: server returns the magic-link inline when
      // COASTAL_DEBUG=true. Production responses don't include it.
      if (typeof data.magic_link === "string" && data.magic_link.length > 0) {
        setMagicLink(data.magic_link);
      }
      setState("sent");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <>
      <Nav />
      <main className="container py-12 md:py-20">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16 lg:gap-20">
          {/* Left — editorial brand introduction */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="md:col-span-7"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Open an account
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] leading-[1.05] md:text-6xl">
              Pull up a stool.
              <span className="block text-foreground/65">Pour. Stay a while.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              An account is how Sal remembers what you like. How LUC keeps your
              standing discount honest. How Melli builds the right bracket
              when you scale up. How ACHEEVY signs the cup that lands at your
              door.
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              We don&apos;t sell your data. We don&apos;t spam you. We use
              your email to mint your Stripe customer record and to send the
              one-click sign-in link when you come back from another device.
              That&apos;s it.
            </p>

            <div className="mt-10 hidden md:block">
              <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden border border-border/60 bg-card">
                <Image
                  src="/coastal-brewing-co-storefront.png"
                  alt="Coastal Brewing Co. storefront — wood-stork sign over the doorway, palm fronds, Lowcountry sunset behind."
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover"
                  priority
                />
              </div>
              <p className="mt-3 max-w-md font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                Coffee changes your day. We&apos;re here for the change.
              </p>
            </div>
          </motion.div>

          {/* Right — signup form */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="md:col-span-5"
          >
            <div className="md:sticky md:top-24">
              <div className="border border-border bg-card p-6 md:p-8">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-accent">
                  <Coffee className="h-3 w-3" /> First pour&apos;s on us
                </div>
                <h2 className="mt-2 font-display text-2xl font-semibold leading-tight md:text-3xl">
                  Create your account
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Takes ten seconds. No password to remember — we&rsquo;ll
                  email you a one-click link to confirm.
                </p>

                {state === "sent" ? (
                  <div className="mt-7 border border-accent/30 bg-accent/[0.04] p-5">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                      Check your inbox
                    </p>
                    <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-foreground">
                      We just emailed you a confirmation link.
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Click the link in the email to finish opening your
                      account. Your Stripe customer record + welcome card
                      are minted only after you confirm — that&rsquo;s how
                      we keep the account in your name and no one
                      else&rsquo;s. Link expires in 30 minutes.
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground/80">
                      Sent to <span className="font-medium text-foreground">{email}</span>.
                      Wrong email? <button type="button" onClick={() => { setState("idle"); setMagicLink(null); }} className="text-accent underline-offset-2 hover:underline">Use a different one</button>.
                    </p>
                    {magicLink && (
                      <p className="mt-4 break-all rounded-sm bg-card px-3 py-2 font-mono text-[10px] text-muted-foreground">
                        DEV ONLY · <a href={magicLink} className="text-accent underline">{magicLink}</a>
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="mt-7 space-y-5">
                    <div>
                      <label htmlFor="signup-name" className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                        Name <span className="text-muted-foreground/60">(what should Sal call you)</span>
                      </label>
                      <input
                        id="signup-name"
                        type="text"
                        autoComplete="given-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="First name"
                        className="mt-2 block w-full border border-border bg-background px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="signup-email" className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                        Email
                      </label>
                      <input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="mt-2 block w-full border border-border bg-background px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={state === "loading" || !email.trim()}
                      className={cn(
                        "group inline-flex w-full items-center justify-center gap-2 border bg-foreground py-3 font-mono text-[11px] uppercase tracking-widest text-background transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                      )}
                    >
                      {state === "loading" && "Sending you the link…"}
                      {(state === "idle" || state === "error") && (
                        <>
                          Email me the link <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>

                    {state === "error" && errorMsg && (
                      <p className="font-mono text-xs text-destructive">{errorMsg}</p>
                    )}
                  </form>
                )}

                <p className="mt-6 border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
                  Already on file?{" "}
                  <Link href="/auth/login" className="text-accent hover:underline">
                    Sign in instead
                  </Link>
                  .
                </p>
                <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/70">
                  By creating an account you agree to our{" "}
                  <Link href="/policies/terms" className="hover:text-accent hover:underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/policies/privacy" className="hover:text-accent hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
