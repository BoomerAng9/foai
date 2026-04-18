/**
 * RfpBamaramProgressTracker — 10-stage horizontal rail for an
 * engagement's RFP → BAMARAM progression.
 *
 * Differentiated approach (per Open Mind's three-approach rule):
 * horizontal rail of 10 dots. Each dot carries a gate-status glyph
 * (✓ approved / ⟳ pending / ✗ rejected / ↑ escalated). The active
 * stage renders a neon ring; completed stages are solid neon-ish;
 * pending stages are muted. Stage 10 gets a BAMARAM! treatment when
 * bamaramSignal is true — the final dot becomes a full outlined neon
 * badge. Stage labels sit BELOW the rail in mono so they read like a
 * timeline stamp, not a form stepper.
 *
 * Conventional (numbered 1/2/3 pill stepper with checkmarks) —
 *   REJECTED as generic SaaS onboarding look.
 * Experimental (circular mandala of 10 petals with BAMARAM center) —
 *   REJECTED as it breaks the linear reading flow progress UIs need
 *   AND doesn't fit inside a CharterDetailView row.
 *
 * Pre-mortem blacklist the render must NOT match:
 *   - Rainbow gradient progress bar
 *   - Numbered pill stepper
 *   - shadcn default stepper look
 *   - Any onboarding wizard look
 *   - Checkmark + grey-circle combo
 *
 * Integrates with @aims/contracts: stages array matches the
 * `TimestampedDeliverable` shape (stage + hitlGateStatus + ownerAgent +
 * artifactUri + timestamp).
 */

import * as React from 'react';

// Stage identity mirrors @aims/contracts RFP_BAMARAM_STAGES.
// We keep the literal union here rather than importing so the
// component stays self-contained if @aims/contracts isn't resolvable
// at build time for a consumer (e.g. Storybook / scratch app).
export const TRACKER_STAGES = [
  'rfp_intake',
  'rfp_response',
  'commercial_proposal',
  'technical_sow',
  'formal_quote',
  'purchase_order',
  'assignment_log',
  'qa_security',
  'delivery_receipt',
  'completion_summary',
] as const;

export type TrackerStage = (typeof TRACKER_STAGES)[number];

export type TrackerGateStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'not_started';

export interface TrackerStageEntry {
  stage: TrackerStage;
  hitlGateStatus: TrackerGateStatus;
  ownerAgent?: string | null;
  artifactUri?: string | null;
  timestamp?: string | null;
  whatChanged?: string | null;
}

export interface RfpBamaramProgressTrackerProps {
  /**
   * Stage entries in any order — the component re-sorts by canonical
   * ordinal. Missing stages render as `not_started`.
   */
  stages: readonly TrackerStageEntry[];
  /** The stage currently "in flight" (HITL pending). Optional — defaults to the first non-approved stage. */
  currentStage?: TrackerStage | null;
  /** BAMARAM! signal at completion — turns stage 10 into the outlined neon badge. */
  bamaramSignal?: boolean;
  /** Click handler per stage dot — useful for drilling into stage artifacts. */
  onStageClick?: (stage: TrackerStage) => void;
  /** Whether to show the stage label below each dot. Defaults to true. */
  showLabels?: boolean;
  /** A short headline above the rail. Optional. */
  title?: string;
}

const STAGE_ORDINAL: Record<TrackerStage, number> = {
  rfp_intake: 1,
  rfp_response: 2,
  commercial_proposal: 3,
  technical_sow: 4,
  formal_quote: 5,
  purchase_order: 6,
  assignment_log: 7,
  qa_security: 8,
  delivery_receipt: 9,
  completion_summary: 10,
};

const STAGE_SHORT_LABEL: Record<TrackerStage, string> = {
  rfp_intake: 'Intake',
  rfp_response: 'Response',
  commercial_proposal: 'Proposal',
  technical_sow: 'SoW',
  formal_quote: 'Quote',
  purchase_order: 'PO',
  assignment_log: 'Assignment',
  qa_security: 'QA / Sec',
  delivery_receipt: 'Delivery',
  completion_summary: 'BAMARAM',
};

function glyph(status: TrackerGateStatus): string {
  switch (status) {
    case 'approved':
      return '✓';
    case 'rejected':
      return '✗';
    case 'escalated':
      return '↑';
    case 'pending':
      return '⟳';
    case 'not_started':
    default:
      return '';
  }
}

export function RfpBamaramProgressTracker({
  stages,
  currentStage = null,
  bamaramSignal = false,
  onStageClick,
  showLabels = true,
  title,
}: RfpBamaramProgressTrackerProps): React.ReactElement {
  // Build a full 10-slot array so missing stages render as not_started.
  const stageMap = new Map<TrackerStage, TrackerStageEntry>();
  for (const entry of stages) {
    stageMap.set(entry.stage, entry);
  }
  const rail: TrackerStageEntry[] = TRACKER_STAGES.map(
    (s) =>
      stageMap.get(s) ?? {
        stage: s,
        hitlGateStatus: 'not_started' as const,
      },
  );

  // Infer the active stage if not passed: first non-approved after at least one non-not_started.
  const inferredCurrent =
    currentStage ??
    rail.find((r) => r.hitlGateStatus === 'pending' || r.hitlGateStatus === 'escalated')?.stage ??
    null;

  return (
    <section
      aria-label="Engagement progress — RFP through BAMARAM"
      className="w-full bg-deploy-bg-deep text-deploy-text font-body"
    >
      {title && (
        <h3 className="mb-4 font-body text-xs tracking-[0.24em] text-deploy-text-muted uppercase">
          {title}
        </h3>
      )}

      <ol
        role="list"
        className="relative flex w-full items-start justify-between gap-2"
      >
        {/* Rail line — absolute-positioned behind the dots */}
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 top-[0.75rem] h-px bg-deploy-border-subtle"
        />

        {rail.map((entry) => {
          const ordinal = STAGE_ORDINAL[entry.stage];
          const isCurrent = inferredCurrent === entry.stage;
          const isBamaram = ordinal === 10 && bamaramSignal;

          return (
            <li
              key={entry.stage}
              className="relative flex flex-1 flex-col items-center gap-2"
            >
              <DotButton
                entry={entry}
                ordinal={ordinal}
                isCurrent={isCurrent}
                isBamaram={isBamaram}
                onStageClick={onStageClick}
              />
              {showLabels && (
                <StageLabel
                  entry={entry}
                  isCurrent={isCurrent}
                  isBamaram={isBamaram}
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ── Internal sub-components ────────────────────────────────────────

function DotButton({
  entry,
  ordinal,
  isCurrent,
  isBamaram,
  onStageClick,
}: {
  entry: TrackerStageEntry;
  ordinal: number;
  isCurrent: boolean;
  isBamaram: boolean;
  onStageClick?: (stage: TrackerStage) => void;
}): React.ReactElement {
  const Tag = onStageClick ? 'button' : 'div';
  const props = onStageClick
    ? {
        type: 'button' as const,
        onClick: () => onStageClick(entry.stage),
      }
    : {};

  // Size + fill based on state
  const base =
    'relative z-10 flex h-6 w-6 items-center justify-center text-[0.65rem] leading-none font-mono ' +
    'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon';

  let stateClasses: string;
  if (isBamaram) {
    stateClasses = 'border-2 border-deploy-neon text-deploy-neon shadow-deploy-neon bg-deploy-bg-deep';
  } else if (entry.hitlGateStatus === 'approved') {
    stateClasses = 'bg-deploy-neon text-deploy-bg-deep';
  } else if (entry.hitlGateStatus === 'rejected') {
    stateClasses = 'bg-deploy-bg-surface text-[color:var(--deploy-danger,#FF3B3B)] border border-[color:var(--deploy-danger,#FF3B3B)]';
  } else if (entry.hitlGateStatus === 'escalated') {
    stateClasses = 'bg-deploy-bg-surface text-deploy-accent-gold border border-deploy-accent-gold';
  } else if (entry.hitlGateStatus === 'pending' || isCurrent) {
    stateClasses = 'bg-deploy-bg-surface border border-deploy-neon text-deploy-neon';
  } else {
    // not_started
    stateClasses = 'bg-deploy-bg-surface border border-deploy-border-subtle text-deploy-text-subtle';
  }

  const currentRing = isCurrent && !isBamaram ? 'ring-2 ring-deploy-neon ring-offset-2 ring-offset-deploy-bg-deep' : '';

  const tooltipLines = [
    `${ordinal}. ${STAGE_SHORT_LABEL[entry.stage]}`,
    `status: ${entry.hitlGateStatus}`,
    entry.ownerAgent ? `owner: ${entry.ownerAgent}` : null,
    entry.timestamp ? `timestamp: ${entry.timestamp}` : null,
    entry.whatChanged ? `changed: ${entry.whatChanged}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <Tag
      {...props}
      aria-label={`${ordinal}: ${STAGE_SHORT_LABEL[entry.stage]} — ${entry.hitlGateStatus}`}
      aria-current={isCurrent ? 'step' : undefined}
      title={tooltipLines}
      className={`${base} ${stateClasses} ${currentRing}`}
    >
      <span aria-hidden="true">{glyph(entry.hitlGateStatus) || ordinal}</span>
    </Tag>
  );
}

function StageLabel({
  entry,
  isCurrent,
  isBamaram,
}: {
  entry: TrackerStageEntry;
  isCurrent: boolean;
  isBamaram: boolean;
}): React.ReactElement {
  const tone = isBamaram
    ? 'text-deploy-neon'
    : isCurrent
    ? 'text-deploy-text'
    : entry.hitlGateStatus === 'approved'
    ? 'text-deploy-text-muted'
    : 'text-deploy-text-subtle';

  return (
    <span
      className={`mt-1 font-mono text-[0.625rem] tracking-[0.08em] uppercase ${tone}`}
    >
      {STAGE_SHORT_LABEL[entry.stage]}
    </span>
  );
}
