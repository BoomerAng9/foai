/**
 * lib/analysts/stagger.ts
 * ========================
 * 3-day stagger publisher for the 5 Per|Form analyst feed.
 *
 * Rules:
 *   1. Each analyst posts on a 3-day cadence.
 *   2. Across the week no two analysts share the same publish day
 *      unless the calendar forces a collision (day 15 hits Void-Caster's
 *      day-1 cadence AND The Colonel's day-15 cadence = intentional overlap).
 *   3. Each analyst has a deterministic offset derived from their
 *      position in the ANALYST_ORDER list: offset_i = i days from
 *      EPOCH. With 5 analysts and a 3-day cadence the first collision
 *      is at LCM(3, analyst_count) = day 15 for pairs.
 *
 * Analyst 0 offset 0 → posts on day 0, 3, 6, 9, 12, 15, 18, …
 * Analyst 1 offset 1 → posts on day 1, 4, 7, 10, 13, 16, 19, …
 * Analyst 2 offset 2 → posts on day 2, 5, 8, 11, 14, 17, 20, …
 * Analyst 3 offset 3 → posts on day 3, 6, 9, 12, 15, 18, 21, … ← collides w/ #0 every 3 days
 * Analyst 4 offset 4 → posts on day 4, 7, 10, 13, 16, 19, 22, …
 *
 * With 5 analysts on a 3-day cadence, collisions are structural.
 * We spread the collision by staggering the TIME of day as a second
 * axis: each analyst has a time-of-day slot (HOUR_SLOTS[i]) so even
 * when two analysts share a day they never share an hour.
 *
 * Publish slots are therefore: (day_offset + 3k, hour_slot).
 * The DB UNIQUE(analyst_id, publish_at) constraint fails loud if a
 * human scheduler later double-books the same (analyst, timestamp).
 */

import { ANALYSTS } from './personas';

export const CADENCE_DAYS = 3;

/** Analyst publish order — matters because offsets come from the index. */
export const ANALYST_ORDER: readonly string[] = [
  'void-caster',
  'the-haze',
  'the-colonel',
  'astra-novatos',
  'bun-e',
];

/** Hour-of-day slots (UTC) — each analyst posts at their fixed hour. */
export const HOUR_SLOTS: readonly number[] = [13, 15, 17, 19, 21];

/** Epoch — 2026-04-14T00:00:00Z. All offsets are measured from here. */
export const STAGGER_EPOCH = Date.UTC(2026, 3, 14, 0, 0, 0);

export interface StaggerSlot {
  analystId: string;
  publishAt: Date;
  cycleIndex: number; // 0 for first post after epoch, 1 for next, …
}

function analystIndex(analystId: string): number {
  const idx = ANALYST_ORDER.indexOf(analystId);
  if (idx < 0) throw new Error(`[stagger] unknown analyst: ${analystId}`);
  return idx;
}

/** Next publish slot for a specific analyst at/after `from`. */
export function nextSlot(analystId: string, from: Date = new Date()): StaggerSlot {
  const idx = analystIndex(analystId);
  const dayOffset = idx; // offset 0..4
  const hourSlot = HOUR_SLOTS[idx] ?? 12;

  // Days elapsed since epoch (floor to midnight UTC).
  const msPerDay = 86_400_000;
  const daysSinceEpoch = Math.max(0, Math.floor((from.getTime() - STAGGER_EPOCH) / msPerDay));

  // Find the first cycle k where cycle-day is >= today AND the slot
  // time-of-day has not already passed for that day.
  for (let k = 0; k < 10_000; k++) {
    const cycleDay = dayOffset + k * CADENCE_DAYS;
    if (cycleDay < daysSinceEpoch) continue;

    const slotMs = STAGGER_EPOCH + cycleDay * msPerDay + hourSlot * 3_600_000;
    if (slotMs >= from.getTime()) {
      return { analystId, publishAt: new Date(slotMs), cycleIndex: k };
    }
  }
  throw new Error('[stagger] exhausted search window (>10,000 cycles)');
}

/**
 * Plan the next `count` publish slots for a specific analyst. Use to
 * front-fill a queue from a content pipeline (LLM-drafted posts).
 */
export function planSlots(analystId: string, count: number, from: Date = new Date()): StaggerSlot[] {
  const slots: StaggerSlot[] = [];
  let cursor = from;
  for (let i = 0; i < count; i++) {
    const s = nextSlot(analystId, cursor);
    slots.push(s);
    // Nudge cursor past this slot so the next planSlots iteration picks the cycle after.
    cursor = new Date(s.publishAt.getTime() + 1);
  }
  return slots;
}

/** Plan the next slot for every analyst — useful for queue-health reports. */
export function planAllNext(from: Date = new Date()): StaggerSlot[] {
  return ANALYST_ORDER.map((id) => nextSlot(id, from));
}

/** Guard used by the POST endpoint: confirm a requested publish_at
 *  lands on a legal slot for that analyst. Returns null on success or
 *  an error string on failure. */
export function validateSlot(analystId: string, publishAt: Date): string | null {
  const idx = analystIndex(analystId);
  const dayOffset = idx;
  const hourSlot = HOUR_SLOTS[idx] ?? 12;

  const msPerDay = 86_400_000;
  const daysSinceEpoch = Math.floor((publishAt.getTime() - STAGGER_EPOCH) / msPerDay);
  if (daysSinceEpoch < 0) return 'publish_at is before stagger epoch';

  if ((daysSinceEpoch - dayOffset) % CADENCE_DAYS !== 0) {
    return `publish_at day does not match 3-day cadence for ${analystId}`;
  }
  const hour = publishAt.getUTCHours();
  if (hour !== hourSlot) {
    return `publish_at hour ${hour} does not match analyst slot ${hourSlot}`;
  }
  return null;
}

/** Expose persona resolution as a thin pass-through so the API layer
 *  doesn't have to import from two places. */
export function resolveAnalyst(id: string) {
  return ANALYSTS.find((a) => a.id === id);
}
