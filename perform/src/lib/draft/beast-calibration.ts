/**
 * Beast Calibration — Compare Per|Form TIE grades against Brugler's Beast rankings
 * ==================================================================================
 * The Beast is the REFERENCE, not the replacement. We compare, flag disagreements,
 * then regrade where our analysis was off. Where we disagree with Brugler and have
 * good reason, we keep our grade and note the divergence.
 *
 * STANDARD: The Beast's presentation (one-line summaries, positional rankings,
 * position-by-position deep dives) is the MINIMUM bar. Per|Form must match that
 * quality then exceed it in design, stat tracking, reviews, and UI structure.
 */

import { BEAST_TOP_100 } from './beast-brugler-2026';

/** Per|Form seed-data rank for a player (from BOARD_2026) */
interface CalibrationEntry {
  name: string;
  position: string;
  school: string;
  beastRank: number;
  beastPositionRank: number;
  performRank: number | null;  // null = not in our board
  performGrade: number | null;
  delta: number | null;        // performRank - beastRank (negative = we ranked too low)
  action: 'keep' | 'regrade_up' | 'regrade_down' | 'add_to_board' | 'review';
  note: string;
}

/**
 * Known misranks to fix in seed-data.ts regrade:
 *
 * CRITICAL (delta > 10):
 * - Arvell Reese: Per|Form #15, Beast #1 → REGRADE UP to top 3
 * - Akheem Mesidor: Per|Form #13, Beast #28 → REGRADE DOWN, also fix school (Auburn→Miami)
 *
 * SIGNIFICANT (delta 5-10):
 * - Spencer Fano: Per|Form #14, Beast #8 → REGRADE UP
 * - Olaivavega Ioane: Per|Form #6, Beast #12 → REGRADE DOWN slightly
 * - Makai Lemon: Per|Form #8, Beast #13 → REGRADE DOWN slightly
 * - Francis Mauigoa: Per|Form #21, Beast #11 → REGRADE UP
 *
 * MISSING FROM OUR BOARD (need to add):
 * - Chris Johnson (CB3, San Diego State) — Beast #24
 * - Colton Hood (CB5, Tennessee) — Beast #30
 * - Kayden McDonald (DT1, Ohio State) — Beast #32
 * - Chase Bisontis (G2, Texas A&M) — Beast #34
 * - Peter Woods (DT2, Clemson) — Beast #35
 * - Malachi Lawrence (EDGE7, UCF) — Beast #36
 * - Zion Young (EDGE8, Missouri) — Beast #37
 * - D'Angelo Ponds (CB6, Indiana) — Beast #38
 * - Cashius Howell (EDGE9, Texas A&M) — Beast #39
 * - Germie Bernard (WR7, Alabama) — Beast #41
 * - Christen Miller (DT3, Georgia) — Beast #43
 * - Brandon Cisse (CB7, South Carolina) — Beast #45
 * - Chris Bell (WR8, Louisville) — Beast #47
 * - Jake Golday (LB4, Cincinnati) — Beast #48
 * - Gabe Jacas (EDGE11, Illinois) — Beast #49
 * - Anthony Hill Jr. (LB5, Texas) — Beast #50
 *   ... and 50 more from Beast 51-100
 *
 * REGRADE PRIORITIES (for draft launch):
 * 1. Fix top 10 alignment — Reese must be top 3, Fano top 10
 * 2. Add all Beast top 50 players missing from our board
 * 3. Recalibrate grades so our tier breaks match Beast tiers
 * 4. Add Beast one-line summaries as scoutingSummary where ours are weaker
 * 5. Flag where we INTENTIONALLY disagree (document why)
 */

/** Quick lookup: does this player exist in our BOARD_2026? */
export function findPerformRank(name: string, board: Array<{ name: string; overallRank: number; grade: number }>): { rank: number; grade: number } | null {
  const match = board.find(p => p.name.toLowerCase() === name.toLowerCase());
  return match ? { rank: match.overallRank, grade: match.grade } : null;
}

/** Generate calibration report */
export function generateCalibrationReport(
  performBoard: Array<{ name: string; overallRank: number; grade: number }>,
): CalibrationEntry[] {
  return BEAST_TOP_100.map(beast => {
    const pf = findPerformRank(beast.name, performBoard);
    const delta = pf ? pf.rank - beast.rank : null;

    let action: CalibrationEntry['action'] = 'keep';
    let note = '';

    if (!pf) {
      action = 'add_to_board';
      note = `Missing from Per|Form board. Beast rank ${beast.rank}, ${beast.position}${beast.positionRank} at ${beast.school}.`;
    } else if (delta !== null && Math.abs(delta) > 10) {
      action = delta > 0 ? 'regrade_up' : 'regrade_down';
      note = `Major delta: Per|Form #${pf.rank} vs Beast #${beast.rank} (${delta > 0 ? 'too low' : 'too high'} by ${Math.abs(delta)} spots).`;
    } else if (delta !== null && Math.abs(delta) > 5) {
      action = 'review';
      note = `Moderate delta: Per|Form #${pf.rank} vs Beast #${beast.rank} (off by ${Math.abs(delta)} spots).`;
    } else {
      note = pf ? `Aligned: Per|Form #${pf.rank} vs Beast #${beast.rank}.` : '';
    }

    return {
      name: beast.name,
      position: beast.position,
      school: beast.school,
      beastRank: beast.rank,
      beastPositionRank: beast.positionRank,
      performRank: pf?.rank ?? null,
      performGrade: pf?.grade ?? null,
      delta,
      action,
      note,
    };
  });
}
