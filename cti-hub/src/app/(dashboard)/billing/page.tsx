'use client';

import { useState } from 'react';
import { Check, Zap, Crown, Coffee, Copy, ExternalLink } from 'lucide-react';
import { TIERS, type CommitmentWindow, getMonthlyPrice, getAnnualSavings } from '@/lib/subscription/tiers';
import { useAuth } from '@/hooks/useAuth';
import { generateReferralCode, getReferralUrl, REFERRAL_DISCOUNT_PERCENT } from '@/lib/subscription/referral';

export default function BillingPage() {
  const { user, profile } = useAuth();
  const [commitment, setCommitment] = useState<CommitmentWindow>('6-month');
  const [copied, setCopied] = useState(false);

  const currentTier = profile?.tier || 'free';
  const referralCode = user ? generateReferralCode(user.uid) : '';
  const referralUrl = referralCode ? getReferralUrl(referralCode) : '';

  function copyReferral() {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tierIcons = {
    'pay-per-use': Coffee,
    'starter': Zap,
    'growth': Crown,
    'enterprise': Crown,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-tight mb-1">
          Choose Your <span className="font-bold">Plan</span>
        </h1>
        <p className="label-mono">Preliminary pricing — commitment windows save you more</p>
      </div>

      {/* Commitment Toggle */}
      <div className="flex items-center justify-center gap-2 p-1 bg-bg-surface border border-border w-fit mx-auto">
        {(['3-month', '6-month', '9-month'] as CommitmentWindow[]).map(w => (
          <button
            key={w}
            onClick={() => setCommitment(w)}
            className={`px-4 py-2 text-[11px] font-mono font-bold transition-colors ${
              commitment === w ? 'bg-accent text-bg' : 'text-fg-secondary hover:text-fg'
            }`}
          >
            {w.replace('-', ' ').toUpperCase()}
            {w !== '3-month' && (
              <span className="ml-1.5 text-[9px] opacity-70">SAVE MORE</span>
            )}
          </button>
        ))}
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map(tier => {
          const Icon = tierIcons[tier.slug];
          const price = getMonthlyPrice(tier, commitment);
          const savings = getAnnualSavings(tier, commitment);
          const isCurrent = tier.slug === currentTier;

          return (
            <div
              key={tier.slug}
              className={`border p-6 flex flex-col ${
                tier.slug === 'growth' ? 'border-signal-live bg-signal-live/5' :
                isCurrent ? 'border-accent' : 'border-border'
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-5 h-5" style={{ color: tier.color }} />
                <h3 className="font-mono text-sm font-bold">{tier.name}</h3>
              </div>
              <p className="text-[11px] text-fg-tertiary mb-4">{tier.tagline}</p>

              {/* Price */}
              <div className="mb-4">
                {tier.slug === 'pay-per-use' ? (
                  <div>
                    <span className="text-3xl font-black">${tier.entryPrice}</span>
                    <span className="text-xs text-fg-tertiary ml-1">one-time entry</span>
                    <p className="text-[10px] text-fg-ghost mt-1">Then pay per use</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-3xl font-black">${price}</span>
                    <span className="text-xs text-fg-tertiary ml-1">/month</span>
                    {savings > 0 && (
                      <span className="ml-2 text-[10px] font-bold text-signal-live bg-signal-live/10 px-1.5 py-0.5">
                        SAVE {savings}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="flex-1 space-y-2 mb-6">
                {tier.features.map(f => (
                  <div key={f} className="flex items-start gap-2">
                    <Check className="w-3 h-3 mt-0.5 shrink-0" style={{ color: tier.color }} />
                    <span className="text-[11px] text-fg-secondary">{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {isCurrent ? (
                <div className="h-10 border border-accent flex items-center justify-center font-mono text-[10px] font-bold text-accent">

                  CURRENT PLAN
                </div>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/stripe/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ plan: tier.slug, commitment }),
                      });
                      const data = await res.json();
                      if (data.url) window.location.href = data.url;
                      else alert(data.error || 'Checkout unavailable — Stripe integration pending.');
                    } catch {
                      alert('Checkout unavailable — Stripe integration pending.');
                    }
                  }}
                  className="h-10 font-mono text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ background: tier.color, color: tier.slug === 'pay-per-use' ? '#fff' : '#000' }}
                >
                  {tier.slug === 'pay-per-use' ? 'GET STARTED — $7' : `UPGRADE — $${price}/MO`}
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Referral Section */}
      {user && (
        <div className="border border-border bg-bg-surface p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">🎁</span>
            <div>
              <h3 className="font-mono text-sm font-bold">Invite & Earn</h3>
              <p className="text-[11px] text-fg-tertiary">
                Share your link. When someone signs up, you get {REFERRAL_DISCOUNT_PERCENT}% off your next billing cycle.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-10 bg-bg border border-border px-3 flex items-center">
              <span className="font-mono text-xs text-fg-secondary truncate">{referralUrl}</span>
            </div>
            <button onClick={copyReferral} className="btn-solid h-10 px-4 text-[10px] flex items-center gap-1.5">
              <Copy className="w-3 h-3" />
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>

          <p className="font-mono text-[9px] text-fg-ghost mt-2">
            Your code: {referralCode} · Attribution tracked via referral codes, not cookies
          </p>
        </div>
      )}

      <p className="text-center font-mono text-[9px] text-fg-ghost">
        All prices are preliminary. Stripe integration pending.
      </p>
    </div>
  );
}
