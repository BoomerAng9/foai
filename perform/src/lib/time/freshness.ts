/** Relative timestamp formatter for freshness badges. */
export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return 'unknown';
  const diff = Math.max(0, now.getTime() - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/** Dot color from age — green fresh, amber stale, red dead. */
export function freshnessDot(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '#888';
  const ageHours = (now.getTime() - new Date(iso).getTime()) / 3_600_000;
  if (ageHours < 24) return '#22C55E';   // green
  if (ageHours < 72) return '#F59E0B';   // amber (3 days)
  return '#EF4444';                       // red
}
