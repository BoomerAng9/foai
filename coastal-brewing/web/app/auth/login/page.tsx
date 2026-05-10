"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Mail } from "lucide-react";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [devLink, setDevLink] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    setErrorMsg("");
    setDevLink(null);
    try {
      const r = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${r.status}`);
      }
      const body = await r.json().catch(() => ({}));
      setState("sent");
      // Dev-mode magic link is returned inline until email delivery lands.
      // In prod the response only contains {ok, sent}.
      if (body.magic_link) setDevLink(body.magic_link);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <>
      <Nav />
      <main className="container py-16 md:py-24">
        <div className="mx-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Welcome back
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] leading-[1.05] md:text-5xl">
              Pick up where you left off.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Drop your email. We&apos;ll send a one-click sign-in link. No
              passwords, no friction — same cup, new device.
            </p>

            {state !== "sent" ? (
              <form onSubmit={onSubmit} className="mt-9 space-y-5">
                <div>
                  <label htmlFor="login-email" className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                    Email
                  </label>
                  <input
                    id="login-email"
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
                  {state === "loading" ? "Sending…" : (
                    <>
                      Send my sign-in link <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>

                {state === "error" && errorMsg && (
                  <p className="font-mono text-xs text-destructive">{errorMsg}</p>
                )}
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="mt-9 border border-accent/40 bg-accent/5 p-5"
              >
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-accent">
                  <Mail className="h-3 w-3" /> Check your inbox
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground">
                  If <span className="font-mono text-xs">{email}</span> is on
                  file, a one-click sign-in link is on its way. The link
                  expires in 30 minutes.
                </p>
                {devLink && (
                  <div className="mt-5 border-t border-border/60 pt-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                      Dev mode — magic link
                    </p>
                    <Link
                      href={devLink.replace(/^https?:\/\/[^/]+/, "")}
                      className="mt-2 block break-all text-xs text-accent hover:underline"
                    >
                      {devLink}
                    </Link>
                  </div>
                )}
              </motion.div>
            )}

            <p className="mt-10 border-t border-border/60 pt-5 text-xs leading-relaxed text-muted-foreground">
              New here?{" "}
              <Link href="/auth/signup" className="text-accent hover:underline">
                Open an account instead
              </Link>
              .
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
