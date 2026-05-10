/**
 * lib/events/rankings-emitter.ts
 * ===============================
 * In-process event bus for rankings stream. /api/draft/pick calls emitPickEvent()
 * after a successful UPDATE; /api/rankings/stream subscribes via subscribe() and
 * forwards events through SSE.
 *
 * Single-instance assumption: Cloud Run / Vercel typically run one container per
 * request burst for this service. Cross-instance fanout (Redis pub/sub, Pub/Sub)
 * is post-draft if multi-instance becomes a real load pattern.
 *
 * Memory bounded: subscribers held in a Set with explicit unsubscribe on
 * EventSource close. Events are not buffered — late subscribers see only events
 * after they connected (the SSE handler sends the current top-300 snapshot on
 * connect, so they never miss the initial state).
 */

export interface PickEvent {
  type: 'pick';
  player_id: number;
  player_name: string;
  position: string | null;
  school: string | null;
  drafted_by_team: string;
  pick_number: number;
  round: number | null;
  drafted_at: string;
  ts: number;
}

export interface HeartbeatEvent {
  type: 'heartbeat';
  ts: number;
}

export type RankingsEvent = PickEvent | HeartbeatEvent;

type Subscriber = (event: RankingsEvent) => void;

const subscribers = new Set<Subscriber>();

export function subscribe(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export function emitPickEvent(payload: Omit<PickEvent, 'type' | 'ts'>): void {
  const event: PickEvent = { type: 'pick', ts: Date.now(), ...payload };
  for (const fn of subscribers) {
    try {
      fn(event);
    } catch {
      // a single subscriber failure must not affect the rest
    }
  }
}

export function emitHeartbeat(): void {
  const event: HeartbeatEvent = { type: 'heartbeat', ts: Date.now() };
  for (const fn of subscribers) {
    try {
      fn(event);
    } catch {
      // swallow per-subscriber errors
    }
  }
}

export function subscriberCount(): number {
  return subscribers.size;
}
