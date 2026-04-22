/**
 * /legal/privacy — Per|Form Privacy Policy (MIM §45 template)
 *
 * Plain-English privacy disclosure covering the /tie/submit data surface.
 * Owner-counsel review REQUIRED before public GA. Covers PII catalog,
 * retention, deletion, export per MIM §35 Data Layer Discipline.
 */

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata = { title: 'Privacy Policy · Per|Form' };

export default function PrivacyPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-[#05060A] text-white" style={{ fontFamily: 'var(--font-geist-sans, system-ui)' }}>
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <div>
          <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/30 mb-2">ACHIEVEMOR · Per|Form</div>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '48px', letterSpacing: '0.04em' }} className="text-[#D4A853]">
            Privacy Policy
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
          Questions about how we handle your data:{' '}
          <a href="mailto:bpo@achievemor.io?subject=Per%7CForm%20Privacy%20question" className="underline" style={{ color: '#D4A853' }}>
            bpo@achievemor.io
          </a>.
        </div>

        <Section title="1. What we collect">
          <p>When you submit via <code>/tie/submit</code>, we collect:</p>
          <ul className="list-disc list-inside space-y-1 text-white/70 mt-2">
            <li><strong className="text-white">Submitter identity:</strong> email, role (player / school / team / agent / parent), organization.</li>
            <li><strong className="text-white">Player identity:</strong> name, school/team, position, class year, height, weight, optional DOB.</li>
            <li><strong className="text-white">Performance + combine + intangibles inputs</strong> you provide.</li>
            <li><strong className="text-white">Consent flags:</strong> NIL disclosure · public visibility · transfer portal opt-in.</li>
            <li><strong className="text-white">Anti-abuse:</strong> a hashed IP signal per submission (not the raw IP).</li>
          </ul>
          <p className="mt-3">Public-domain player data (ESPN, NFL.com, Beast, etc.) shown on <code>/draft/center</code>, <code>/players</code>, and <code>/players/cards</code> is scraped from public sources and does not contain personal contact info.</p>
        </Section>

        <Section title="2. How we use it">
          <ul className="list-disc list-inside space-y-1 text-white/70">
            <li>Compute your TIE grade via the canonical 40/30/30 engine.</li>
            <li>Produce an NIL cohort comparable (median / P10 / P90 against peers).</li>
            <li>Return the result to you; persist the submission so grades stay stable across views.</li>
            <li>Aggregate statistics (tier distribution, NIL cohort curves) in non-identifiable form.</li>
          </ul>
          <p className="mt-3">We do not sell your data. We do not use submissions to train third-party models.</p>
        </Section>

        <Section title="3. Consent controls">
          <ul className="list-disc list-inside space-y-1 text-white/70">
            <li><strong className="text-white">NIL disclosure</strong> authorizes storage + NIL-cohort computation.</li>
            <li><strong className="text-white">Public visibility</strong> authorizes the profile to be rendered on the public Per|Form surface.</li>
            <li><strong className="text-white">Transfer portal</strong> authorizes matching against transfer-portal signals.</li>
          </ul>
          <p className="mt-3">All three are required to complete a submission today. You can withdraw any consent by contacting us; withdrawal triggers deletion or de-identification within 30 days.</p>
        </Section>

        <Section title="4. Retention + deletion + export">
          <p>Per|Form keeps submissions in <code>perform_submissions</code> until you request deletion. You can request deletion or an export of your submitted data by emailing <span className="font-mono">asg@achievemor.io</span>. We respond within 30 days.</p>
        </Section>

        <Section title="5. Third parties + infrastructure">
          <ul className="list-disc list-inside space-y-1 text-white/70">
            <li><strong className="text-white">Neon</strong> (Postgres) — primary database (encrypted at rest, TLS in transit).</li>
            <li><strong className="text-white">Google Cloud Run</strong> — application runtime (encrypted at rest + in transit).</li>
            <li><strong className="text-white">Hostinger myclaw-vps</strong> — Traefik routing layer (TLS via Let&apos;s Encrypt).</li>
            <li><strong className="text-white">ESPN / NFL.com / The Athletic / NBA.com</strong> — public data sources (no identity exchange).</li>
          </ul>
        </Section>

        <Section title="6. Security posture (§29 MIM)">
          <ul className="list-disc list-inside space-y-1 text-white/70">
            <li>HTTPS end-to-end.</li>
            <li>Database credentials rotated via Cloud Run secret manager.</li>
            <li>Admin access is SSH-key-only to myclaw-vps; no password auth.</li>
          </ul>
        </Section>

        <Section title="7. Children">
          <p>Prospects under 13 require a parent/guardian submitter role. High-school prospects (13–17) require parent/guardian authorization at the submitter step.</p>
        </Section>

        <Section title="8. Changes">
          <p>We may update this Policy; material changes carry a new &quot;Last updated&quot; date on this page.</p>
        </Section>

        <Section title="9. Contact">
          <p>ACHIEVEMOR · <span className="font-mono">asg@achievemor.io</span></p>
        </Section>

        <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 pt-8 border-t border-white/10">
          Template drafted under MIM v1.1 §45 + §35. Counsel review required before public launch.
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
