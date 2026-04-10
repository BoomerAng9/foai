import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateTakeFromPlayer, generateScoutingPost, generatePredictionPost } from '@/lib/huddle/post-generator';

/**
 * POST /api/huddle/generate
 *
 * Triggers AI post generation for The Huddle.
 * Protected by PIPELINE_AUTH_KEY.
 *
 * Body: { analyst_id, type: 'take'|'scouting'|'prediction', player?: string }
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const pipelineKey = process.env.PIPELINE_AUTH_KEY;

  if (pipelineKey && token !== pipelineKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: { analyst_id?: string; type?: string; player?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { analyst_id, type, player } = body;

  if (!analyst_id) {
    return NextResponse.json({ error: 'analyst_id required' }, { status: 400 });
  }

  try {
    let generated;

    switch (type) {
      case 'scouting':
        if (!player) return NextResponse.json({ error: 'player required for scouting posts' }, { status: 400 });
        generated = await generateScoutingPost(analyst_id, player);
        break;
      case 'prediction':
        generated = await generatePredictionPost(analyst_id);
        break;
      case 'take':
      default:
        if (!player) return NextResponse.json({ error: 'player required for take posts' }, { status: 400 });
        generated = await generateTakeFromPlayer(analyst_id, player);
        break;
    }

    if (!generated) {
      return NextResponse.json({ error: 'Could not generate post — player or analyst not found' }, { status: 404 });
    }

    // Insert into DB
    const [post] = await sql`
      INSERT INTO huddle_posts (analyst_id, content, post_type, tags, player_ref)
      VALUES (${generated.analyst_id}, ${generated.content}, ${generated.post_type}, ${generated.tags}, ${generated.player_ref})
      RETURNING *`;

    await sql`UPDATE huddle_profiles SET post_count = post_count + 1 WHERE analyst_id = ${generated.analyst_id}`;

    return NextResponse.json({ ok: true, post });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Generation failed' }, { status: 500 });
  }
}
