/**
 * /terms — Terms of Service for foai.cloud and affiliated surfaces.
 *
 * This route serves the read-only legal surface. Attestation is taken
 * inside the engagement flow (the production-layer pattern canonized
 * 2026-04-17), not on this public page — so no interactive accept block.
 *
 * Canonical content mirrors `@aims/ui-kit` DEFAULT_TOS_SECTIONS (PR #208)
 * rendered in the cti-hub tactical visual language rather than the
 * Deploy brand-tokens aesthetic. When these two versions diverge, the
 * cti-hub page governs foai.cloud surfaces; the @aims/ui-kit component
 * governs Deploy surfaces.
 *
 * Updates: change both this file AND @aims/ui-kit/TermsOfServicePage.
 * Then update the version tag + effectiveDate below.
 */

import type { Metadata } from 'next';

const VERSION = 'v1.0';
const EFFECTIVE_DATE = '2026-04-18';

export const metadata: Metadata = {
  title: 'Terms of Service — foai.cloud',
  description:
    'Terms governing engagements on the foai.cloud and Deploy by: ACHIEVEMOR platforms.',
};

interface TosSection {
  readonly id: string;
  readonly title: string;
  readonly body: readonly string[];
}

const SECTIONS: readonly TosSection[] = [
  {
    id: 'identification',
    title: 'Identification & Scope',
    body: [
      'These Terms apply to every customer engagement on the Deploy by: ACHIEVEMOR platform and its surfaces (foai.cloud, deploy.foai.cloud, perform.foai.cloud, aimanagedsolutions.cloud, and affiliated aiPLUG destinations).',
      'Every engagement produces a Charter (customer-safe artifact) and a paired Ledger (internal audit trail). These Terms define how those artifacts are governed.',
    ],
  },
  {
    id: 'acceptance-attestation',
    title: 'Acceptance & Attestation',
    body: [
      'By proceeding, the customer attests that they have obtained all necessary rights and consents for any voice, likeness, name/image/likeness (NIL), or protected content they bring into an engagement.',
      'Compliance operates at the production layer through customer attestation, not through ingestion filtering — the same legal pattern employed by major creator platforms (YouTube, GitHub, npm, Hugging Face).',
      'Customers are the responsible party for the rights associated with their inputs. ACHIEVEMOR facilitates the platform; customers certify the rights.',
    ],
  },
  {
    id: 'use-of-services',
    title: 'Use of the Services',
    body: [
      'The customer agrees to use the platform in accordance with these Terms, applicable law, and any engagement-specific Charter clauses.',
      'Misrepresenting rights, circumventing the attestation gate, or using the platform to produce content the customer lacks legal authority to produce is a material breach.',
      'ACHEEVY and its subordinate agents act on the customer\u2019s instructions within the Charter scope; the customer remains the party of record for every produced artifact.',
    ],
  },
  {
    id: 'customer-content',
    title: 'Customer Content & Attestation Responsibilities',
    body: [
      'Customers retain ownership of content they upload.',
      'For voice, face, and NIL content specifically: customers attest \u2014 at the point of ingestion AND at the point of production \u2014 that they have the necessary rights for the requested use.',
      'ACHIEVEMOR does not perform preemptive identity detection or likeness filtering. Production-layer attestation governs; post-hoc takedown honors apply.',
    ],
  },
  {
    id: 'ip',
    title: 'Intellectual Property Rights',
    body: [
      'Customers own the work produced through engagements they commission, subject to these Terms.',
      'NFT outputs, where the engagement includes NFT services, transfer with full commercial rights upon delivery unless the engagement Charter specifies otherwise.',
      'ACHIEVEMOR retains ownership of the platform, its component systems, and any agent-internal mechanisms that do not constitute customer output.',
    ],
  },
  {
    id: 'privacy-retention',
    title: 'Data Privacy & Retention',
    body: [
      'Voice data is retained for up to 90 days unless the customer requests earlier purge, at which point purge is performed within the operational SLA.',
      'Charter + Ledger artifacts are retained for the duration required by the engagement and applicable legal / compliance obligations.',
      'Customers may export their Charter at any time. Ledger-internal rationale is ACHIEVEMOR-proprietary and may be summarized but is not exported in full.',
    ],
  },
  {
    id: 'fees-currency',
    title: 'Platform Currency & Fees',
    body: [
      'A Digital Maintenance Fee applies to qualifying transactions. The fee is surfaced on the customer Charter as a single line item; the internal allocation is governed by platform policy.',
      'A portion of the Digital Maintenance Fee accrues to the customer\u2019s platform currency balance (the Savings Plan allocation), which can be applied toward future engagements or marketplace activity.',
      'Pricing tiers and their inclusions are defined on the applicable product-line pricing pages (A.I.M.S. core Tesla 3-6-9 Vortex Plan; Per|Form sports tiers).',
    ],
  },
  {
    id: 'termination',
    title: 'Termination',
    body: [
      'Either party may terminate the relationship with written notice, subject to obligations under an active engagement.',
      'Termination does not discharge the customer\u2019s attestation representations for content already produced.',
      'Accrued platform currency remains with the customer for the period and conditions specified in the applicable pricing page.',
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    body: [
      'ACHIEVEMOR\u2019s aggregate liability under these Terms is limited to the fees paid by the customer in the twelve months preceding the event giving rise to the claim.',
      'ACHIEVEMOR is not liable for content produced in reliance on customer attestations that later prove inaccurate.',
    ],
  },
  {
    id: 'governing-law',
    title: 'Governing Law & Disputes',
    body: [
      'These Terms are governed by the laws of the jurisdiction specified on the applicable Charter. Absent a jurisdictional choice on the Charter, the laws of the State of Georgia, United States, govern.',
      'Disputes are resolved through good-faith negotiation first; failing resolution, through binding arbitration in the chosen jurisdiction.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    body: [
      'ACHIEVEMOR may update these Terms. Material changes are communicated to the customer and require re-attestation before they take effect on the customer\u2019s engagements.',
      'The effective Charter at the time of an engagement continues to govern that engagement regardless of subsequent amendments.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    body: [
      'Questions regarding these Terms should be directed to the Charter contact identified in the customer\u2019s active engagement or to the ACHIEVEMOR support channel listed on foai.cloud.',
    ],
  },
];

function formatEffectiveDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function TermsPage() {
  const effectiveLabel = formatEffectiveDate(EFFECTIVE_DATE);

  return (
    <main className="min-h-screen bg-bg text-fg">
      <div className="mx-auto grid w-full max-w-[96rem] grid-cols-1 gap-10 px-6 py-16 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:px-10">
        {/* ── Sticky TOC ── */}
        <aside className="md:sticky md:top-16 md:h-fit md:self-start">
          <div className="flex flex-col gap-3 border border-border bg-bg-surface p-5">
            <div className="font-mono text-[0.625rem] tracking-[0.24em] text-fg-tertiary uppercase">
              Terms of Service
            </div>
            <div className="font-mono text-[0.625rem] tracking-[0.16em] text-fg-ghost uppercase">
              {VERSION} · Effective {effectiveLabel}
            </div>
            <nav className="mt-3 flex flex-col border-l border-border">
              {SECTIONS.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="group flex items-baseline gap-3 border-b border-border px-3 py-2 hover:bg-bg-elevated"
                >
                  <span className="font-mono text-[0.625rem] tabular-nums text-fg-ghost">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-xs tracking-[0.04em] uppercase text-fg-secondary group-hover:text-fg">
                    {s.title}
                  </span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* ── Body ── */}
        <article className="flex flex-col gap-12">
          <header className="flex flex-col gap-3 border-b border-border pb-8">
            <h1 className="font-outfit text-[clamp(2rem,4vw,3rem)] leading-none tracking-[0.02em] uppercase text-fg">
              Terms of Service
            </h1>
            <p className="max-w-[72ch] font-sans text-sm text-fg-secondary">
              Governing the foai.cloud and Deploy by: ACHIEVEMOR platforms.
              Read in full before signing any engagement Charter.
            </p>
            <div className="flex items-center gap-4 font-mono text-[0.625rem] tracking-[0.16em] text-fg-ghost uppercase">
              <span>Version {VERSION}</span>
              <span aria-hidden>·</span>
              <span>Effective {effectiveLabel}</span>
            </div>
          </header>

          {SECTIONS.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-24 flex flex-col gap-4"
            >
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-xs tabular-nums text-accent">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="font-outfit text-[clamp(1.25rem,2.2vw,1.75rem)] leading-tight tracking-[0.01em] uppercase text-fg">
                  {s.title}
                </h2>
              </div>
              <div className="flex flex-col gap-4">
                {s.body.map((paragraph, pi) => (
                  <p
                    key={pi}
                    className="max-w-[72ch] font-sans text-sm leading-relaxed text-fg-secondary"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <footer className="flex flex-col gap-3 border-t border-border pt-8 font-mono text-[0.625rem] tracking-[0.16em] text-fg-ghost uppercase">
            <div>Version {VERSION} · Effective {effectiveLabel}</div>
            <div>Deploy by: ACHIEVEMOR · foai.cloud</div>
          </footer>
        </article>
      </div>
    </main>
  );
}
