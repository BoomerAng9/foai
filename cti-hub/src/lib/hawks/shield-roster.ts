/**
 * Shield Division Roster
 * =======================
 * Pairs Shield Division character profiles with operational metadata.
 * Grouped by Squad for the Cyber Hawks subpage.
 */

import type { HawkCardData } from '@/components/hawks/HawkCard';
import { 
  ALL_SHIELD_DIVISION_PROFILES, 
} from '@/lib/hawks/shield-characters';

interface ShieldOpsMeta {
  slug: string;
  role: string;
  capabilities: string[];
  sampleMission: string;
}

const SHIELD_OPS: ShieldOpsMeta[] = [
  // ─── Wave 1 ───
  {
    slug: 'lil_scope_hawk',
    role: 'Kinetic Execution — zero-day response and targeted remediation',
    capabilities: [
      'Kinetic zero-day response',
      'High-precision artifact neutralization',
      'Surgical patch deployment',
      'Adversary infraestructura disruption',
      'Real-time threat suppression',
    ],
    sampleMission: 'Neutralize the active zero-day exploit in the production cluster.',
  },
  {
    slug: 'lil_seal_hawk',
    role: 'Privacy — PII redaction and edge data governance',
    capabilities: [
      'Real-time PII redaction at the edge',
      'Formal kernel verification',
      'Privacy-law boundary enforcement (GDPR/CCPA)',
      'Data residency audit',
      'Tokenization engine management',
    ],
    sampleMission: 'Redact all PII from the outgoing telemetry stream before storage.',
  },
  {
    slug: 'lil_mast_hawk',
    role: 'Identity — SAT co-signing and PKI infrastructure',
    capabilities: [
      'Multi-sig SAT co-signing',
      'Identity infrastructure management',
      'Cryptographic proof generation',
      'Root key custody',
      'Credential lifecycle management',
    ],
    sampleMission: 'Co-sign the deployment warrant for the Q3 infrastructure update.',
  },
  {
    slug: 'lil_doubt_hawk',
    role: 'Audit — Independent reporting and integrity verification',
    capabilities: [
      'Direct-to-CEO reporting line',
      'Continuous integrity monitoring',
      'Policy violation detection',
      'Shadow IT discovery',
      'Air-gapped audit logging',
    ],
    sampleMission: 'Run an independent audit on the internal admin access logs.',
  },
  {
    slug: 'lil_peel_hawk',
    role: 'Security R&D — Malware reverse-engineering and proof-checks',
    capabilities: [
      'Advanced malware reverse-engineering',
      'Formal proof-obligation verification',
      'Zero-trust architecture audit',
      'Binary vulnerability analysis',
      'Kani/Prusti formal verification',
    ],
    sampleMission: 'Verify the formal proof for the new kernel-level memory allocator.',
  },

  // ─── Wave 2 (Gold & Platinum) ───
  {
    slug: 'lil_omen_hawk',
    role: 'Threat Intel — Dark web monitoring and APT forecasting',
    capabilities: [
      'Dark web monitoring and infiltration',
      'APT dossier maintenance',
      'Predictive threat modeling',
      'Zero-day trend forecasting',
      'Campaign attribution analysis',
    ],
    sampleMission: 'Forecast potential APT activity targeting our sector next month.',
  },
  {
    slug: 'lil_salt_hawk',
    role: 'Vault — Secrets management and HSM operations',
    capabilities: [
      'HSM key custody and lifecycle',
      'Shamir secret-sharing operations',
      'Post-quantum hybrid crypto (Dilithium)',
      'Root-of-trust provisioning',
      'Secure vault orchestration',
    ],
    sampleMission: 'Perform a key-ceremony for the new post-quantum root certificates.',
  },
  {
    slug: 'lil_drift_hawk',
    role: 'Stealth — OT/ICS/SCADA and insider threat simulation',
    capabilities: [
      'OT/SCADA environment penetration',
      'Living-off-the-land adversary emulation',
      'IoT firmware persistence testing',
      'Deep cover network infiltration',
      'Low-signature footprint management',
    ],
    sampleMission: 'Simulate an insider threat targeting the SCADA control loop.',
  },
  {
    slug: 'lil_bell_hawk',
    role: 'Command — Incident Command and P0 war-room ops',
    capabilities: [
      'P0 incident command authority',
      'War-room orchestration',
      'BC/DR program ownership',
      'Regulatory compliance management',
      'Mode 3 Survival coordination',
    ],
    sampleMission: 'Assume command of the high-severity database outage war-room.',
  },
  {
    slug: 'lil_veil_hawk',
    role: 'Deception — Honeypots and counter-intelligence',
    capabilities: [
      'Global honeypot network deployment',
      'Honeytoken and Canary placement',
      'Counter-intelligence operations',
      'Adversary psychological profiling',
      'False-flag detection',
    ],
    sampleMission: 'Deploy a cluster of mirrored honeypots to attract and log the scan.',
  },

  // ─── Wave 3 (Black Squad) ───
  {
    slug: 'lil_hook_hawk',
    role: 'Orchestrator — Mission lead and attack lifecycle',
    capabilities: [
      'Squad coordination for Black Ops',
      'Attack lifecycle orchestration',
      'SAT warrant management',
      'Proof package assembly',
      'Target acquisition strategy',
    ],
    sampleMission: 'Lead the squad in the annual external penetration test.',
  },
  {
    slug: 'lil_recon_hawk',
    role: 'Architect — Payload crafting and passive OSINT',
    capabilities: [
      'Custom exploit payload architecture',
      'Passive OSINT collection',
      'Technology fingerprinting',
      'Vulnerability chaining',
      'Evasion technique design',
    ],
    sampleMission: 'Craft a custom payload to test the new EDR solution.',
  },
  {
    slug: 'lil_tag_hawk',
    role: 'Recon — Asset discovery and CVE matching',
    capabilities: [
      'High-speed asset discovery',
      'Active attack surface scanning',
      'CVE matching and prioritization',
      'Cryptographic target tagging',
      'Inventory drift detection',
    ],
    sampleMission: 'Scan the external IP range and tag all systems with critical CVEs.',
  },
  {
    slug: 'lil_site_hawk',
    role: 'Pivoting — Lateral movement and AD enumeration',
    capabilities: [
      'Network segment pivoting',
      'Privilege escalation simulation',
      'Active Directory enumeration',
      'Cloud lateral movement testing',
      'Vertical/Horizontal movement mapping',
    ],
    sampleMission: 'Test for lateral movement paths from the guest wifi to production.',
  },
  {
    slug: 'lil_test_hawk',
    role: 'Exfiltration — DLP bypass and boundary testing',
    capabilities: [
      'DLP control bypass testing',
      'Egress filter audit',
      'Data boundary verification',
      'Evidence artifact capture',
      'Simulated exfiltration flows',
    ],
    sampleMission: 'Attempt a simulated data exfiltration through the email gateway.',
  },

  // ─── Wave 4 (Blue Squad) ───
  {
    slug: 'lil_watch_hawk',
    role: 'Detection — SIEM/XDR telemetry correlation',
    capabilities: [
      'Real-time telemetry ingestion',
      'XDR/SOAR alert correlation',
      'CSPM/CNAPP monitoring',
      'Behavioral anomaly detection',
      'Custom detection rule design',
    ],
    sampleMission: 'Configure a new detection rule for multi-factor fatigue attacks.',
  },
  {
    slug: 'lil_wire_hawk',
    role: 'SIGINT — Network defense and ZTNA monitoring',
    capabilities: [
      'Signal intelligence isolation',
      'IDS/IPS signature management',
      'ZTNA connection monitoring',
      'DNS security and sinkholing',
      'Egress traffic analysis',
    ],
    sampleMission: 'Monitor the network for weak signals of command-and-control traffic.',
  },
  {
    slug: 'lil_track_hawk',
    role: 'Hunter — Hypothesis-driven threat hunting',
    capabilities: [
      'MITRE ATT&CK hunt orchestration',
      'UEBA behavioral analysis',
      'IOC retroactive search',
      'Incident reconstruction',
      'Adversary persistence discovery',
    ],
    sampleMission: 'Hunt for persistent artifacts based on the latest threat report.',
  },
  {
    slug: 'lil_patch_hawk',
    role: 'Remediation — Surgical recovery and DevSecOps',
    capabilities: [
      'Surgical vulnerability patching',
      'SAST/DAST/SCA integration',
      'EPSS-based prioritization',
      'Automated remediation workflows',
      'Configuration drift correction',
    ],
    sampleMission: 'Remediate all critical vulnerabilities with an EPSS score > 0.9.',
  },
  {
    slug: 'lil_lab_hawk',
    role: 'Forensics — Memory/disk/cloud reconstruction',
    capabilities: [
      'Digital forensics reconstruction',
      'Memory and disk image analysis',
      'Chain-of-custody management',
      'Container/Cloud forensics',
      'Causal chain modeling',
    ],
    sampleMission: 'Reconstruct the causal chain of the security incident from the logs.',
  },
  {
    slug: 'lil_pulse_hawk',
    role: 'Performance — Degradation Spectrum management',
    capabilities: [
      'SLO monitoring and alerting',
      'Degradation Spectrum orchestration',
      'Autonomic throttle management',
      'Shadow pipeline deployment',
      'Latency-based circuit breaking',
    ],
    sampleMission: 'Switch the fleet to Mode 2 Congested due to high service latency.',
  },

  // ─── Wave 5 (Red Squad - Cloud Native Defense) ───
  {
    slug: 'lil_mesh_hawk',
    role: 'Service Mesh — mTLS enforcement and traffic-policy auditing',
    capabilities: [
      'mTLS certificate lifecycle management',
      'L7 traffic-policy enforcement',
      'Service-to-service authentication audit',
      'Sidecar proxy integrity verification',
      'Egress traffic filtering',
    ],
    sampleMission: 'Enforce strict mTLS across the payment-processing mesh.',
  },
  {
    slug: 'lil_kube_hawk',
    role: 'K8s Security — Admission control and container runtime defense',
    capabilities: [
      'Kubernetes admission controller management',
      'Runtime container security monitoring',
      'Pod Security Policy (PSP) enforcement',
      'etcd database encryption audit',
      'K8s API-server hardening',
    ],
    sampleMission: 'Intercept and audit all container-creation requests in the prod-alpha namespace.',
  },
  {
    slug: 'lil_node_hawk',
    role: 'Edge Security — Bare-metal attestation and TPM root-of-trust',
    capabilities: [
      'Remote bare-metal attestation',
      'TPM 2.0 root-of-trust verification',
      'Edge-node hardware identity management',
      'Hardware-bus communication audit',
      'Secure-boot configuration enforcement',
    ],
    sampleMission: 'Verify the hardware integrity of the new edge-inference cluster.',
  },
  {
    slug: 'lil_shard_hawk',
    role: 'Storage Security — Shard-level encryption and vault defense',
    capabilities: [
      'Distributed database shard encryption',
      'Data-at-rest vault management',
      'Cryptographic shard-key rotation',
      'Storage-layer access pattern audit',
      'Multi-cloud storage policy enforcement',
    ],
    sampleMission: 'Rotate the shard-level encryption keys for the user-profile database.',
  },
  {
    slug: 'lil_lambda_hawk',
    role: 'Serverless Security — Function-level auditing and cold-start defense',
    capabilities: [
      'Function-level permission auditing',
      'Serverless runtime integrity checks',
      'Cold-start vulnerability remediation',
      'Event-driven security orchestration',
      'Lambda execution-environment hardening',
    ],
    sampleMission: 'Run a security audit on the new event-driven image processing functions.',
  },
  {
    slug: 'lil_proxy_hawk',
    role: 'Edge Defense — WAF policy and global DDoS suppression',
    capabilities: [
      'Global WAF policy management',
      'Adaptive DDoS suppression',
      'CDN-edge security orchestration',
      'Geo-fencing and traffic filtering',
      'Bot-mitigation strategy execution',
    ],
    sampleMission: 'Mitigate the active layer-7 DDoS attack targeting the API gateway.',
  },

  // ─── Wave 6 (Green Squad - Supply Chain & Intelligence) ───
  {
    slug: 'lil_forge_hawk',
    role: 'Pipeline Security — Build-artifact signing and CI/CD integrity',
    capabilities: [
      'CI/CD pipeline hardening',
      'Build-artifact cryptographic signing',
      'Reproducible-build verification',
      'Pipeline secrets-injection audit',
      'Build-node integrity attestation',
    ],
    sampleMission: 'Sign the production build-artifacts for the v3.2.0 release.',
  },
  {
    slug: 'lil_scan_hawk',
    role: 'Vulnerability Analysis — SCA and dependency auditing',
    capabilities: [
      'Software Composition Analysis (SCA)',
      'CVE dependency matching and alerting',
      'Open-source license compliance audit',
      'Vulnerability reachability analysis',
      'Automated dependency patching',
    ],
    sampleMission: 'Scan the main repository for critical open-source vulnerabilities.',
  },
  {
    slug: 'lil_logic_hawk',
    role: 'Logic Research — Business logic vulnerability chaining',
    capabilities: [
      'Business logic vulnerability discovery',
      'Complex attack-chain modeling',
      'Flow-state integrity auditing',
      'State-machine vulnerability testing',
      'API logic-flaw identification',
    ],
    sampleMission: 'Identify potential logic-flaws in the multi-step checkout sequence.',
  },
  {
    slug: 'lil_sense_hawk',
    role: 'Intelligence — OSINT and human-factor defense',
    capabilities: [
      'Passive OSINT collection and analysis',
      'Social engineering threat modeling',
      'Credential-leak dark-web monitoring',
      'Executive-protection intelligence',
      'Brand-impersonation discovery',
    ],
    sampleMission: 'Monitor for leaked corporate credentials across the dark-web.',
  },
  {
    slug: 'lil_trace_hawk',
    role: 'Supply Chain Tracing — SBOM and provenance verification',
    capabilities: [
      'SBOM (Software Bill of Materials) generation',
      'Supply chain provenance verification',
      'Upstream dependency-path tracing',
      'Binary-artifact lineage auditing',
      'Vendor security-posture tracking',
    ],
    sampleMission: 'Trace the provenance of the third-party ML-inference library.',
  },
];

export const SHIELD_ROSTER: HawkCardData[] = SHIELD_OPS.map((op) => {
  const profile = ALL_SHIELD_DIVISION_PROFILES.find((p) => p.slug === op.slug);
  if (!profile) {
    throw new Error(`No shield profile for ${op.slug}`);
  }
  return {
    profile,
    role: op.role,
    capabilities: op.capabilities,
    sampleMission: op.sampleMission,
  };
});

// Grouping by Squad
export const BLACK_SQUAD = SHIELD_ROSTER.filter((h) => h.profile.visualDescription.includes('Black Squad'));
export const WHITE_SQUAD = SHIELD_ROSTER.filter((h) => h.profile.visualDescription.includes('White Squad'));
export const GOLD_PLATINUM_SQUAD = SHIELD_ROSTER.filter((h) => h.profile.visualDescription.includes('Gold & Platinum Squad'));
export const BLUE_SQUAD = SHIELD_ROSTER.filter((h) => h.profile.visualDescription.includes('Blue Squad'));
export const RED_SQUAD = SHIELD_ROSTER.filter((h) => h.profile.visualDescription.includes('Red Squad'));
export const GREEN_SQUAD = SHIELD_ROSTER.filter((h) => h.profile.visualDescription.includes('Green Squad'));
export const REMAINING_SHIELD = SHIELD_ROSTER.filter((h) => 
  !BLACK_SQUAD.includes(h) && 
  !WHITE_SQUAD.includes(h) && 
  !GOLD_PLATINUM_SQUAD.includes(h) && 
  !BLUE_SQUAD.includes(h) &&
  !RED_SQUAD.includes(h) &&
  !GREEN_SQUAD.includes(h)
);
