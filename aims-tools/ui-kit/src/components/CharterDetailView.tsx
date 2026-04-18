/**
 * CharterDetailView — the 11-component Charter renderer.
 *
 * The integration component. Dog-foods every prior piece shipped in
 * @aims/ui-kit: tracker for deliverables, BomRenderer for Step-3
 * Picker_Ang output, FeeLineItem inside the Quote/PO cost summary,
 * MelaniumWidget as optional sidebar.
 *
 * Differentiated approach (per Open Mind's three-approach rule):
 * record-cover layout — asymmetric 60/40 grid. Left column scrolls
 * through 11 sections in canonical order, each labeled with its
 * component number (01-11) in font-display (Bebas Neue). Right column
 * is sticky Charter metadata: plug + client + security tier + the
 * pinned tracker + optional Melanium widget. BAMARAM! signal flips
 * the right rail's top edge neon.
 *
 * Conventional (Notion/Confluence TOC-left + content-right doc
 *   viewer) — REJECTED for generic knowledge-base feel.
 * Experimental (11-slide deck, keyboard-nav between) — REJECTED as it
 *   makes the Charter non-scannable for review.
 *
 * Pre-mortem blacklist the render must NOT match:
 *   - Notion / Confluence doc viewer
 *   - Alt-row striped section backgrounds
 *   - Breadcrumb nav header
 *   - Any "Table of contents" sidebar
 *   - Blue hyperlinks
 *   - Pill "Sign now" CTA
 *
 * Uses @aims/brand-tokens Tailwind preset classes + the sibling
 * components RfpBamaramProgressTracker, PickerAngBomRenderer,
 * MelaniumBalanceWidget, DigitalMaintenanceFeeLineItem.
 */

import * as React from 'react';
import {
  RfpBamaramProgressTracker,
  type TrackerStageEntry,
} from './RfpBamaramProgressTracker.js';
import {
  PickerAngBomRenderer,
  type BomEntryView,
  type SecurityAddendumView,
} from './PickerAngBomRenderer.js';
import { MelaniumBalanceWidget } from './MelaniumBalanceWidget.js';
import {
  DigitalMaintenanceFeeLineItem,
  DIGITAL_MAINTENANCE_FEE_AMOUNT,
} from './DigitalMaintenanceFeeLineItem.js';

// ── Inline types mirror @aims/contracts/charter-schema ─────────────

export interface CharterHeaderIdentityView {
  plugTitle: string;
  clientName: string;
  vendor: string;                                         // defaults 'Deploy by: ACHIEVEMOR'
  plugId: string;
  ledgerId: string;
  token?: string | null;
  securityTier: 'entry' | 'mid' | 'superior' | 'defense_grade';
  voiceServicesStatus: 'disabled' | 'enabled' | 'custom';
  nftServicesStatus: 'disabled' | 'enabled' | 'custom';
  effectiveDate: string;
}

export interface CharterQuoteCostView {
  monthlySubscription: {
    tierName: string;
    monthlyFee: number;
    tokenPool: number;
    overageRatePer1k: number;
  };
  buildFee: { baseFee: number; securityMultiplier: number; finalFee: number };
  refundableBuffer: { percent: number; amount: number };
  taxes: { jurisdiction: string; amount: number };
  currency?: string;
}

export interface FourQuestionLensView {
  rawIdea: string;
  risksGapsMissing: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  audienceResonance: string;
  expertApproach: string;
}

export interface UseCaseView {
  title: string;
  purpose: string;
  audience: string;
  grocWeighted: number;                                   // 0..1
}

export interface TechnicalBlueprintView {
  pattern: 'Picker_Ang → BuildSmith';
  inputs: string[];
  outputs: string[];
  tests: string[];
  dependencies: string[];
}

export interface SecurityLevelView {
  tier: 'entry' | 'mid' | 'superior' | 'defense_grade';
  controls: string[];
  farmerSignoff: boolean;
  unionSignoff: boolean;
}

export interface OkrsKpisView {
  cadence: string;
  objectives: Array<{ objective: string; keyResults: string[] }>;
  kpis: Array<{ name: string; target: string; measure: string }>;
}

export interface RunbookView {
  preRun: string[];
  duringRun: string[];
  postRun: string[];
  hitlEscalationPath: string;
}

export interface LegalDataRightsView {
  voicePrivacy: { dataRetentionDays: number; purgeOnRequest: boolean };
  nftIp?: { ownership: string; commercialRightsTransfer: string };
  storageRetention: string;
  optOutTerms: string;
}

export interface AcceptanceView {
  clientSignature?: { signerName: string; signerRole: string; timestamp: string } | null;
  deploySignature?: { signerName: string; timestamp: string } | null;
  bamaramSignal: boolean;
}

export interface CharterView {
  id: string;                                             // engagement id
  headerIdentity: CharterHeaderIdentityView;
  quotePoCostSummary?: CharterQuoteCostView;
  fourQuestionLens?: FourQuestionLensView;
  fiveUseCasesPack?: readonly UseCaseView[];              // up to 5
  technicalBlueprint?: TechnicalBlueprintView;
  securityLevelComponents?: SecurityLevelView;
  okrsKpis?: OkrsKpisView;
  runbook?: RunbookView;
  legalDataRights?: LegalDataRightsView;
  acceptance?: AcceptanceView;
}

export interface CharterDetailViewProps {
  charter: CharterView;
  /** Timestamped Deliverables that drive the progress tracker. */
  stages: readonly TrackerStageEntry[];
  /** Picker_Ang customer-safe BoM (already relabeled). Optional — only renders when Step 3 is reached. */
  bom?: { entries: readonly BomEntryView[]; securityAddendum: SecurityAddendumView } | null;
  /** Optional customer Melanium balance for the sidebar. Omit to hide. */
  melanium?: {
    balance: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
    customerId?: string | null;
  } | null;
  /** Handler for the Acceptance action that flips the BAMARAM signal. Disabled when bamaramSignal true. */
  onAccept?: () => void;
}

// ── Small presentational helpers ───────────────────────────────────

function SectionBadge({ ordinal }: { ordinal: number }): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className="font-display text-[clamp(2rem,3vw,2.75rem)] leading-none tracking-[0.04em] text-deploy-text-muted tabular-nums"
    >
      {String(ordinal).padStart(2, '0')}
    </span>
  );
}

function SectionHeader({
  ordinal,
  title,
  subtitle,
}: {
  ordinal: number;
  title: string;
  subtitle?: string;
}): React.ReactElement {
  return (
    <header className="flex flex-col gap-2 border-b border-deploy-border-subtle pb-4">
      <div className="flex items-baseline gap-4">
        <SectionBadge ordinal={ordinal} />
        <h3 className="font-body text-base tracking-[0.08em] uppercase text-deploy-text">
          {title}
        </h3>
      </div>
      {subtitle && (
        <p className="font-body text-sm text-deploy-text-muted">{subtitle}</p>
      )}
    </header>
  );
}

function MonoLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <span className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
      {children}
    </span>
  );
}

function KeyValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <MonoLabel>{label}</MonoLabel>
      <span className="font-body text-sm text-deploy-text">{value}</span>
    </div>
  );
}

function TagList({ items }: { items: readonly string[] }): React.ReactElement {
  if (!items.length) {
    return <MonoLabel>none recorded</MonoLabel>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <li
          key={t}
          className="font-mono text-[0.625rem] tracking-[0.08em] text-deploy-text uppercase border border-deploy-border-subtle px-2 py-0.5"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// ── Main component ─────────────────────────────────────────────────

export function CharterDetailView({
  charter,
  stages,
  bom,
  melanium,
  onAccept,
}: CharterDetailViewProps): React.ReactElement {
  const bamaram = !!charter.acceptance?.bamaramSignal;

  return (
    <article
      aria-label={`Charter — ${charter.headerIdentity.plugTitle}`}
      className="w-full bg-deploy-bg-deep text-deploy-text font-body"
    >
      <div className="mx-auto grid w-full max-w-[96rem] grid-cols-1 gap-10 px-6 py-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:px-10">
        {/* ── LEFT: 11 sections in canonical order ──────────────── */}
        <div className="flex flex-col gap-12">
          {/* Section 01 — Header Identity */}
          <section aria-labelledby="section-01">
            <SectionHeader ordinal={1} title="Header Identity" />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <KeyValue label="Plug" value={charter.headerIdentity.plugTitle} />
              <KeyValue label="Client" value={charter.headerIdentity.clientName} />
              <KeyValue label="Vendor" value={charter.headerIdentity.vendor} />
              <KeyValue label="Security tier" value={charter.headerIdentity.securityTier.replace('_', ' ')} />
              <KeyValue label="Voice services" value={charter.headerIdentity.voiceServicesStatus} />
              <KeyValue label="NFT services" value={charter.headerIdentity.nftServicesStatus} />
              <KeyValue label="Effective date" value={new Date(charter.headerIdentity.effectiveDate).toLocaleDateString()} />
              <KeyValue label="Plug ID" value={<span className="font-mono text-xs">{charter.headerIdentity.plugId}</span>} />
            </div>
          </section>

          {/* Section 02 — Quote → PO Cost Summary */}
          <section aria-labelledby="section-02">
            <SectionHeader ordinal={2} title="Quote → PO Cost Summary" />
            {charter.quotePoCostSummary ? (
              <div className="mt-6 flex flex-col gap-4">
                <ul className="flex flex-col divide-y divide-deploy-border-subtle">
                  <DigitalMaintenanceFeeLineItem
                    as="li"
                    amount={DIGITAL_MAINTENANCE_FEE_AMOUNT}
                    currency={charter.quotePoCostSummary.currency}
                    compact
                  />
                  <li className="flex items-baseline justify-between gap-4 py-2">
                    <span className="font-mono text-xs text-deploy-text">Monthly ({charter.quotePoCostSummary.monthlySubscription.tierName})</span>
                    <span className="font-mono text-xs tabular-nums text-deploy-text">
                      {formatMoney(charter.quotePoCostSummary.monthlySubscription.monthlyFee, charter.quotePoCostSummary.currency)}
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between gap-4 py-2">
                    <span className="font-mono text-xs text-deploy-text">Build fee ({charter.quotePoCostSummary.buildFee.securityMultiplier}× tier)</span>
                    <span className="font-mono text-xs tabular-nums text-deploy-text">
                      {formatMoney(charter.quotePoCostSummary.buildFee.finalFee, charter.quotePoCostSummary.currency)}
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between gap-4 py-2">
                    <span className="font-mono text-xs text-deploy-text">Refundable buffer ({charter.quotePoCostSummary.refundableBuffer.percent}%)</span>
                    <span className="font-mono text-xs tabular-nums text-deploy-text">
                      {formatMoney(charter.quotePoCostSummary.refundableBuffer.amount, charter.quotePoCostSummary.currency)}
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between gap-4 py-2">
                    <span className="font-mono text-xs text-deploy-text">Taxes ({charter.quotePoCostSummary.taxes.jurisdiction})</span>
                    <span className="font-mono text-xs tabular-nums text-deploy-text">
                      {formatMoney(charter.quotePoCostSummary.taxes.amount, charter.quotePoCostSummary.currency)}
                    </span>
                  </li>
                </ul>
              </div>
            ) : (
              <p className="mt-4 font-body text-sm text-deploy-text-muted">Quote not yet issued.</p>
            )}
          </section>

          {/* Section 03 — Timestamped Deliverables (tracker) */}
          <section aria-labelledby="section-03">
            <SectionHeader ordinal={3} title="Timestamped Deliverables" subtitle="RFP through BAMARAM." />
            <div className="mt-6">
              <RfpBamaramProgressTracker
                stages={stages}
                bamaramSignal={bamaram}
              />
            </div>
          </section>

          {/* Section 04 — Four-Question Lens + SWOT */}
          <section aria-labelledby="section-04">
            <SectionHeader ordinal={4} title="Four-Question Lens + SWOT" />
            {charter.fourQuestionLens ? (
              <div className="mt-6 flex flex-col gap-4">
                <KeyValue label="Raw idea" value={charter.fourQuestionLens.rawIdea} />
                <KeyValue label="Audience resonance" value={charter.fourQuestionLens.audienceResonance} />
                <KeyValue label="Top 0.01% approach" value={charter.fourQuestionLens.expertApproach} />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <MonoLabel>Strengths</MonoLabel>
                    <TagList items={charter.fourQuestionLens.risksGapsMissing.strengths} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <MonoLabel>Weaknesses</MonoLabel>
                    <TagList items={charter.fourQuestionLens.risksGapsMissing.weaknesses} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <MonoLabel>Opportunities</MonoLabel>
                    <TagList items={charter.fourQuestionLens.risksGapsMissing.opportunities} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <MonoLabel>Threats</MonoLabel>
                    <TagList items={charter.fourQuestionLens.risksGapsMissing.threats} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 font-body text-sm text-deploy-text-muted">Four-Question Lens not yet produced.</p>
            )}
          </section>

          {/* Section 05 — Five Use Cases Pack */}
          <section aria-labelledby="section-05">
            <SectionHeader ordinal={5} title="Five Use Cases Pack" subtitle="GROC-ranked, delivered with PO." />
            {charter.fiveUseCasesPack && charter.fiveUseCasesPack.length > 0 ? (
              <ul className="mt-6 flex flex-col gap-3">
                {charter.fiveUseCasesPack.map((uc, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-1 border border-deploy-border-subtle bg-deploy-bg-surface p-4"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h4 className="font-display text-lg tracking-[0.02em] uppercase text-deploy-text">{uc.title}</h4>
                      <span className="font-mono text-xs tabular-nums text-deploy-neon">
                        GROC {uc.grocWeighted.toFixed(2)}
                      </span>
                    </div>
                    <p className="font-body text-sm text-deploy-text-muted">{uc.purpose}</p>
                    <MonoLabel>Audience — {uc.audience}</MonoLabel>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 font-body text-sm text-deploy-text-muted">Five Use Cases Pack not yet attached (delivered with PO).</p>
            )}
          </section>

          {/* Section 06 — Technical Blueprint (Picker_Ang BoM) */}
          <section aria-labelledby="section-06">
            <SectionHeader ordinal={6} title="Technical Blueprint" subtitle="Picker_Ang → BuildSmith. Customer-safe surface only." />
            {charter.technicalBlueprint && (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <MonoLabel>Inputs</MonoLabel>
                  <TagList items={charter.technicalBlueprint.inputs} />
                </div>
                <div className="flex flex-col gap-2">
                  <MonoLabel>Outputs</MonoLabel>
                  <TagList items={charter.technicalBlueprint.outputs} />
                </div>
                <div className="flex flex-col gap-2">
                  <MonoLabel>Tests</MonoLabel>
                  <TagList items={charter.technicalBlueprint.tests} />
                </div>
                <div className="flex flex-col gap-2">
                  <MonoLabel>Dependencies</MonoLabel>
                  <TagList items={charter.technicalBlueprint.dependencies} />
                </div>
              </div>
            )}
            {bom && (
              <div className="mt-6">
                <PickerAngBomRenderer
                  entries={bom.entries}
                  securityAddendum={bom.securityAddendum}
                  title="Bill of Materials"
                />
              </div>
            )}
          </section>

          {/* Section 07 — Security Level & Components */}
          <section aria-labelledby="section-07">
            <SectionHeader ordinal={7} title="Security Level & Components" />
            {charter.securityLevelComponents ? (
              <div className="mt-6 flex flex-col gap-4">
                <div className="flex flex-wrap gap-6">
                  <KeyValue label="Tier" value={charter.securityLevelComponents.tier.replace('_', ' ')} />
                  <KeyValue label="Farmer signoff" value={charter.securityLevelComponents.farmerSignoff ? '✓ certified' : 'pending'} />
                  <KeyValue label="Union signoff" value={charter.securityLevelComponents.unionSignoff ? '✓ approved' : 'pending'} />
                </div>
                <div className="flex flex-col gap-2">
                  <MonoLabel>Controls</MonoLabel>
                  <TagList items={charter.securityLevelComponents.controls} />
                </div>
              </div>
            ) : (
              <p className="mt-4 font-body text-sm text-deploy-text-muted">Security components not yet certified.</p>
            )}
          </section>

          {/* Section 08 — OKRs / KPIs */}
          <section aria-labelledby="section-08">
            <SectionHeader ordinal={8} title="OKRs / KPIs" />
            {charter.okrsKpis ? (
              <div className="mt-6 flex flex-col gap-4">
                <KeyValue label="Cadence" value={charter.okrsKpis.cadence} />
                {charter.okrsKpis.objectives.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <MonoLabel>Objectives</MonoLabel>
                    {charter.okrsKpis.objectives.map((o, i) => (
                      <div key={i} className="border-l-2 border-deploy-border-subtle pl-3">
                        <p className="font-body text-sm text-deploy-text">{o.objective}</p>
                        <ul className="mt-1 flex flex-col gap-0.5">
                          {o.keyResults.map((kr, j) => (
                            <li key={j} className="font-body text-xs text-deploy-text-muted">— {kr}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                {charter.okrsKpis.kpis.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <MonoLabel>KPIs</MonoLabel>
                    <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      {charter.okrsKpis.kpis.map((k, i) => (
                        <li key={i} className="border border-deploy-border-subtle p-3">
                          <p className="font-body text-sm text-deploy-text">{k.name}</p>
                          <p className="font-mono text-xs text-deploy-text-muted">target: {k.target}</p>
                          <p className="font-mono text-xs text-deploy-text-subtle">measured: {k.measure}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 font-body text-sm text-deploy-text-muted">Objectives + KPIs not yet set.</p>
            )}
          </section>

          {/* Section 09 — Runbook */}
          <section aria-labelledby="section-09">
            <SectionHeader ordinal={9} title="Runbook" subtitle="Hallucination-hardening — pre/during/post checks." />
            {charter.runbook ? (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <MonoLabel>Pre-run</MonoLabel>
                  <TagList items={charter.runbook.preRun} />
                </div>
                <div className="flex flex-col gap-2">
                  <MonoLabel>During run</MonoLabel>
                  <TagList items={charter.runbook.duringRun} />
                </div>
                <div className="flex flex-col gap-2">
                  <MonoLabel>Post-run</MonoLabel>
                  <TagList items={charter.runbook.postRun} />
                </div>
                <div className="col-span-full">
                  <KeyValue label="HITL escalation path" value={charter.runbook.hitlEscalationPath} />
                </div>
              </div>
            ) : (
              <p className="mt-4 font-body text-sm text-deploy-text-muted">Runbook not yet authored.</p>
            )}
          </section>

          {/* Section 10 — Legal & Data Rights */}
          <section aria-labelledby="section-10">
            <SectionHeader ordinal={10} title="Legal & Data Rights" />
            {charter.legalDataRights ? (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <KeyValue
                  label="Voice data retention"
                  value={`${charter.legalDataRights.voicePrivacy.dataRetentionDays} days · ${charter.legalDataRights.voicePrivacy.purgeOnRequest ? 'purge on request' : 'no purge'}`}
                />
                {charter.legalDataRights.nftIp && (
                  <KeyValue
                    label="NFT IP"
                    value={`${charter.legalDataRights.nftIp.ownership} · rights: ${charter.legalDataRights.nftIp.commercialRightsTransfer}`}
                  />
                )}
                <KeyValue label="Storage retention" value={charter.legalDataRights.storageRetention} />
                <KeyValue label="Opt-out terms" value={charter.legalDataRights.optOutTerms} />
              </div>
            ) : (
              <p className="mt-4 font-body text-sm text-deploy-text-muted">Legal terms not yet attached.</p>
            )}
          </section>

          {/* Section 11 — Acceptance */}
          <section aria-labelledby="section-11">
            <SectionHeader ordinal={11} title="Acceptance" subtitle="BAMARAM! signal fires on customer sign." />
            <div className="mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2 border border-deploy-border-subtle p-4">
                  <MonoLabel>Client signature</MonoLabel>
                  {charter.acceptance?.clientSignature ? (
                    <>
                      <p className="font-body text-sm text-deploy-text">{charter.acceptance.clientSignature.signerName}</p>
                      <p className="font-mono text-xs text-deploy-text-muted">{charter.acceptance.clientSignature.signerRole}</p>
                      <p className="font-mono text-[0.625rem] text-deploy-text-subtle">{charter.acceptance.clientSignature.timestamp}</p>
                    </>
                  ) : (
                    <p className="font-mono text-xs text-deploy-text-subtle">pending</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 border border-deploy-border-subtle p-4">
                  <MonoLabel>Deploy signature</MonoLabel>
                  {charter.acceptance?.deploySignature ? (
                    <>
                      <p className="font-body text-sm text-deploy-text">{charter.acceptance.deploySignature.signerName}</p>
                      <p className="font-mono text-[0.625rem] text-deploy-text-subtle">{charter.acceptance.deploySignature.timestamp}</p>
                    </>
                  ) : (
                    <p className="font-mono text-xs text-deploy-text-subtle">pending</p>
                  )}
                </div>
              </div>
              {onAccept && (
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={bamaram}
                  aria-pressed={bamaram}
                  className={
                    'inline-flex self-start items-center gap-3 border px-5 py-2 font-mono text-xs tracking-[0.18em] uppercase transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon ' +
                    (bamaram
                      ? 'border-deploy-neon text-deploy-neon shadow-deploy-neon cursor-default'
                      : 'border-deploy-border-subtle text-deploy-text hover:border-deploy-neon hover:text-deploy-neon')
                  }
                >
                  {bamaram ? ')))BAMARAM(((' : 'Accept Charter'}
                </button>
              )}
            </div>
          </section>
        </div>

        {/* ── RIGHT: sticky metadata + tracker + Melanium ──────── */}
        <aside
          aria-label="Charter metadata"
          className={
            'flex flex-col gap-6 md:sticky md:top-10 md:h-fit md:self-start border-t pt-6 md:border-0 md:pt-0 ' +
            (bamaram ? 'md:border-t-2 md:border-deploy-neon md:pt-6' : 'md:border-t md:border-deploy-border-subtle md:pt-6')
          }
        >
          <div className="flex flex-col gap-3 border border-deploy-border-subtle bg-deploy-bg-surface p-6">
            <MonoLabel>Engagement</MonoLabel>
            <KeyValue label="Plug" value={charter.headerIdentity.plugTitle} />
            <KeyValue label="Client" value={charter.headerIdentity.clientName} />
            <KeyValue label="Security tier" value={charter.headerIdentity.securityTier.replace('_', ' ')} />
            {charter.headerIdentity.token && (
              <KeyValue label="Token" value={<span className="font-mono text-xs">{charter.headerIdentity.token}</span>} />
            )}
            <KeyValue label="Effective" value={new Date(charter.headerIdentity.effectiveDate).toLocaleDateString()} />
          </div>

          <div className="border border-deploy-border-subtle bg-deploy-bg-surface p-6">
            <RfpBamaramProgressTracker
              stages={stages}
              bamaramSignal={bamaram}
              showLabels={false}
              title="Progress"
            />
          </div>

          {melanium && (
            <MelaniumBalanceWidget
              balance={melanium.balance}
              lifetimeEarned={melanium.lifetimeEarned}
              lifetimeSpent={melanium.lifetimeSpent}
              customerId={melanium.customerId}
            />
          )}
        </aside>
      </div>
    </article>
  );
}
