/**
 * TermsOfServicePage — Charter-aware legal surface.
 *
 * Binds the attestation model canonized in the 2026-04-17 arbitration:
 * voice/face/NIL compliance lives at the PRODUCTION layer via user
 * attestation, not at ingestion. This component is the legal surface
 * where that attestation is actually taken.
 *
 * Differentiated approach (per Open Mind's three-approach rule):
 * a two-column layout echoing CharterDetailView — sticky section TOC
 * left, scrolling numbered sections right. Attestation acceptance
 * block pins at both top (mirrors Charter header) AND bottom (the
 * canonical place the customer signs). Bebas Neue section numerals
 * 01–NN match the Charter pattern for kit coherence.
 *
 * Conventional (single-column scroll with grey "Last updated"
 *   subtitle + collapsed sections) — REJECTED as indistinguishable
 *   from any other SaaS ToS.
 * Experimental (card-per-section modal nav) — REJECTED for
 *   anti-scannability — legal review needs full-context reading.
 *
 * Pre-mortem blacklist the render must NOT match:
 *   - Wall-of-text lawyer doc with no hierarchy
 *   - "Last updated" grey pill + standard Mintlify header
 *   - Gradient "Accept" button
 *   - Modal lightbox TOS trap
 *   - Checkbox-EULA "I agree" row with dense fine-print
 *   - Cookie-banner look
 *
 * Uses @aims/brand-tokens classes.
 */

import * as React from 'react';

// ── Canonical default sections (reflects the 2026-04-17 arbitration) ─

export const DEFAULT_TOS_SECTIONS: ReadonlyArray<TosSection> = [
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
      'ACHEEVY and its subordinate agents act on the customer\'s instructions within the Charter scope; the customer remains the party of record for every produced artifact.',
    ],
  },
  {
    id: 'customer-content',
    title: 'Customer Content & Attestation Responsibilities',
    body: [
      'Customers retain ownership of content they upload.',
      'For voice, face, and NIL content specifically: customers attest — at the point of ingestion AND at the point of production — that they have the necessary rights for the requested use.',
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
      'A portion of the Digital Maintenance Fee accrues to the customer\'s platform currency balance (the Savings Plan allocation), which can be applied toward future engagements or marketplace activity.',
      'Pricing tiers and their inclusions are defined on the applicable product-line pricing pages (A.I.M.S. core Tesla 3-6-9 Vortex Plan; Per|Form sports tiers).',
    ],
  },
  {
    id: 'termination',
    title: 'Termination',
    body: [
      'Either party may terminate the relationship with written notice, subject to obligations under an active engagement.',
      'Termination does not discharge the customer\'s attestation representations for content already produced.',
      'Accrued platform currency remains with the customer for the period and conditions specified in the applicable pricing page.',
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    body: [
      'ACHIEVEMOR\'s aggregate liability under these Terms is limited to the fees paid by the customer in the twelve months preceding the event giving rise to the claim.',
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
      'ACHIEVEMOR may update these Terms. Material changes are communicated to the customer and require re-attestation before they take effect on the customer\'s engagements.',
      'The effective Charter at the time of an engagement continues to govern that engagement regardless of subsequent amendments.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    body: [
      'Questions regarding these Terms should be directed to the Charter contact identified in the customer\'s active engagement or to the ACHIEVEMOR support channel listed on foai.cloud.',
    ],
  },
];

// ── Types ──────────────────────────────────────────────────────────

export interface TosSection {
  id: string;
  title: string;
  body: readonly string[];
}

export interface TermsOfServicePageProps {
  /** Override the canonical default sections. */
  sections?: readonly TosSection[];
  /** ISO date of this version's effective date. Defaults to today at render. */
  effectiveDate?: string;
  /** Version tag (e.g., "v1.0"). Rendered in mono subtle near the wordmark. */
  version?: string;
  /** If provided, enables the "Accept & Attest" acceptance block. */
  onAccept?: (state: TosAcceptance) => void;
  /** Pre-fill the signer name on the acceptance block. */
  signerName?: string;
  /** Pre-fill the signer role/title. */
  signerRole?: string;
}

export interface TosAcceptance {
  attestationConfirmed: boolean;
  signerName: string;
  signerRole: string;
  timestamp: string;
}

// ── Main component ─────────────────────────────────────────────────

export function TermsOfServicePage({
  sections = DEFAULT_TOS_SECTIONS,
  effectiveDate,
  version = 'v1.0',
  onAccept,
  signerName: initialSignerName = '',
  signerRole: initialSignerRole = '',
}: TermsOfServicePageProps): React.ReactElement {
  const [activeId, setActiveId] = React.useState<string>(sections[0]?.id ?? '');
  const [attestationConfirmed, setAttestationConfirmed] = React.useState(false);
  const [signerName, setSignerName] = React.useState(initialSignerName);
  const [signerRole, setSignerRole] = React.useState(initialSignerRole);
  const [accepted, setAccepted] = React.useState(false);

  const dateLabel = React.useMemo(() => {
    const d = effectiveDate ? new Date(effectiveDate) : new Date();
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }, [effectiveDate]);

  const canAccept =
    !!onAccept && !accepted && attestationConfirmed && signerName.trim().length > 0;

  const handleAccept = () => {
    if (!canAccept || !onAccept) return;
    const payload: TosAcceptance = {
      attestationConfirmed,
      signerName: signerName.trim(),
      signerRole: signerRole.trim(),
      timestamp: new Date().toISOString(),
    };
    setAccepted(true);
    onAccept(payload);
  };

  return (
    <article
      aria-label="Terms of Service — Deploy by: ACHIEVEMOR"
      className="w-full bg-deploy-bg-deep text-deploy-text font-body"
    >
      <div className="mx-auto grid w-full max-w-[96rem] grid-cols-1 gap-10 px-6 py-10 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:px-10">
        {/* ── LEFT: sticky section nav ─────────────────────── */}
        <aside
          aria-label="Terms sections"
          className="md:sticky md:top-10 md:h-fit md:self-start"
        >
          <div className="flex flex-col gap-2 border border-deploy-border-subtle bg-deploy-bg-surface p-5">
            <span className="font-mono text-[0.625rem] tracking-[0.24em] text-deploy-text-muted uppercase">
              Terms · {version}
            </span>
            <span className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
              Effective {dateLabel}
            </span>
          </div>
          <nav className="mt-3 flex flex-col border-l border-deploy-border-subtle">
            {sections.map((section, i) => {
              const active = activeId === section.id;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={() => setActiveId(section.id)}
                  className={
                    'group flex items-baseline gap-3 border-l-2 px-3 py-2 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon ' +
                    (active
                      ? 'border-deploy-neon text-deploy-neon'
                      : 'border-transparent text-deploy-text-muted hover:text-deploy-text')
                  }
                >
                  <span className="font-mono text-[0.625rem] tabular-nums text-deploy-text-subtle">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-xs tracking-[0.08em] uppercase">
                    {section.title}
                  </span>
                </a>
              );
            })}
          </nav>
        </aside>

        {/* ── RIGHT: sections + acceptance block ───────────── */}
        <div className="flex flex-col gap-12">
          {/* Header */}
          <header className="flex flex-col gap-3 border-b border-deploy-border-subtle pb-8">
            <span className="font-wordmark text-[clamp(1.5rem,3vw,2.25rem)] leading-none text-deploy-text">
              Deploy by<span className="text-deploy-neon">:</span> ACHIEVEMOR
            </span>
            <h2 className="font-display text-[clamp(2rem,4vw,3rem)] leading-none tracking-[0.02em] uppercase text-deploy-text">
              Terms of Service
            </h2>
            <p className="max-w-[72ch] font-body text-sm text-deploy-text-muted">
              These Terms govern the Charter ↔ Ledger engagement model used across the
              ACHIEVEMOR platform. They codify the attestation-not-ingestion-policing
              discipline that lets customers retain authority over their voice, face,
              and NIL content while the platform runs.
            </p>
          </header>

          {/* Sections */}
          {sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="flex flex-col gap-4"
              onMouseEnter={() => setActiveId(section.id)}
            >
              <header className="flex items-baseline gap-4 border-b border-deploy-border-subtle pb-3">
                <span
                  aria-hidden="true"
                  className="font-display text-[clamp(2rem,3vw,2.75rem)] leading-none tracking-[0.04em] text-deploy-text-muted tabular-nums"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3
                  id={`${section.id}-title`}
                  className="font-body text-base tracking-[0.08em] uppercase text-deploy-text"
                >
                  {section.title}
                </h3>
              </header>
              <div className="flex flex-col gap-3">
                {section.body.map((para, pi) => (
                  <p
                    key={pi}
                    className="max-w-[72ch] font-body text-sm leading-relaxed text-deploy-text"
                  >
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}

          {/* Acceptance block */}
          {onAccept && (
            <AcceptanceBlock
              attestationConfirmed={attestationConfirmed}
              setAttestationConfirmed={setAttestationConfirmed}
              signerName={signerName}
              setSignerName={setSignerName}
              signerRole={signerRole}
              setSignerRole={setSignerRole}
              canAccept={canAccept}
              accepted={accepted}
              onAccept={handleAccept}
            />
          )}
        </div>
      </div>
    </article>
  );
}

// ── Acceptance block ───────────────────────────────────────────────

function AcceptanceBlock({
  attestationConfirmed,
  setAttestationConfirmed,
  signerName,
  setSignerName,
  signerRole,
  setSignerRole,
  canAccept,
  accepted,
  onAccept,
}: {
  attestationConfirmed: boolean;
  setAttestationConfirmed: (v: boolean) => void;
  signerName: string;
  setSignerName: (v: string) => void;
  signerRole: string;
  setSignerRole: (v: string) => void;
  canAccept: boolean;
  accepted: boolean;
  onAccept: () => void;
}): React.ReactElement {
  return (
    <section
      aria-label="Accept & Attest"
      className={
        'flex flex-col gap-5 border-t-2 bg-deploy-bg-elevated p-6 ' +
        (accepted ? 'border-deploy-neon' : 'border-deploy-neon')
      }
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-body text-base tracking-[0.08em] uppercase text-deploy-text">
          Accept &amp; Attest
        </h3>
        <span className="font-mono text-[0.625rem] tracking-[0.18em] text-deploy-text-subtle uppercase">
          production-layer attestation
        </span>
      </header>

      <label className="flex items-start gap-3 font-body text-sm text-deploy-text">
        <input
          type="checkbox"
          checked={attestationConfirmed}
          onChange={(e) => setAttestationConfirmed(e.target.checked)}
          disabled={accepted}
          className="mt-1 h-4 w-4 accent-deploy-neon focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon"
        />
        <span className="max-w-[72ch]">
          I have the necessary rights to the voice, face, NIL, and content I will
          provide through this engagement. I understand attestation operates at the
          production layer and that I am the responsible party for these
          representations.
        </span>
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[0.625rem] tracking-[0.18em] text-deploy-text-subtle uppercase">
            Signer name
          </span>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            disabled={accepted}
            required
            className="border border-deploy-border-subtle bg-deploy-bg-surface px-3 py-2 font-body text-sm text-deploy-text focus:border-deploy-neon focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[0.625rem] tracking-[0.18em] text-deploy-text-subtle uppercase">
            Role / title (optional)
          </span>
          <input
            type="text"
            value={signerRole}
            onChange={(e) => setSignerRole(e.target.value)}
            disabled={accepted}
            className="border border-deploy-border-subtle bg-deploy-bg-surface px-3 py-2 font-body text-sm text-deploy-text focus:border-deploy-neon focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onAccept}
        disabled={!canAccept}
        aria-pressed={accepted}
        className={
          'inline-flex self-start items-center gap-3 border px-5 py-2 font-mono text-xs tracking-[0.18em] uppercase transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon ' +
          (accepted
            ? 'border-deploy-neon text-deploy-neon shadow-deploy-neon cursor-default'
            : canAccept
            ? 'border-deploy-neon text-deploy-neon hover:shadow-deploy-neon'
            : 'border-deploy-border-subtle text-deploy-text-subtle cursor-not-allowed')
        }
      >
        {accepted ? 'Attestation on file' : 'Accept & Attest'}
      </button>
    </section>
  );
}
