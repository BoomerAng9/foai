import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const TWELVELABS_API_KEY = process.env.TWELVELABS_API_KEY || '';
const TWELVELABS_BASE = 'https://api.twelvelabs.io/v1.3';

/**
 * POST /api/broadcast/index-video — Index a video with Twelve Labs
 * Body: { videoUrl, indexName? }
 * Creates a persistent searchable index for sports film breakdown.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    if (!TWELVELABS_API_KEY) {
      return NextResponse.json({ error: 'Video indexing not configured' }, { status: 503 });
    }

    const { videoUrl, indexName } = await req.json();
    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl required' }, { status: 400 });
    }

    // Step 1: Create or get index
    const name = indexName || `broadcast-${Date.now()}`;
    const indexRes = await fetch(`${TWELVELABS_BASE}/indexes`, {
      method: 'POST',
      headers: {
        'x-api-key': TWELVELABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        engine_id: 'marengo2.7',
        index_options: ['visual', 'conversation', 'text_in_video'],
        index_name: name,
      }),
    });

    let indexId: string;
    if (indexRes.ok) {
      const indexData = await indexRes.json();
      indexId = indexData._id;
    } else {
      // Index might already exist — list and find
      const listRes = await fetch(`${TWELVELABS_BASE}/indexes?page=1&page_limit=10`, {
        headers: { 'x-api-key': TWELVELABS_API_KEY },
      });
      const listData = await listRes.json();
      const existing = listData.data?.find((idx: any) => idx.index_name === name);
      if (existing) {
        indexId = existing._id;
      } else {
        return NextResponse.json({ error: 'Failed to create index' }, { status: 500 });
      }
    }

    // Step 2: Submit video for indexing
    const taskRes = await fetch(`${TWELVELABS_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'x-api-key': TWELVELABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        index_id: indexId,
        url: videoUrl,
      }),
    });

    if (!taskRes.ok) {
      const err = await taskRes.json();
      return NextResponse.json({ error: err.message || 'Indexing failed' }, { status: 500 });
    }

    const taskData = await taskRes.json();

    return NextResponse.json({
      index_id: indexId,
      task_id: taskData._id,
      status: 'indexing',
      index_name: name,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Indexing failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/broadcast/index-video?indexId=xxx&query=deep+passes
 * Search an indexed video by natural language query.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    if (!TWELVELABS_API_KEY) {
      return NextResponse.json({ error: 'Video indexing not configured' }, { status: 503 });
    }

    const indexId = req.nextUrl.searchParams.get('indexId');
    const query = req.nextUrl.searchParams.get('query');
    const taskId = req.nextUrl.searchParams.get('taskId');

    // Check task status
    if (taskId && !query) {
      const statusRes = await fetch(`${TWELVELABS_BASE}/tasks/${taskId}`, {
        headers: { 'x-api-key': TWELVELABS_API_KEY },
      });
      const statusData = await statusRes.json();
      return NextResponse.json({
        status: statusData.status === 'ready' ? 'ready' : statusData.status === 'failed' ? 'failed' : 'processing',
        video_id: statusData.video_id,
      });
    }

    // Search
    if (!indexId || !query) {
      return NextResponse.json({ error: 'indexId and query required' }, { status: 400 });
    }

    const searchRes = await fetch(`${TWELVELABS_BASE}/search`, {
      method: 'POST',
      headers: {
        'x-api-key': TWELVELABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        index_id: indexId,
        query_text: query,
        search_options: ['visual', 'conversation'],
      }),
    });

    const searchData = await searchRes.json();

    return NextResponse.json({
      results: (searchData.data || []).map((r: any) => ({
        start: r.start,
        end: r.end,
        confidence: r.confidence,
        thumbnail: r.thumbnail_url,
        text: r.metadata?.text,
      })),
      total: searchData.page_info?.total_results || 0,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
