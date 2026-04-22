/**
 * /legal/tos — Per|Form Terms of Service (MIM §45 template)
 *
 * Plain-English Terms. Owner-counsel review REQUIRED before public GA.
 * This template satisfies MIM §45 ("templated with disclaimer if self-
 * serve") for the current /tie/submit surface; any material change to the
 * collected data set or downstream use must trigger a re-review.
 */

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata = { title: 'Terms of Service · Per|Form' };

export default function TermsPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-[#05060A] text-white" style={{ fontFamily: 'var(--font-geist-sans, system-ui)' }}>
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <div>
          <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/30 mb-2">ACHIEVEMOR · Per|Form</div>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '48px', letterSpacing: '0.04em' }} className="text-[#D4A853]">
            Terms of Service
          </h1>
          <p className="text-xs text-white/40 mt-1 font-mono">Last updated: 2026-04-22</p>
        </div>

        {/* Legal-review disclosure banner (Gate 8 · Item 46) */}
        <div
          className="rounded-lg px-4 py-3 text-xs font-mono"
          style={{
            background: 'rgba(212,168,83,0.08)',
            border: '1px solid rgba(212,168,83,0.25)',
            color: 'rgba(255,255,255,0.75)',
          }}
          role="note"
        >
          <strong style={{ color: '#D4A853' }}>REVIEW STATUS:</strong>{' '}
          Template reviewed by product owner. <u>Not yet reviewed by outside counsel.</u>{' '}
          Material changes trigger a re-review. Questions about these terms:{' '}
          <a href="mailto:bpo@achievemor.io?subject=Per%7CForm%20Terms%20question" className="underline" style={{ color: '#D4A853' }}>
            bpo@achievemor.io
          </a>.
        </div>

        <Section title="1. Who we are">
          <p>Per|Form is a product of ACHIEVEMOR. By using this site you agree to these Terms. If you don&apos;t agree, don&apos;t use the site.</p>
        </Section>

        <Section title="2. What Per|Form does">
          <p>Per|Form is a Talent Intelligence Engine for football prospects. It displays public-sourced player data (ESPN, NFL.com, The Athletic, etc.) alongside proprietary Per|Form grades, badges, and NIL-cohort valuations. Per|Form also accepts user-submitted player profiles via <code>/tie/submit</code> and returns a grade and comparable cohort.</p>
        </Section>

        <Section title="3. Eligibility">
          <p>You must be the player, a parent/guardian of the player, the player&apos;s school, team, or authorized agent to submit a profile. You must have legal authority to grant the consents at submission time.</p>
        </Section>

        <Section title="4. Submitted content">
          <ul className="list-disc list-inside space-y-1 text-white/70">
            <li>You warrant that all submitted measurements, grades, and ratings are accurate to the best of your knowledge.</li>
            <li>You grant Per|Form a non-exclusive license to store, analyze, and display the submitted profile for purposes of grading + NIL benchmarking.</li>
            <li>You may request deletion at any time via the contact on the Privacy Policy.</li>
          </ul>
        </Section>

        <Section title="5. NIL disclaimer">
          <p><strong className="text-white">Per|Form&apos;s NIL valuations are projections, not offers or guarantees.</strong> They derive from published rankings and peer-cohort math. Actual market NIL deals depend on eligibility, school rules, state law, and brand fit — none of which Per|Form controls. Do not rely on Per|Form valuations as the sole basis for any NIL decision.</p>
        </Section>

        <Section title="6. No offers, no financial advice">
          <p>Per|Form is informational. Nothing on this site constitutes an offer, contract, NIL deal, endorsement, sponsorship, or financial advice.</p>
        </Section>

        <Section title="7. Prohibited use">
          <ul className="list-disc list-inside space-y-1 text-white/70">
            <li>No fraudulent submissions or impersonation.</li>
            <li>No automated scraping that evades rate limits or bypasses auth.</li>
            <li>No harassment, discrimination, or illegal content in submitted freeform fields.</li>
          </ul>
        </Section>

        <Section title="8. Changes">
          <p>We may update these Terms. Material changes will be announced on <code>/legal/tos</code> with a new &quot;Last updated&quot; date. Continued use after a change means you accept the updated Terms.</p>
        </Section>

        <Section title="9. Contact">
          <p>ACHIEVEMOR · <span className="font-mono">asg@achievemor.io</span></p>
        </Section>

        <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 pt-8 border-t border-white/10">
          Template drafted under MIM v1.1 §45 Commercial Readiness. Counsel review required before public launch.
        </p>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '0.06em' }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-white/75">{children}</div>
    </section>
  );
}
