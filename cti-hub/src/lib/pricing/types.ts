/**
 * A.I.M.S. Pricing Matrix — Canonical Types
 * ==========================================
 * Single source of truth for the ecosystem-wide pricing & catalog.
 *
 * Schema shape adopted from Rish's 2022 HIDT Training Matrix
 * (multi-axis cross-tab: sector × topic × audience × level × cost).
 *
 * Replaces scattered MODELS objects in:
 *   - AIMS/backend/uef-gateway/src/llm/openrouter.ts
 *   - AIMS/backend/uef-gateway/src/llm/vertex-ai.ts
 *   - foai/SmelterOS/apps/web/src/lib/openrouter/client.ts
 *
 * Pricing format is GLOBAL across the ecosystem (A.I.M.S. core,
 * Per|Form, SmelterOS, CTI Hub, future verticals): the 3-6-9 Tesla
 * Vortex frequency × V.I.B.E. Group × stacked Three Pillars.
 */

// ─── Row taxonomy ────────────────────────────────────────────────────

export type RowType =
  | 'model'           // an LLM, image, video, audio, embed, or related API
  | 'plan'            // a subscription plan row (3-6-9 frequency × V.I.B.E. group)
  | 'bundle'          // a mix-and-match combination of model rows
  | 'service'         // a service offering (storage, compute, MCP, etc.)
  | 'pillar'          // a Three-Pillars add-on (Confidence/Convenience/Security)
  | 'compliance';     // a compliance-tier offering (CMMC, FedRAMP, Sovereign Cloud)

export type Sector =
  | 'llm'
  | 'image'
  | 'video'
  | 'audio'
  | 'tts'
  | 'stt'
  | 'embed'
  | 'storage'
  | 'compute'
  | 'mcp'
  | 'plan'
  | 'pillar'
  | 'compliance'
  | 'workforce';

export type Tier =
  | 'open-source'
  | 'free'
  | 'fast'
  | 'standard'
  | 'premium'
  | 'flagship';

export type License = 'open-source' | 'proprietary' | 'mixed';

export type Capability =
  | 'coding'
  | 'long-horizon'
  | 'reasoning'
  | 'vision'
  | 'function-calling'
  | 'multimodal'
  | 'realtime'
  | 'streaming'
  | 'tool-use'
  | 'cloning'
  | 'voice'
  | 'agentic'
  | 'design'        // graphic / visual design (Recraft, Stitch, C1 Thesys, Gamma)
  | 'presentation'  // deck/slide generation (Gamma, Beautiful.ai)
  | 'document'      // long-form documents, brochures, reports, one-pagers (Gamma)
  | 'webpage'       // single-page sites, landing pages, microsites (Gamma, Stitch)
  | 'social-graphic'// social media tiles, posts, story graphics (Gamma)
  | 'diagram'       // visual diagrams from text (Napkin)
  | 'vector'        // vector graphics output (Recraft)
  | 'page-builder'; // page/UI builder (Stitch MCP, C1 Thesys, Gamma)

// ─── 3-6-9 Tesla Vortex frequency ─────────────────────────────────────

export type Frequency = '3-month' | '6-month' | '9-month' | 'ppu';

export type VibeGroup = 'individual' | 'family' | 'team' | 'enterprise';

// ─── Three Pillars ────────────────────────────────────────────────────

export type ConfidenceTier = 'standard' | 'verified' | 'guaranteed';
export type ConvenienceTier = 'standard' | 'priority' | 'instant';
export type SecurityTier = 'essential' | 'professional' | 'fortress';

// ─── Currency support ─────────────────────────────────────────────────

export type Currency = 'USD' | 'SAR' | 'AED' | 'QAR' | 'OMR' | 'GBP' | 'EUR';

// ─── Multi-currency price object ──────────────────────────────────────

export interface PriceByCurrency {
  USD?: number;
  SAR?: number;
  AED?: number;
  QAR?: number;
  OMR?: number;
  GBP?: number;
  EUR?: number;
}

// ─── Competitive comparison (HIDT "Eng. Comparison" pattern) ──────────

export interface CompetitorRef {
  name: string;
  price: number;
  currency: Currency;
  source?: string;
  notes?: string;
}

// ─── Benchmark signals ────────────────────────────────────────────────

export interface BenchmarkScores {
  swe_bench_pro?: number;
  terminal_bench?: number;
  nl2repo?: number;
  long_horizon_hours?: number;
  // Open-ended for future benchmarks
  [key: string]: number | undefined;
}

// ─── Core row ─────────────────────────────────────────────────────────

export interface PricingRow {
  // Identity
  id: string;
  rowType: RowType;
  sector: Sector;
  topic: string;
  description?: string;

  // Provider details (for models / services)
  providerId?: string;
  providerName?: string;
  routeId?: string;          // OpenRouter route, Vertex model id, etc.
  license?: License;

  // Capability tagging (HIDT "Soft Skills" column)
  capabilities: Capability[];
  contextWindow?: number;

  // Tiering (HIDT skill-level columns map to plan tiers)
  tier?: Tier;
  unlockedAt: Frequency[];   // which frequencies grant access
  vibeGroups: VibeGroup[];   // which V.I.B.E. groups can use this row

  // Pricing — model rows use per-1M-token; service rows use unit pricing
  inputPer1M?: number;
  outputPer1M?: number;
  unitPrice?: number;
  unit?: 'per_image' | 'per_second' | 'per_minute' | 'per_gb_month' | 'per_request' | 'per_seat_month';

  // Multi-currency (HIDT CYBER sheet pattern)
  multiCurrency?: PriceByCurrency;

  // Plan-tier discount on this row's price for subscribers vs PPU
  ppuMultiplier: number;     // 1.4 = PPU pays 1.4× plan rate (per pricing page)

  // Three Pillars modifiers (apply when stacked on a plan)
  confidenceUplift?: number; // e.g. 0.15 for Verified, 0.35 for Guaranteed
  convenienceUplift?: number;// e.g. 0.20 for Priority, 0.45 for Instant
  securityUplift?: number;   // e.g. 0.25 for Professional, 0.50 for Fortress

  // Competitive context (HIDT "Eng. Comparison" pattern)
  competitor?: CompetitorRef;

  // Demand & importance signals (HIDT "Soft Skills" demand temperature)
  demand?: 'High' | 'Moderate' | 'Medium' | 'Low';
  importance?: 'Essential' | 'High' | 'Medium' | 'Low';

  // Prerequisites (HIDT CYBER sheet)
  prerequisites?: string[];

  // Outcomes & takeaways (HIDT "Sheet1" pattern)
  outcomes?: string[];
  certLevel?: 'Basic' | 'Intermediate' | 'Advanced';
  accreditation?: string;
  sourceUrl?: string;

  // Benchmark signals (for model rows)
  benchmarks?: BenchmarkScores;

  // Lifecycle
  lastVerified: string;       // ISO 8601 timestamp
  active: boolean;
  notes?: string;

  // Latest-only enforcement (rejects superseded versions in loader)
  supersededBy?: string;      // id of replacement row
  isLatest?: boolean;         // explicit flag for image/video models

  // Routing priority within a capability/sector group.
  // LOWER number = HIGHER priority. Undefined = default sort.
  // Used by routers to pick the best tool for a task type.
  // E.g. for design tasks: C1 Thesys (1) → Stitch MCP (2) → Recraft (3) →
  //      Ideogram (4) → Gamma (5) → Napkin (6) → Imagen 4 (7) → Nano Banana (8)
  routingPriority?: number;

  // Vendor preference rank — used at the routing-strategy level to enforce
  // "Vertex AI first, then 3rd party vendors" for general tasks.
  // 1 = Vertex/native, 2 = direct vendor (Recraft/OpenAI/Anthropic), 3 = OpenRouter, 4 = fal/Kie aggregators
  vendorRank?: 1 | 2 | 3 | 4;
}

// ─── Bundle row ───────────────────────────────────────────────────────

export interface BundleRow {
  id: string;
  name: string;
  description: string;
  memberIds: string[];        // refs to PricingRow.id
  bundlePriceUsd?: number;
  savingsVsSumUsd?: number;   // auto-computed
  vibeGroups: VibeGroup[];
  active: boolean;
  notes?: string;
}

// ─── Plan row helpers (3-6-9 Tesla structure) ────────────────────────

export interface PlanRow extends PricingRow {
  rowType: 'plan';
  sector: 'plan';
  frequency: Frequency;
  tokenAllocation: number;     // monthly token basket
  agentLimit: number;
  concurrentLimit: number;
  storageGb?: number;
  tagline?: string;            // "Entry point" / "Axis of balance" / "Completion — best rate"
}

// ─── Pillar row helpers ───────────────────────────────────────────────

export interface PillarRow extends PricingRow {
  rowType: 'pillar';
  sector: 'pillar';
  pillarType: 'confidence' | 'convenience' | 'security';
  pillarLevel: ConfidenceTier | ConvenienceTier | SecurityTier;
  upliftPercent: number;       // e.g. 0.15 = +15%
  features: string[];
}

// ─── Task multipliers ────────────────────────────────────────────────

export type TaskType =
  | 'code-generation'
  | 'code-review'
  | 'workflow-automation'
  | 'security-audit'
  | 'architecture-planning'
  | 'business-intelligence'
  | 'deployment'
  | 'multi-agent'
  | 'full-autonomous';

export interface TaskMultiplier {
  taskType: TaskType;
  label: string;
  multiplier: number;
  description: string;
}

// ─── Compliance offering ─────────────────────────────────────────────

export interface ComplianceRow extends PricingRow {
  rowType: 'compliance';
  sector: 'compliance';
  level: 'cmmc-l1' | 'cmmc-l2' | 'cmmc-l3' | 'fedramp-moderate' | 'fedramp-high' | 'dod-il2' | 'dod-il4' | 'dod-il5' | 'sovereign-cloud';
  selfAttested: boolean;
  auditRequired: boolean;
  estimatedSetupCostUsd?: number;
  estimatedAuditCostUsd?: number;
}

// ─── Matrix container ────────────────────────────────────────────────

export interface AimsPricingMatrix {
  rows: PricingRow[];
  bundles: BundleRow[];
  taskMultipliers: TaskMultiplier[];
  generatedAt: string;        // ISO timestamp
  version: string;
}
