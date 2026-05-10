import Link from 'next/link';

/**
 * Per|Form Help page (SHIP-CHECKLIST Gate 8 · Item 45).
 * Answers the 5 standard questions the Ship Checklist requires:
 *   1. What does this app do?
 *   2. What's included in my plan?
 *   3. How do I upgrade / downgrade / cancel?
 *   4. Who do I contact for support?
 *   5. Is my data safe? Where is it stored?
 *
 * Public route — in middleware.ts PUBLIC_PATHS. Browse-first.
 */

const CONTACT_EMAIL = 'bpo@achievemor.io';

const COLORS = {
  bg: 'var(--pf-bg)',
  gold: '#D4A853',
  textMuted: 'rgba(255,255,255,0.5)',
  text: 'rgba(255,255,255,0.9)',
  surface: 'rgba(255,255,255,0.03)',
  border: 'rgba(212,168,83,0.2)',
};

export const metadata = {
  title: 'Help — Per|Form',
  description: 'Per|Form help, FAQ, and support contact.',
};

function Section({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <section
      className="p-6 rounded-xl"
      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
    >
      <h2 className="font-outfit text-xl font-extrabold tracking-tight mb-3" style={{ color: COLORS.gold }}>
        {q}
      </h2>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: COLORS.text }}>
        {children}
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.bg }}>
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full">
        <div className="mb-10">
          <span
            className="text-[10px] font-mono tracking-[0.4em] block mb-3"
            style={{ color: COLORS.textMuted }}
          >
            PER|FORM SUPPORT
          </span>
          <h1
            className="font-outfit text-4xl font-extrabold tracking-tight mb-3"
            style={{ color: COLORS.gold }}
          >
            Help &amp; FAQ
          </h1>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            Answers to the questions customers ask most often. Still stuck?{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline" style={{ color: COLORS.gold }}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <div className="space-y-5">
          <Section q="What is Per|Form?">
            <p>
              Per|Form is a sports talent intelligence engine powered by TIE — the Talent
              Intelligence Engine. We grade and rank players across the NFL, college football,
              NBA, and college basketball using a 40/30/30 formula over Performance,
              Attributes, and Intangibles.
            </p>
            <p>
              Core surfaces: a live NFL Draft board, an AI analyst studio, a TIE + NIL
              valuation tool for individual player uploads, and season-aware coverage that
              cycles between NFL Draft, NBA Playoffs, CFB season, and MLB/NHL windows
              throughout the year.
            </p>
          </Section>

          <Section q="What's included in my plan?">
            <p>
              Per|Form uses a token + tier model. New accounts start with 3 free starter
              tokens and the Free tier. Token bundles and unlimited monthly subscriptions
              unlock higher daily limits on draft simulations, voice generation, image
              generation, and TIE submissions.
            </p>
            <p>
              Live pricing:{' '}
              <Link href="/api/pricing" className="underline" style={{ color: COLORS.gold }}>
                /api/pricing
              </Link>{' '}
              returns the current package catalog + tier-limit table. Token balance and
              current tier are visible on your dashboard after signing in.
            </p>
          </Section>

          <Section q="How do I upgrade, downgrade, or cancel?">
            <p>
              <strong style={{ color: COLORS.gold }}>Upgrade:</strong> sign in, open the Draft
              page, pick a token bundle or Unlimited Monthly, pay via Stripe. Tokens credit
              immediately on payment confirmation; Unlimited flips your tier to Premium for
              30 days.
            </p>
            <p>
              <strong style={{ color: COLORS.gold }}>Cancel a subscription:</strong> POST{' '}
              <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>
                /api/draft/tokens
              </code>{' '}
              with body <code className="text-xs">{`{"action":"cancel_subscription"}`}</code>.
              Your access continues until the end of the current billing period; lazy expiry
              demotes your tier at that boundary. A first-party cancel button on the dashboard
              is on the follow-up list.
            </p>
            <p>
              <strong style={{ color: COLORS.gold }}>Downgrade:</strong> cancel the
              subscription; when the grace window closes your tier returns to Standard (if
              you've bought bundles) or Free.
            </p>
          </Section>

          <Section q="Who do I contact for support?">
            <p>
              Email{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=Per%7CForm%20support`}
                className="underline"
                style={{ color: COLORS.gold }}
              >
                {CONTACT_EMAIL}
              </a>
              . We aim to respond within 1 business day. Please include your account email and
              any relevant submission ID or page URL.
            </p>
            <p>
              System status: a lightweight health probe runs every 5 minutes at{' '}
              <Link href="/api/health" className="underline" style={{ color: COLORS.gold }}>
                /api/health
              </Link>{' '}
              — if the service is degraded you'll see the components breakdown there before
              emailing.
            </p>
          </Section>

          <Section q="Is my data safe? Where is it stored?">
            <p>
              Account data is stored on Neon Postgres (US East region) with 7-day
              point-in-time backup retention. Session cookies are set{' '}
              <code className="text-xs">HttpOnly · Secure · SameSite=strict</code> with a 24-hour
              rolling TTL; we never log email addresses, session tokens, or payment details.
            </p>
            <p>
              Private TIE submissions (where you opted out of public visibility) are not
              readable by other users — the API returns 404 on cross-account access attempts.
              Authenticated users can list and retrieve only their own submissions.
            </p>
            <p>
              See our{' '}
              <Link href="/legal/privacy" className="underline" style={{ color: COLORS.gold }}>
                Privacy Policy
              </Link>{' '}
              for the full treatment.
            </p>
          </Section>
        </div>

        <div className="mt-12 text-center text-[11px] font-mono" style={{ color: COLORS.textMuted }}>
          Last updated 2026-04-22 · Ship Checklist Gate 8 · Item 45
        </div>
      </main>
    </div>
  );
}
