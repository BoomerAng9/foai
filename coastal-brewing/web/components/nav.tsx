"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

// NAV_LINKS removed 2026-05-12 — the flat desktop top-bar was retired in
// favor of a single drawer surface that's identical on desktop + mobile.
// All previously-listed routes are reachable from DRAWER_GROUPS below.

const DRAWER_GROUPS = [
  {
    label: "Shop",
    links: [
      { href: "/products?cat=coffee", label: "Coffee" },
      { href: "/products?cat=tea", label: "Tea" },
      { href: "/products?cat=matcha", label: "Matcha" },
      { href: "/membership", label: "Subscriptions" },
      { href: "/pricing", label: "Pricing & Tiers" },
      { href: "/membership", label: "Coastal Custee Card Plan" },
      { href: "/wood-stork", label: "Wood Stork (B2B)" },
      { href: "/pooler-pass", label: "Pooler Pass (Local)" },
      { href: "/recipes", label: "Recipes" },
      { href: "/compare", label: "How we compare" },
      { href: "/live", label: "Live look-in (members)" },
      { href: "/merch", label: "Merch" },
      { href: "/products", label: "Shop All" },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/account", label: "My Account" },
      { href: "/companion", label: "C|Brew Companion" },
      { href: "/auth/login", label: "Sign In" },
      { href: "/auth/signup", label: "Open an Account" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/team", label: "Meet the Team" },
      { href: "/about", label: "About" },
      { href: "/about/governance", label: "Governance" },
      { href: "/partners", label: "AIMS Partner Program" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    label: "Policies",
    links: [
      { href: "/policies", label: "All Policies" },
      { href: "/policies/privacy", label: "Privacy" },
      { href: "/policies/terms", label: "Terms" },
      { href: "/policies/shipping", label: "Shipping" },
    ],
  },
];

function AccordionGroup({
  group,
  onNavigate,
}: {
  group: (typeof DRAWER_GROUPS)[0];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
      >
        {group.label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <ul className="pb-3 pl-6">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    className="block py-2.5 text-sm text-foreground/80 hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Nav() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Lock scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container relative flex h-20 items-center justify-between">
          <Wordmark size="md" />
          {/* Owner directive 2026-05-12: brand wordmark in the middle of
              the header on every page. Absolutely positioned + centered
              so it sits between the logo (left) and hamburger (right)
              without pushing either off the row. */}
          <Link
            href="/"
            aria-label="Coastal Brewing Co. — home"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-lg font-semibold tracking-[-0.01em] text-foreground hover:text-foreground/80 transition-colors md:text-xl"
          >
            Coastal Brewing Co.
          </Link>
          {/* Owner directive 2026-05-12: desktop mirrors the mobile menu
              structure — hamburger + drawer only. The flat top-bar of
              NAV_LINKS that previously rendered on desktop has been
              retired. Both viewports now use the single drawer surface
              (Shop / Account / Company / Policies + CTA row). */}
          <button
            className="text-foreground p-2 -mr-2"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            type="button"
            onClick={() => setDrawerOpen((o) => !o)}
          >
            <AnimatePresence mode="wait" initial={false}>
              {drawerOpen ? (
                <motion.span
                  key="x"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="h-5 w-5" />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="h-5 w-5" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      {/* Backdrop */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
            onClick={closeDrawer}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Slide-out drawer — right side */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 z-50 h-full w-80 bg-background border-l border-border/60 shadow-2xl flex flex-col"
          >
            {/* Drawer header */}
            <div className="flex h-20 items-center justify-between px-6 border-b border-border/60">
              <Wordmark size="sm" asLink={false} />
              <button
                onClick={closeDrawer}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sign-in CTA pinned to the top of the drawer. Owner bug
                2026-05-12: existing-account customers had no obvious
                login path — Sign In was buried 2 layers deep in the
                Account accordion. Now it's the first thing visible
                inside the drawer body. Magic-link login (passwordless)
                via /api/v1/auth/login; verify cookie sets coastal_uid
                on click-through. */}
            <div className="border-b border-border/60 px-6 py-4">
              <Link
                href="/auth/login"
                onClick={closeDrawer}
                className="flex items-center justify-between rounded-md border border-foreground/20 bg-foreground/[0.03] px-4 py-3 text-sm font-medium text-foreground hover:border-foreground/40 hover:bg-foreground/[0.06] transition-colors"
              >
                <span>Sign in to your account</span>
                <span aria-hidden="true" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">passwordless</span>
              </Link>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                New here? <Link href="/auth/signup" onClick={closeDrawer} className="text-foreground/80 hover:text-foreground">Open an account →</Link>
              </p>
            </div>

            {/* Accordion link groups */}
            <nav className="flex-1 overflow-y-auto py-2">
              {DRAWER_GROUPS.map((group) => (
                <AccordionGroup
                  key={group.label}
                  group={group}
                  onNavigate={closeDrawer}
                />
              ))}
            </nav>

            {/* CTA row at bottom */}
            <div className="border-t border-border/60 p-6 flex flex-col gap-3">
              <Link
                href="/chat"
                onClick={closeDrawer}
                className="flex items-center justify-center rounded-full bg-accent px-5 py-3 text-xs font-semibold uppercase tracking-widest text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Chat with us
              </Link>
              <Link
                href="/chat?agent=sales"
                onClick={closeDrawer}
                className="flex items-center justify-center rounded-full border border-border px-5 py-3 text-xs font-semibold uppercase tracking-widest text-foreground hover:border-foreground/40 transition-colors"
              >
                Order now
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
