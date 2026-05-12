"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Coffee, Leaf, Sparkles, Calendar, ArrowUpRight, LogOut } from "lucide-react";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AccountWelcomeCard } from "@/components/account-welcome-card";
import { cn } from "@/lib/utils";

interface AccountState {
  authenticated: boolean;
  coastal_uid?: string;
  email?: string;
  display_name?: string | null;
  stripe_customer_id?: string | null;
  first_visit_at?: string;
  last_visit_at?: string;
  visit_count?: number;
  preferences?: { likes?: string[] } | Record<string, unknown>;
  last_purchase_sku?: string | null;
  last_purchase_label?: string | null;
  last_purchase_at?: string | null;
  welcome_card_seen?: boolean;
  welcome_card_url?: string | null;
  welcome_card_message?: string | null;
}

const PREFERENCE_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  coffee:               { label: "Coffee",              icon: Coffee },
  tea:                  { label: "Tea",                 icon: Leaf },
  mushroom_functional:  { label: "Functional blends",   icon: Sparkles },
  matcha:               { label: "Matcha",              icon: Leaf },
};

export default function AccountPage() {
  const router = useRouter();
  const [state, setState] = React.useState<AccountState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [welcomeOpen, setWelcomeOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/v1/auth/me", { credentials: "include" });
        const data = await r.json();
        if (cancelled) return;
        setState(data);
        setLoading(false);
        if (!data.authenticated) {
          // Soft redirect: give them the moment to read the chrome before
          // routing — avoids a flash for legit signed-in users with slow
          // /me responses.
          window.setTimeout(() => router.push("/auth/login"), 1200);
          return;
        }
        // Welcome-card gate: render the post-signup motion+narration
        // modal exactly once per account. Driven by profile metadata
        // flags returned from /me — `welcome_card_seen` is set true
        // when the user dismisses (or auto-dismiss fires).
        if (data.welcome_card_message && !data.welcome_card_seen) {
          setWelcomeOpen(true);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
  }

  async function dismissWelcome() {
    setWelcomeOpen(false);
    // Persist the seen flag — fire-and-forget; UI already closed.
    try {
      await fetch("/api/v1/account/welcome-dismiss", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // non-fatal; flag will eventually persist on next dismiss
    }
  }

  if (loading || !state) {
    return (
      <>
        <Nav />
        <main className="container py-32">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Pulling your tab…
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!state.authenticated) {
    return (
      <>
        <Nav />
        <main className="container py-24 md:py-32">
          <div className="mx-auto max-w-md text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Account
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">
              You&apos;re not signed in yet.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Redirecting you to the sign-in counter…
            </p>
            <Link
              href="/auth/login"
              className="mt-7 inline-flex items-center gap-2 border bg-foreground px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Sign in now
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Authenticated state — premium dashboard
  const displayName = state.display_name || state.email?.split("@")[0] || "friend";
  const prefs: string[] = Array.isArray((state.preferences as { likes?: string[] })?.likes)
    ? (state.preferences as { likes?: string[] }).likes ?? []
    : [];
  const memberSince = state.first_visit_at
    ? new Date(state.first_visit_at).toLocaleDateString(undefined, { year: "numeric", month: "long" })
    : null;
  const lastVisit = state.last_visit_at
    ? new Date(state.last_visit_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const lastPurchaseDate = state.last_purchase_at
    ? new Date(state.last_purchase_at).toLocaleDateString(undefined, { month: "long", day: "numeric" })
    : null;

  return (
    <>
      {welcomeOpen && state.welcome_card_message && (
        <AccountWelcomeCard
          displayName={displayName}
          message={state.welcome_card_message}
          audioUrl={state.welcome_card_url || null}
          onDismiss={dismissWelcome}
        />
      )}
      <Nav />
      <main className="container py-12 md:py-16">
        {/* Hero header — editorial welcome */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="border-b border-border/60 pb-10 md:pb-14"
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            Your Coastal account
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] leading-[1.05] md:text-6xl">
            Welcome back, <span className="text-foreground/65">{displayName}.</span>
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
            {memberSince && <span>Member since {memberSince}</span>}
            {state.visit_count !== undefined && state.visit_count > 0 && (
              <span>· Visit {state.visit_count}</span>
            )}
            {lastVisit && <span>· Last seen {lastVisit}</span>}
          </div>
        </motion.div>

        {/* Dashboard grid */}
        <div className="mt-12 grid gap-8 md:grid-cols-12 md:gap-10">
          {/* Last pour — full-width feature card */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="md:col-span-8"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Your last pour
            </p>
            {state.last_purchase_label ? (
              <Link
                href={state.last_purchase_sku ? `/products/${state.last_purchase_sku}` : "/products"}
                className="group mt-3 block border border-border bg-card p-6 transition-colors hover:border-accent/60 hover:bg-accent/5 md:p-8"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-2xl font-semibold leading-tight md:text-3xl">
                      {state.last_purchase_label}
                    </h2>
                    {lastPurchaseDate && (
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                        Roasted {lastPurchaseDate}
                      </p>
                    )}
                    <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                      How was the cup? Sal can pull you another, or
                      something close — say the word.
                    </p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <div className="mt-7 flex flex-wrap gap-2 border-t border-border/60 pt-5">
                  <span className="inline-flex items-center gap-1.5 border border-accent/40 bg-accent/5 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-accent">
                    <Sparkles className="h-2.5 w-2.5" /> Re-pour available
                  </span>
                  <Link
                    href="/chat"
                    className="inline-flex items-center gap-1.5 border border-border bg-card/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-foreground/80 hover:border-foreground/40"
                  >
                    Talk to Sal
                  </Link>
                </div>
              </Link>
            ) : (
              <div className="mt-3 border border-dashed border-border bg-card/40 p-6 md:p-8">
                <h2 className="font-display text-xl font-semibold leading-tight md:text-2xl">
                  No pour on record yet.
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                  When you order your first bag, it&apos;ll land here. Sal
                  picks up the conversation from your last cup.
                </p>
                <Link
                  href="/chat"
                  className="mt-5 inline-flex items-center gap-2 border bg-foreground px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Pull up to the counter
                </Link>
              </div>
            )}
          </motion.section>

          {/* Preferences card */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-4"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              What you reach for
            </p>
            <div className="mt-3 border border-border bg-card p-6">
              {prefs.length > 0 ? (
                <ul className="space-y-3">
                  {prefs.map((p) => {
                    const meta = PREFERENCE_LABELS[p] || { label: p, icon: Coffee };
                    const Icon = meta.icon;
                    return (
                      <li key={p} className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center bg-accent/10 text-accent">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="font-display text-base font-medium text-foreground">
                          {meta.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Sal will fill this in as he gets to know your palate. Or
                  set it explicitly in chat.
                </p>
              )}
              <Link
                href="/chat"
                className="mt-6 inline-flex items-center gap-1.5 border-b border-accent/40 pb-0.5 font-mono text-[10px] uppercase tracking-widest text-accent hover:border-accent"
              >
                Refine my taste <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </motion.section>

          {/* Subscription / billing card */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="md:col-span-6"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Subscription &amp; billing
            </p>
            <div className="mt-3 border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-display text-base font-semibold text-foreground">
                  {state.stripe_customer_id ? "Stripe customer on file" : "No subscription yet"}
                </p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {state.stripe_customer_id
                  ? "Your billing record is set up. When you start a coffee or tea subscription, you'll manage cadence, SKU, and payment methods from this card."
                  : "Set up a monthly pour and you'll see active subscriptions, next-run dates, and payment methods here."}
              </p>
              <Link
                href="/membership"
                className={cn(
                  "mt-6 inline-flex items-center gap-2 border px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors",
                  state.stripe_customer_id
                    ? "border-border bg-card hover:border-accent/40 hover:text-accent"
                    : "bg-foreground text-background hover:bg-accent hover:text-accent-foreground",
                )}
              >
                Browse subscriptions
              </Link>
            </div>
          </motion.section>

          {/* Account info card */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-6"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Account
            </p>
            <div className="mt-3 border border-border bg-card p-6">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                    Email
                  </dt>
                  <dd className="font-mono text-xs text-foreground break-all text-right">
                    {state.email}
                  </dd>
                </div>
                {state.display_name && (
                  <div className="flex justify-between gap-4">
                    <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                      Name
                    </dt>
                    <dd className="text-foreground text-right">{state.display_name}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                    Visits
                  </dt>
                  <dd className="font-mono text-xs text-foreground">
                    {state.visit_count ?? 0}
                  </dd>
                </div>
              </dl>
              <button
                onClick={onLogout}
                className="mt-6 inline-flex items-center gap-2 border border-border bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <LogOut className="h-3 w-3" /> Sign out
              </button>
            </div>
          </motion.section>
        </div>

        {/* Footer prompt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 border-t border-border/60 pt-8 text-center"
        >
          <p className="max-w-xl mx-auto text-sm leading-relaxed text-muted-foreground">
            Coffee changes your day. Stay a while — Sal&apos;s at the counter,
            LUC&apos;s on the math, Melli&apos;s working the volume, ACHEEVY
            signs the paper.
          </p>
          <Link
            href="/chat"
            className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-accent hover:underline"
          >
            Open the chat <ArrowUpRight className="h-3 w-3" />
          </Link>
        </motion.div>
      </main>
      <Footer />
    </>
  );
}
