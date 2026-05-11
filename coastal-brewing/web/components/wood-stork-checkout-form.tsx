"use client";

import { useState } from "react";

type WoodStorkTier = "standard" | "reserve";

const TIERS: Record<WoodStorkTier, { label: string; price: string }> = {
  standard: { label: "Wood Stork Standard · $499/yr (preview)", price: "$499" },
  reserve: { label: "Wood Stork Reserve · $999/yr (preview)", price: "$999" },
};

const WAITLIST_EMAIL = "wholesale@coastalbrewing.co";

export function WoodStorkCheckoutForm() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [tier, setTier] = useState<WoodStorkTier>("standard");

  const subject = `Wood Stork waitlist — ${TIERS[tier].label}`;
  const body =
    `Business name: ${businessName || "(your business)"}\n` +
    `Email: ${email || "(your email)"}\n` +
    `Tier of interest: ${TIERS[tier].label}\n\n` +
    `Please add me to the Wood Stork tier waitlist. I'll be ready to commit when ` +
    `Coastal Brewing Co. opens checkout.`;
  const mailto = `mailto:${WAITLIST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <form
      method="post"
      action={mailto}
      onSubmit={() => {
        // Native mailto handoff — let the browser take it.
      }}
      className="mt-6 flex flex-col gap-4"
    >
      <div className="flex flex-col gap-3">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Tier
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(TIERS) as WoodStorkTier[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className={`rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                tier === t
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-background text-foreground/70 hover:border-foreground/40"
              }`}
            >
              <span className="block font-medium">{TIERS[t].label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="business_name"
          required
          autoComplete="organization"
          placeholder="Business name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@your-business.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!email || !businessName}
          className="rounded-md bg-accent px-6 py-3 font-mono text-xs uppercase tracking-widest text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Join waitlist
        </button>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Wood Stork checkout opens soon · waitlist sends to {WAITLIST_EMAIL}
      </p>
    </form>
  );
}
