/**
 * NIL market-rate lookup — pluggable interface + deterministic stub.
 *
 * The production implementation queries Per-side performance + NIL
 * deal-tracking data. For unit tests and offline runs, consumers can
 * pass `STUB_MARKET_RATE_LOOKUP` (a deterministic in-memory lookup
 * covering the most common QB/WR/RB/pitcher brackets). Consumers who
 * don't pass a lookup get no market-rate section in the review — the
 * rest of the clause-rule review still fires.
 */

export interface MarketRateQuery {
  sport: string;                                 // 'football', 'basketball', 'baseball'...
  position?: string;                             // 'QB', 'WR', 'PG', 'RHP'...
  playerTier?: 'elite' | 'starter' | 'role-player';
  dealType: 'nil-contract';
  /** ISO year for the season this deal is dated to. Defaults current year. */
  season?: string;
}

export interface MarketRateResult {
  comparableCount: number;
  median: number;
  percentile25: number;
  percentile75: number;
  currency: string;
  /** Matches `FormSubmission.compensation.frequency` — one-time, monthly, etc. */
  frequency: 'one-time' | 'monthly' | 'annual' | 'per-appearance' | 'per-post';
}

export type MarketRateLookup = (q: MarketRateQuery) => MarketRateResult | null;

// ── In-memory deterministic stub (used by tests + DRY-RUN tooling) ────

interface StubKey {
  sport: string;
  position: string;
  tier: NonNullable<MarketRateQuery['playerTier']>;
}

/** Pinned snapshot. Numbers are illustrative, not market-binding. */
const STUB_DATA: Array<StubKey & Omit<MarketRateResult, 'currency'>> = [
  // football
  { sport: 'football', position: 'QB', tier: 'elite',
    comparableCount: 42, median: 80_000, percentile25: 45_000, percentile75: 180_000, frequency: 'annual' },
  { sport: 'football', position: 'QB', tier: 'starter',
    comparableCount: 68, median: 18_000, percentile25: 8_000, percentile75: 42_000, frequency: 'annual' },
  { sport: 'football', position: 'QB', tier: 'role-player',
    comparableCount: 112, median: 4_500, percentile25: 1_200, percentile75: 12_000, frequency: 'annual' },
  { sport: 'football', position: 'WR', tier: 'elite',
    comparableCount: 55, median: 42_000, percentile25: 20_000, percentile75: 95_000, frequency: 'annual' },
  { sport: 'football', position: 'WR', tier: 'starter',
    comparableCount: 92, median: 9_500, percentile25: 3_500, percentile75: 22_000, frequency: 'annual' },
  { sport: 'football', position: 'RB', tier: 'elite',
    comparableCount: 38, median: 30_000, percentile25: 14_000, percentile75: 72_000, frequency: 'annual' },
  // basketball
  { sport: 'basketball', position: 'PG', tier: 'elite',
    comparableCount: 48, median: 65_000, percentile25: 30_000, percentile75: 150_000, frequency: 'annual' },
  { sport: 'basketball', position: 'PG', tier: 'starter',
    comparableCount: 74, median: 14_000, percentile25: 5_500, percentile75: 32_000, frequency: 'annual' },
  // baseball
  { sport: 'baseball', position: 'RHP', tier: 'elite',
    comparableCount: 26, median: 22_000, percentile25: 9_000, percentile75: 55_000, frequency: 'annual' },
];

/**
 * Deterministic in-memory stub. Use for tests and demos. Returns null
 * for any combination not in the snapshot — callers should handle the
 * null-result path explicitly.
 */
export const STUB_MARKET_RATE_LOOKUP: MarketRateLookup = (q) => {
  const tier = q.playerTier ?? 'starter';
  const position = q.position ?? 'QB';
  const row = STUB_DATA.find(
    (r) => r.sport === q.sport && r.position === position && r.tier === tier,
  );
  if (!row) return null;
  return {
    comparableCount: row.comparableCount,
    median: row.median,
    percentile25: row.percentile25,
    percentile75: row.percentile75,
    currency: 'USD',
    frequency: row.frequency,
  };
};
