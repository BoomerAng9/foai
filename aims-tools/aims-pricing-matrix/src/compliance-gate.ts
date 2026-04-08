/**
 * Compliance Gate — controls whether Vertex AI production calls are
 * allowed at runtime. Single source of truth for routers (Vertex,
 * OpenRouter, fal, Kie) to check before sending real traffic.
 *
 * Per project_dod_compliance_path.md memory:
 *   Phase 1: CMMC L1 + FedRAMP Ready (self-attested, no audit)
 *   Phase 2: CMMC L2 / FedRAMP Moderate (audit when contract requires)
 *   Phase 3: Sovereign Cloud (advertised, no infra until client signs)
 *
 * The gate is OFF by default. Flip it ON only when:
 *   1. The 12 self-configured CMMC L1 practices are documented
 *   2. The compliance/cmmc-l1-attestation.md file exists in SmelterOS
 *   3. The SPRS self-attestation is signed
 *   4. The GCP project is set up with Audit Logs + Workload Identity
 *      + CMEK + VPC-SC + Model Armor
 *
 * To flip, set environment variable AIMS_DOD_GATE=phase1 (or higher).
 * Code never hardcodes the open state.
 */

export type CompliancePhase = 'gated' | 'phase1' | 'phase2' | 'phase3';

export interface ComplianceStatus {
  phase: CompliancePhase;
  vertexProductionEnabled: boolean;
  cmmcLevel: 'none' | 'L1-self-attested' | 'L2-audited' | 'L3-audited';
  fedrampPosture: 'none' | 'ready' | 'moderate-authorized' | 'high-authorized';
  sovereignCloudAvailable: boolean;
  lastChecked: string; // ISO timestamp
  notes: string[];
}

function readEnvPhase(): CompliancePhase {
  const raw = (typeof process !== 'undefined' ? process.env?.AIMS_DOD_GATE : '') ?? '';
  if (raw === 'phase1' || raw === 'phase2' || raw === 'phase3') return raw;
  return 'gated';
}

export function getComplianceStatus(): ComplianceStatus {
  const phase = readEnvPhase();
  const now = new Date().toISOString();

  switch (phase) {
    case 'phase3':
      return {
        phase,
        vertexProductionEnabled: true,
        cmmcLevel: 'L2-audited',
        fedrampPosture: 'moderate-authorized',
        sovereignCloudAvailable: true,
        lastChecked: now,
        notes: [
          'Phase 3 active — Sovereign Cloud offering available on request',
          'CMMC L2 audited, FedRAMP Moderate authorized',
          'Per-customer dedicated CMEK + Assured Workloads on demand',
        ],
      };
    case 'phase2':
      return {
        phase,
        vertexProductionEnabled: true,
        cmmcLevel: 'L2-audited',
        fedrampPosture: 'moderate-authorized',
        sovereignCloudAvailable: false,
        lastChecked: now,
        notes: [
          'Phase 2 active — CMMC L2 audit complete',
          'GCP Assured Workloads in use',
          'Sovereign Cloud advertised but not yet provisioned',
        ],
      };
    case 'phase1':
      return {
        phase,
        vertexProductionEnabled: true,
        cmmcLevel: 'L1-self-attested',
        fedrampPosture: 'ready',
        sovereignCloudAvailable: false,
        lastChecked: now,
        notes: [
          'Phase 1 active — CMMC L1 self-attested, FedRAMP Ready posture',
          'Vertex AI production calls ALLOWED',
          'Standard GCP (not GovCloud yet)',
          'See compliance/cmmc-l1-attestation.md',
        ],
      };
    case 'gated':
    default:
      return {
        phase: 'gated',
        vertexProductionEnabled: false,
        cmmcLevel: 'none',
        fedrampPosture: 'none',
        sovereignCloudAvailable: false,
        lastChecked: now,
        notes: [
          'Gate CLOSED — no Vertex production calls allowed',
          'Set AIMS_DOD_GATE=phase1 after completing CMMC L1 self-attestation',
          'See project_dod_compliance_path.md memory for the phased plan',
        ],
      };
  }
}

/**
 * Convenience: returns true if Vertex production calls are currently allowed.
 * Routers should call this before dispatching to a vendorRank=1 (Vertex) row.
 * If false, the router falls back to vendorRank=2 (direct vendors) or
 * vendorRank=3 (OpenRouter) depending on availability.
 */
export function isVertexProductionEnabled(): boolean {
  return getComplianceStatus().vertexProductionEnabled;
}

/**
 * Returns the lowest vendorRank that's currently allowed.
 * - Gated → 2 (direct vendors only, no Vertex)
 * - Phase 1+ → 1 (Vertex first, full chain)
 *
 * Use this in route-selection: if a row's vendorRank < minimumAllowedVendorRank(),
 * skip it and use the next-best.
 */
export function minimumAllowedVendorRank(): 1 | 2 {
  return isVertexProductionEnabled() ? 1 : 2;
}

/**
 * Phase progression checklist — items that must be true to advance phases.
 * Used by an admin "compliance dashboard" surface in SmelterOS.
 */
export const PHASE_1_CHECKLIST: Array<{ id: string; title: string; gcpResponsibility: boolean }> = [
  { id: 'AC.L1-3.1.1', title: 'Limit system access to authorized users (IAM, no shared accounts)', gcpResponsibility: false },
  { id: 'AC.L1-3.1.2', title: 'Limit access to permitted functions (least-privilege IAM roles)', gcpResponsibility: false },
  { id: 'AC.L1-3.1.20', title: 'Verify and control external connections (VPC + firewall allow-list)', gcpResponsibility: false },
  { id: 'AC.L1-3.1.22', title: 'Control public information posted (Charter-Ledger separation — AVVA NOON canonical)', gcpResponsibility: false },
  { id: 'IA.L1-3.5.1', title: 'Identify users uniquely (Workload Identity Federation)', gcpResponsibility: false },
  { id: 'IA.L1-3.5.2', title: 'Authenticate before access (OAuth + MFA on all GCP)', gcpResponsibility: false },
  { id: 'MP.L1-3.8.3', title: 'Sanitize media before disposal (GCS versioning + secure delete)', gcpResponsibility: false },
  { id: 'PE.L1-3.10.1', title: 'Physical access limited (GCP datacenter)', gcpResponsibility: true },
  { id: 'PE.L1-3.10.3', title: 'Escort visitors (GCP datacenter)', gcpResponsibility: true },
  { id: 'PE.L1-3.10.4', title: 'Audit logs of physical access (Cloud Audit Logs enabled)', gcpResponsibility: false },
  { id: 'PE.L1-3.10.5', title: 'Control physical access devices (GCP datacenter)', gcpResponsibility: true },
  { id: 'SC.L1-3.13.1', title: 'Monitor and protect communications boundaries (VPC Service Controls)', gcpResponsibility: false },
  { id: 'SC.L1-3.13.5', title: 'Subnetworks for publicly accessible system components', gcpResponsibility: false },
  { id: 'SI.L1-3.14.1', title: 'Identify, report, correct flaws (vulnerability scanning + alerting)', gcpResponsibility: false },
  { id: 'SI.L1-3.14.2', title: 'Protection from malicious code (container scanning + Model Armor)', gcpResponsibility: false },
  { id: 'SI.L1-3.14.4', title: 'Update malicious code protection (auto-update base images)', gcpResponsibility: false },
  { id: 'SI.L1-3.14.5', title: 'Periodic system scans (Cloud Security Scanner monthly)', gcpResponsibility: false },
];

/**
 * Returns just the items we have to do ourselves (12 of 17).
 * GCP handles the other 5 by virtue of running their datacenter.
 */
export function getOurResponsibilityChecklist() {
  return PHASE_1_CHECKLIST.filter((item) => !item.gcpResponsibility);
}
