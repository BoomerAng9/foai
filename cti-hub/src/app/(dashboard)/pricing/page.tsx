"use client";

import React, { useState } from 'react';
import { Check, Coffee, Shield, ExternalLink, CreditCard, Users } from 'lucide-react';
import { toast } from 'sonner';
import { PLAN_CONFIG } from '@/lib/billing/plans';
import { useAuth } from '@/hooks/useAuth';

export default function PricingPage() {
  const { profile } = useAuth();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const handleUpgrade = async (plan: string) => {
    setPendingPlan(plan);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const payload = await response.json();
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
          The Deploy Platform runs on tokenized usage. Every operation — chat, generation, research, video — consumes tokens.
          Subscribers get the best rates. Pay-Per-Use is always available for everyone.
        </p>
      </div>

      {/* Community Message */}
      <div className="card bg-bg-elevated border-accent/20">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-accent mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm mb-2">We&apos;re building a community.</p>
            <p className="text-fg-secondary text-xs leading-relaxed">
              Pricing tiers have evolved with tokenization — there is no true &ldquo;unlimited.&rdquo; We have real expenses
              maintaining the infrastructure, models, and agent workforce that power this platform. At the same time,
              we will always keep our pricing competitive and affordable. Those who invest in us through subscriptions
              get the lowest rates — because when you grow, we grow. Every token you spend fuels the platform forward.
            </p>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(PLAN_CONFIG).map(([key, plan]) => {
          const isCurrent = profile?.tier === key;

          return (
            <div
              key={key}
              className={`card flex flex-col gap-5 ${plan.highlight ? 'border-accent ring-1 ring-accent/20' : ''}`}
            >
              {plan.highlight && (
                <div className="flex items-center gap-1.5 -mt-1">
                  <Coffee className="w-3 h-3 text-accent" />
                  <span className="font-mono text-[9px] text-accent font-bold tracking-wider uppercase">Best for most users</span>
                </div>
              )}

              <div>
                <p className="label-mono mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-fg-tertiary text-xs">{plan.period}</span>
                </div>
                {plan.tokenAllotment && (
                  <p className="font-mono text-[10px] text-signal-success mt-1">{plan.tokenAllotment}</p>
                )}
                {plan.upcharge && (
                  <p className="font-mono text-[9px] text-fg-ghost mt-0.5">{plan.upcharge}</p>
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
                onClick={() => !isCurrent && handleUpgrade(key)}
                disabled={isCurrent || pendingPlan === key}
                className={`w-full py-2.5 font-mono text-[11px] font-bold tracking-wider transition-all ${
                  isCurrent
                    ? 'bg-bg-elevated text-fg-ghost cursor-default'
                    : plan.highlight
                    ? 'btn-solid'
                    : 'bg-bg-elevated text-fg hover:bg-accent hover:text-bg cursor-pointer'
                }`}
              >
                {isCurrent ? 'CURRENT PLAN' : pendingPlan === key ? 'REDIRECTING...' : plan.cta.toUpperCase()}
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
            <h3 className="font-bold text-sm mb-2">Pay through Fiverr — Extra Protection</h3>
            <p className="text-fg-secondary text-xs leading-relaxed mb-3">
              For an additional layer of security, you can purchase any tier through Fiverr.
              Fiverr provides an escrow barrier — your payment is held securely until services are delivered.
              In the age of AI and evolving digital security, this gives you peace of mind.
            </p>
            <p className="text-fg-secondary text-xs leading-relaxed mb-4">
              <strong>Refund policy:</strong> Since AI services are consumed upon use, full refunds are not available
              once tokens are spent. However, Fiverr&apos;s resolution center allows partial refunds for unused portions.
              This is an extra layer of protection that traditional payment processors don&apos;t offer.
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

      {/* Token Comparison */}
      <div className="card bg-bg-elevated">
        <p className="label-mono mb-4">What does a token buy?</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { action: 'Chat message', tokens: '~500', icon: '💬' },
            { action: 'Research query', tokens: '~2,000', icon: '🔍' },
            { action: 'Image generation', tokens: '~5,000', icon: '🎨' },
            { action: 'Video scene (5s)', tokens: '~15,000', icon: '🎬' },
            { action: 'Scouting report', tokens: '~3,000', icon: '🏈' },
            { action: 'Content calendar', tokens: '~4,000', icon: '📅' },
            { action: 'Code generation', tokens: '~2,500', icon: '💻' },
            { action: 'Voice synthesis', tokens: '~1,000', icon: '🎙' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-3 border border-border">
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-xs font-medium">{item.action}</p>
                <p className="font-mono text-[10px] text-fg-ghost">{item.tokens} tokens</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-center font-mono text-[10px] text-fg-ghost">
        The Deploy Platform &middot; Tokenized pricing &middot; Powered by ACHIEVEMOR
      </p>
    </div>
  );
}
