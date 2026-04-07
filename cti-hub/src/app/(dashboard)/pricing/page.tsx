"use client";

import React, { useState } from 'react';
import { Check, Coffee, Shield, ExternalLink, CreditCard, Users } from 'lucide-react';
import { toast } from 'sonner';
import { PLAN_LIST, type CommitmentWindow, getTotalPrice, getSavingsPercent } from '@/lib/billing/plans';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';
import { OwnerClearanceStamp } from '@/components/billing/OwnerClearanceStamp';

export default function PricingPage() {
  const { user, profile } = useAuth();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [commitment] = useState<CommitmentWindow>('6-month');

  const ownerAccess = isOwner(user?.email);

  const handleUpgrade = async (planId: string) => {
    setPendingPlan(planId);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, commitment }),
      });
      const payload = await response.json();

      // Owner bypass — server returns owner_bypass:true and we redirect to
      // the dashboard without ever touching Stripe.
      if (payload?.owner_bypass) {
        toast.success(payload.message ?? 'Owner clearance — no checkout required');
        window.location.href = payload.redirect_url ?? '/smelter-os?owner_unlimited=1';
        return;
      }

      if (!response.ok) throw new Error(payload?.error || 'Unable to start checkout.');
      if (!payload?.url) throw new Error('Checkout URL not available.');
      window.location.href = payload.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start checkout.';
      toast.error(message);
      setPendingPlan(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Header */}
      <div>
        <p className="label-mono mb-2">Pricing</p>
        <h1 className="text-3xl font-light tracking-tight">
          Select your <span className="font-bold">execution tier</span>
        </h1>
        <p className="text-fg-secondary text-sm mt-3 max-w-2xl leading-relaxed">
          The Deploy Platform runs on credits. Every operation — chat, generation, research, video — consumes credits.
          Subscribers get more credits and the best rates. Pay Per Use is always available for everyone.
        </p>
      </div>

      {/* Owner Clearance Stamp — replaces tier flow for owner accounts */}
      {ownerAccess && <OwnerClearanceStamp variant="banner" />}

      {/* Community Message */}
      <div className="card bg-bg-elevated border-accent/20">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-accent mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm mb-2">We&apos;re building a community.</p>
            <p className="text-fg-secondary text-xs leading-relaxed">
              Those who invest in us through subscriptions get the most credits and lowest effective rates.
              Pay for 3, 6, or 9 months upfront to save more. 9-month commitment gives you a full year of access.
            </p>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_LIST.map((plan) => {
          const isCurrent = (profile?.tier as string) === plan.id;
          const total = getTotalPrice(plan, commitment);
          const savings = getSavingsPercent(plan, commitment);

          return (
            <div
              key={plan.id}
              className={`card flex flex-col gap-5 ${plan.recommended ? 'border-accent ring-1 ring-accent/20' : ''}`}
            >
              {plan.recommended && (
                <div className="flex items-center gap-1.5 -mt-1">
                  <Coffee className="w-3 h-3 text-accent" />
                  <span className="font-mono text-[9px] text-accent font-bold tracking-wider uppercase">Recommended</span>
                </div>
              )}

              <div>
                <p className="label-mono mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold">
                    ${plan.billing === 'one-time' ? plan.price : total}
                  </span>
                  <span className="text-fg-tertiary text-xs">
                    {plan.billing === 'one-time' ? 'one-time' : `/ ${commitment.replace('-', ' ')}`}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-signal-success mt-1">
                  {plan.credits.toLocaleString()} credits{plan.billing === 'subscription' ? '/month' : ' included'}
                </p>
                {savings > 0 && (
                  <p className="font-mono text-[9px] text-fg-ghost mt-0.5">Save {savings}% vs monthly</p>
                )}
              </div>

              <div className="space-y-2.5 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-3 h-3 text-signal-success mt-0.5 shrink-0" />
                    <span className="text-xs text-fg-secondary leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => !isCurrent && handleUpgrade(plan.id)}
                disabled={isCurrent || pendingPlan === plan.id}
                className={`w-full py-2.5 font-mono text-[11px] font-bold tracking-wider transition-all ${
                  isCurrent
                    ? 'bg-bg-elevated text-fg-ghost cursor-default'
                    : plan.recommended
                    ? 'btn-solid'
                    : 'bg-bg-elevated text-fg hover:bg-accent hover:text-bg cursor-pointer'
                }`}
              >
                {isCurrent
                  ? 'CURRENT PLAN'
                  : pendingPlan === plan.id
                  ? 'REDIRECTING...'
                  : plan.billing === 'one-time'
                  ? `GET STARTED — $${plan.price}`
                  : `SELECT — $${total}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Fiverr Payment Option */}
      <div className="card">
        <div className="flex items-start gap-4">
          <Shield className="w-6 h-6 text-signal-success shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm mb-2">Pay through Fiverr -- Extra Protection</h3>
            <p className="text-fg-secondary text-xs leading-relaxed mb-3">
              For an additional layer of security, you can purchase any tier through Fiverr.
              Fiverr provides an escrow barrier -- your payment is held securely until services are delivered.
            </p>
            <a
              href="https://www.fiverr.com/achievemor"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-bracket text-xs inline-flex items-center gap-1.5"
            >
              <CreditCard className="w-3 h-3" />
              Pay via Fiverr
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center font-mono text-[10px] text-fg-ghost">
        The Deploy Platform -- Credit-based pricing -- Powered by ACHIEVEMOR
      </p>
    </div>
  );
}
