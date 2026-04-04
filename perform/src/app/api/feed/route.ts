import { NextResponse } from 'next/server';
import { fetchSportsTimeline, fetchFromAccounts } from '@/lib/x-feed';

export const revalidate = 120; // Revalidate every 2 minutes

export async function GET() {
  try {
    const [timeline, insiders] = await Promise.all([
      fetchSportsTimeline(15),
      fetchFromAccounts(undefined, 10),
    ]);

    // Merge and deduplicate by ID
    const seen = new Set<string>();
    const merged = [...insiders, ...timeline].filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    // Sort by date (newest first)
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      tweets: merged.slice(0, 20),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ tweets: [], updatedAt: new Date().toISOString() });
  }
}
