"use client";

import { useState } from "react";

type PoolerTier = "standard" | "plus";

const TIERS: Record<PoolerTier, { label: string; price: string }> = {
  standard: { label: "Pooler Pass · $49/yr (preview)", price: "$49" },
  plus: { label: "Pooler Pass Plus · $99/yr (preview)", price: "$99" },
};

const WAITLIST_EMAIL = "locals@coastalbrewing.co";
const ZIP_REGEX = /^\d{5}$/;

export function PoolerPassCheckoutForm() {
  const [zip, setZip] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<PoolerTier>("standard");
  const [zipError, setZipError] = useState<string | null>(null);

  const zipValid = ZIP_REGEX.test(zip);
  const ready = zipValid && email.length > 0;

  const subject = `Pooler Pass waitlist — ${TIERS[tier].label}`;
  const body =
    `ZIP: ${zip || "(your ZIP)"}\n` +
    `Email: ${email || "(your email)"}\n` +
    `Tier of interest: ${TIERS[tier].label}\n\n` +
    `Please add me to the Pooler Pass waitlist. I'll be ready to confirm eligibility ` +
    `and commit when Coastal Brewing Co. opens checkout.`;
  const mailto = `mailto:${WAITLIST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <form method="post" action={mailto} className="mt-6 flex flex-col gap-4">
      {/* ZIP */}
      <div className="flex flex-col gap-3">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Your ZIP — local 50–100 mi from Pooler 31322
        </label>
        <input
          type="text"
          name="zip"
          inputMode="numeric"
          pattern="\d{5}"
          maxLength={5}
          required
          placeholder="ZIP code"
          value={zip}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 5);
            setZip(next);
            setZipError(next.length === 5 && !ZIP_REGEX.test(next) ? "Enter 5-digit ZIP." : null);
          }}
          className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
        />
        {zipError && (
          <p className="font-mono text-[11px] text-destructive" role="alert">
            {zipError}
          </p>
        )}
      </div>

      {/* Tier */}
      <div className="flex flex-col gap-3">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Tier
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(TIERS) as PoolerTier[]).map((t) => (
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
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@your-coast.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!ready}
          className="rounded-md bg-accent px-6 py-3 font-mono text-xs uppercase tracking-widest text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Join waitlist
        </button>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Pooler Pass checkout opens soon · ZIP eligibility verified at signup · waitlist sends to{" "}
        {WAITLIST_EMAIL}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Outside the 100-mi radius? See{" "}
        <a href="/membership" className="text-accent underline-offset-4 hover:underline">
          Coastal Custee Card ($199/yr)
        </a>
      </p>
    </form>
  );
}
