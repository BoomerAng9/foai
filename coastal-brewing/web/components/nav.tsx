"use client";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/products", label: "Lineup" },
  { href: "/about/governance", label: "Commitment" },
  { href: "/chat", label: "Chat" },
  { href: "/cart", label: "Cart" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container flex h-20 items-center justify-between">
        <Wordmark size="md" />
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
        <button
          className="md:hidden text-foreground"
          aria-label="Open menu"
          type="button"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
