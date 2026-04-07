'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Zap, Crown, Coffee, Rocket, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  PLAN_LIST,
  type Plan,
  type CommitmentWindow,
  getEffectiveMonthly,
  getTotalPrice,
  getSavingsPercent,
  SQWAADRUN_TIERS,
  type SqwaadrunTierId,
} from '@/lib/billing/plans';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';
import { OwnerClearanceStamp } from '@/components/billing/OwnerClearanceStamp';
import { generateReferralCode, getReferralUrl, REFERRAL_DISCOUNT_PERCENT } from '@/lib/subscription/referral';

const PLAN_ICONS: Record<string, typeof Coffee> = {
  pay_per_use: Coffee,
  bucket_list: Zap,
  premium: Crown,
  lfg: Rocket,
};

const COMMITMENT_LABELS: { value: CommitmentWindow; label: string; note?: string }[] = [
  { value: 'monthly', label: 'MONTHLY' },
  { value: '3-month', label: '3 MONTH' },
  { value: '6-month', label: '6 MONTH', note: 'POPULAR' },
  { value: '9-month', label: '9 MONTH', note: 'BEST VALUE' },
];

export default function BillingPage() {
  const { user, profile } = useAuth();
  const [commitment, setCommitment] = useState<CommitmentWindow>('6-month');
  const [copied, setCopied] = useState(false);

  const currentTier = (profile?.tier || 'free') as string;
  const userEmail = user?.email ?? null;
  const ownerAccess = isOwner(userEmail);

  // Sqwaadrun add-on state from profile
  const p = (profile || {}) as Record<string, unknown>;
  const sqwaadrunTierId = (p.sqwaadrun_tier as SqwaadrunTierId | null) || null;
  const sqwaadrunStatus = (p.sqwaadrun_status as string | null) || null;
  const sqwaadrunUsed = Number(p.sqwaadrun_missions_used || 0);
  const sqwaadrunQuota = Number(p.sqwaadrun_monthly_quota || 0);
  const sqwaadrunPeriodEnd = (p.sqwaadrun_period_end as string | null) || null;
  const sqwaadrunActive = sqwaadrunStatus === 'active' && sqwaadrunTierId !== null;
  const sqwaadrunTier = sqwaadrunTierId ? SQWAADRUN_TIERS[sqwaadrunTierId] : null;

  const referralCode = user ? generateReferralCode(user.uid) : '';
  const referralUrl = referralCode ? getReferralUrl(referralCode) : '';

  function copyReferral() {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSelectPlan(plan: Plan) {
    // Owner short-circuit with positive feedback (Phase 0). Replaces the
    // previous silent return so owners get a confirmation toast and a
    // dashboard redirect instead of nothing happening on click.
    if (ownerAccess) {
      toast.success('Owner clearance — unlimited berth active');
      window.location.href = '/dashboard?owner_unlimited=1';
      return;
    }
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, commitment }),
      });
      const data = await res.json();

      // Server-side owner bypass safety net — even if a non-owner-marked
      // session somehow reaches here as an owner, the server response
      // will carry owner_bypass:true and we redirect cleanly.
      if (data.owner_bypass) {
        toast.success(data.message ?? 'Owner clearance — no checkout required');
        window.location.href = data.redirect_url ?? '/dashboard?owner_unlimited=1';
        return;
      }

      if (data.url) window.location.href = data.url;
      else toast.error(data.error || 'Checkout unavailable — Stripe integration pending.');
    } catch {
      toast.error('Checkout unavailable — Stripe integration pending.');
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-light tracking-tight mb-1">
          The Deploy Platform <span className="font-bold">Plans</span>
        </h1>
        <p className="font-mono text-[11px] text-[#888]">
          Credits refresh monthly. Mix and match what you need inside your plan.
        </p>
      </div>

      {/* Owner Clearance Stamp — replaces the prior small "Owner Access" strip
          with the full Phase 0 visual treatment. Tier grid below remains
          visible as a read-only preview. */}
      {ownerAccess && <OwnerClearanceStamp variant="banner" />}

      {/* Sqwaadrun Add-On Panel */}
      <div
        className="border-2 p-5"
        style={{
          borderColor: sqwaadrunActive ? 'rgba(245,166,35,0.5)' : 'rgba(245,166,35,0.25)',
          background: sqwaadrunActive
            ? 'linear-gradient(165deg, rgba(245,166,35,0.08), transparent)'
            : 'rgba(245,166,35,0.03)',
          borderRadius: '3px',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-mono tracking-[0.3em]" style={{ color: '#F5A623' }}>
                / SQWAADRUN ADD-ON
              </span>
              {sqwaadrunActive && (
                <span
                  className="text-[8px] font-mono tracking-wider px-2 py-0.5"
                  style={{
                    color: '#22D3EE',
                    background: 'rgba(34,211,238,0.1)',
                    border: '1px solid rgba(34,211,238,0.4)',
                    borderRadius: '2px',
                  }}
                >
                  ACTIVE
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold">
              {sqwaadrunActive && sqwaadrunTier ? sqwaadrunTier.name : 'The Sqwaadrun'}
            </h3>
            <p className="text-xs text-[#888] mt-1">
              {sqwaadrunActive && sqwaadrunTier
                ? sqwaadrunTier.tagline
                : '17-Hawk web intelligence fleet — separate add-on subscription, 20% off for active Deploy plans.'}
            </p>

            {sqwaadrunActive && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <div className="text-[8px] font-mono opacity-60 uppercase tracking-wider">Price</div>
                  <div className="text-base font-bold mt-0.5" style={{ color: '#F5A623' }}>
                    ${sqwaadrunTier?.price_monthly}/mo
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono opacity-60 uppercase tracking-wider">Used</div>
                  <div className="text-base font-bold mt-0.5">
                    {sqwaadrunUsed.toLocaleString()}
                    <span className="text-[10px] opacity-50"> / {sqwaadrunQuota.toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono opacity-60 uppercase tracking-wider">Hawks</div>
                  <div className="text-base font-bold mt-0.5" style={{ color: '#22D3EE' }}>
                    {sqwaadrunTier?.hawks_unlocked}/17
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono opacity-60 uppercase tracking-wider">Resets</div>
                  <div className="text-base font-bold mt-0.5">
                    {sqwaadrunPeriodEnd
                      ? new Date(sqwaadrunPeriodEnd).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            {sqwaadrunActive ? (
              <>
                <Link
                  href="/sqwaadrun"
                  className="px-4 py-2 text-[10px] font-mono tracking-wider font-bold"
                  style={{
                    background: '#F5A623',
                    color: '#050810',
                    borderRadius: '2px',
                  }}
                >
                  HAWK BAY →
                </Link>
                <Link
                  href="/plug/sqwaadrun#deploy"
                  className="px-4 py-2 text-[10px] font-mono tracking-wider"
                  style={{
                    border: '1px solid rgba(245,166,35,0.5)',
                    color: '#F5A623',
                    borderRadius: '2px',
                  }}
                >
                  UPGRADE
                </Link>
              </>
            ) : (
              <Link
                href="/plug/sqwaadrun#deploy"
                className="px-5 py-2 text-[10px] font-mono tracking-wider font-bold"
                style={{
                  background: '#F5A623',
                  color: '#050810',
                  borderRadius: '2px',
                }}
              >
                ADD THE SQWAADRUN →
              </Link>
            )}
          </div>
        </div>

        {/* Quota progress bar */}
        {sqwaadrunActive && sqwaadrunQuota > 0 && (
          <div className="mt-4">
            <div
              className="h-1.5 w-full overflow-hidden border"
              style={{
                borderColor: 'rgba(245,166,35,0.3)',
                background: 'rgba(245,166,35,0.05)',
              }}
            >
              <div
                className="h-full"
                style={{
                  width: `${Math.min(100, (sqwaadrunUsed / sqwaadrunQuota) * 100)}%`,
                  background: 'linear-gradient(90deg, #F5A623, #F97316)',
                  boxShadow: '0 0 8px rgba(245,166,35,0.5)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Commitment Toggle — only for subscription plans */}
      <div className="flex items-center justify-center gap-1 p-1 bg-[#111] border border-[#222] w-fit mx-auto">
        {COMMITMENT_LABELS.map(({ value, label, note }) => (
          <button
            key={value}
            onClick={() => setCommitment(value)}
            className={`px-4 py-2 text-[11px] font-mono font-bold transition-colors relative ${
              commitment === value
                ? 'bg-[#E8A020] text-[#0A0A0A]'
                : 'text-[#888] hover:text-white'
            }`}
          >
            {label}
            {note && (
              <span className={`ml-1.5 text-[8px] ${
                commitment === value ? 'text-[#0A0A0A]/60' : 'text-[#E8A020]/70'
              }`}>
                {note}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_LIST.map((plan) => {
          const Icon = PLAN_ICONS[plan.id] || Zap;
          const isCurrent = plan.id === currentTier;
          const isRecommended = plan.recommended;
          const savings = getSavingsPercent(plan, commitment);
          const effectiveMonthly = getEffectiveMonthly(plan, commitment);
          const totalPrice = getTotalPrice(plan, commitment);

          return (
            <div
              key={plan.id}
              className={`border p-6 flex flex-col relative ${
                isRecommended
                  ? 'border-[#E8A020] bg-[#E8A020]/5'
                  : isCurrent
                  ? 'border-[#E8A020]/50'
                  : 'border-[#222] bg-[#111]'
              }`}
            >
              {/* Recommended badge */}
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E8A020] text-[#0A0A0A] font-mono text-[9px] font-bold px-3 py-1 tracking-wider">
                  RECOMMENDED
                </div>
              )}

              {/* Header */}
              <div className="flex items-center gap-2 mb-2 mt-1">
                <Icon className="w-5 h-5" style={{ color: plan.color }} />
                <h3 className="font-mono text-sm font-bold text-white tracking-wide">{plan.name}</h3>
              </div>
              <p className="text-[11px] text-[#777] mb-4">{plan.description}</p>

              {/* Price */}
              <div className="mb-4">
                {plan.billing === 'one-time' ? (
                  <div>
                    <span className="text-3xl font-black text-white">${plan.price}</span>
                    <span className="text-xs text-[#777] ml-1">one-time entry</span>
                    <p className="text-[10px] text-[#555] mt-1">Then pay per use</p>
                  </div>
                ) : (
                  <div>
                    {commitment === 'monthly' ? (
                      <>
                        <span className="text-3xl font-black text-white">${totalPrice}</span>
                        <span className="text-xs text-[#777] ml-1">/month</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-black text-white">${totalPrice}</span>
                        <span className="text-xs text-[#777] ml-1">
                          / {commitment.replace('-', ' ')}
                        </span>
                        <p className="text-[10px] text-[#999] mt-1">
                          ~${effectiveMonthly}/mo effective
                        </p>
                      </>
                    )}
                    {savings > 0 && (
                      <span className="inline-block mt-1.5 text-[10px] font-bold font-mono text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5">
                        SAVE {savings}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Credits */}
              <div className="mb-4 py-2 px-3 bg-[#0A0A0A] border border-[#222]">
                <span className="font-mono text-xs text-[#E8A020] font-bold">{plan.credits.toLocaleString()}</span>
                <span className="text-[10px] text-[#777] ml-1.5">credits{plan.billing === 'subscription' ? '/month' : ' included'}</span>
              </div>

              {/* Features */}
              <div className="flex-1 space-y-2 mb-6">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check className="w-3 h-3 mt-0.5 shrink-0" style={{ color: plan.color }} />
                    <span className="text-[11px] text-[#999]">{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {ownerAccess ? (
                <div className="h-10 border border-[#E8A020]/30 flex items-center justify-center font-mono text-[10px] font-bold text-[#E8A020]">
                  UNLOCKED
                </div>
              ) : isCurrent ? (
                <div className="h-10 border border-[#E8A020] flex items-center justify-center font-mono text-[10px] font-bold text-[#E8A020]">
                  CURRENT PLAN
                </div>
              ) : (
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className="h-10 font-mono text-[10px] font-bold tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{
                    background: plan.color,
                    color: plan.id === 'pay_per_use' ? '#fff' : '#0A0A0A',
                  }}
                >
                  {plan.billing === 'one-time'
                    ? `GET STARTED — $${plan.price}`
                    : `SELECT — $${totalPrice}`}
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 9-month callout */}
      <div className="text-center border border-[#222] bg-[#111] py-6 px-4">
        <p className="font-mono text-xs text-[#999]">
          <span className="text-[#E8A020] font-bold">9-month commitment = 12 months of access.</span>{' '}
          Pay for 9, get the full year. That is the LFG way.
        </p>
      </div>

      {/* Referral Section */}
      {user && (
        <div className="border border-[#222] bg-[#111] p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">*</span>
            <div>
              <h3 className="font-mono text-sm font-bold text-white">Invite & Earn</h3>
              <p className="text-[11px] text-[#777]">
                Share your link. When someone signs up, you get {REFERRAL_DISCOUNT_PERCENT}% off your next billing cycle.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-10 bg-[#0A0A0A] border border-[#222] px-3 flex items-center">
              <span className="font-mono text-xs text-[#999] truncate">{referralUrl}</span>
            </div>
            <button
              onClick={copyReferral}
              className="h-10 px-4 font-mono text-[10px] font-bold bg-[#E8A020] text-[#0A0A0A] flex items-center gap-1.5"
            >
              <Copy className="w-3 h-3" />
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>

          <p className="font-mono text-[9px] text-[#555] mt-2">
            Your code: {referralCode} -- Attribution tracked via referral codes, not cookies
          </p>
        </div>
      )}

      <p className="text-center font-mono text-[9px] text-[#555]">
        All prices in USD. Stripe integration pending.
      </p>
    </div>
  );
}
