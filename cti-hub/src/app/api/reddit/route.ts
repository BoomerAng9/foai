import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import {
  getMonitoredSubreddits,
  addSubreddit,
  removeSubreddit,
  getRecentPosts,
  runMonitorSweep,
} from '@/lib/reddit/monitor';

/**
 * GET /api/reddit
 * List monitored subreddits + recent posts.
 * Query params: ?action=subreddits | posts | sweep
 *               ?subreddit=NFL_Draft
 *               ?category=draft
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'subreddits';

  if (action === 'subreddits') {
    const subs = await getMonitoredSubreddits();
    return NextResponse.json({ subreddits: subs });
  }

  if (action === 'posts') {
    const subreddit = searchParams.get('subreddit') || undefined;
    const category = searchParams.get('category') || undefined;
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
    const posts = await getRecentPosts(subreddit, category, limit);
    return NextResponse.json({ posts, count: posts.length });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

/**
 * POST /api/reddit
 * Actions: add, remove, sweep
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  // Only owner can manage subreddits
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === 'add') {
    const { subreddit, category, fetch_mode, min_score } = body;
    if (!subreddit) return NextResponse.json({ error: 'subreddit required' }, { status: 400 });
    const result = await addSubreddit(subreddit, category, fetch_mode, min_score);
    return NextResponse.json({ added: result });
  }

  if (action === 'remove') {
    const { subreddit } = body;
    if (!subreddit) return NextResponse.json({ error: 'subreddit required' }, { status: 400 });
    await removeSubreddit(subreddit);
    return NextResponse.json({ removed: subreddit });
  }

  if (action === 'sweep') {
    const result = await runMonitorSweep();
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Unknown action. Use: add, remove, sweep' }, { status: 400 });
}
