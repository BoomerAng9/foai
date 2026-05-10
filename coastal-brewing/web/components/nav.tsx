"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

const NAV_LINKS = [
  { href: "/products", label: "Offerings" },
  { href: "/recipes", label: "Recipes" },
  { href: "/team", label: "Team" },
  { href: "/about/governance", label: "Commitment" },
  { href: "/chat", label: "Chat" },
  { href: "/chat?agent=sales", label: "Order" },
];

const DRAWER_GROUPS = [
  {
    label: "Shop",
    links: [
      { href: "/products?cat=coffee", label: "Coffee" },
      { href: "/products?cat=tea", label: "Tea" },
      { href: "/products?cat=matcha", label: "Matcha" },
      { href: "/products?cat=subscription", label: "Subscriptions" },
      { href: "/merch", label: "Merch" },
      { href: "/products", label: "Shop All" },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/account", label: "My Account" },
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
        <div className="container flex h-20 items-center justify-between">
          <Wordmark size="md" />
          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-[10px] uppercase tracking-wordmark text-foreground/80 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {/* Mobile hamburger */}
          <button
            className="md:hidden text-foreground p-2 -mr-2"
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
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
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
            className="fixed right-0 top-0 z-50 h-full w-80 bg-background border-l border-border/60 shadow-2xl md:hidden flex flex-col"
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
