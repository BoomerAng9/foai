import { NextRequest, NextResponse } from 'next/server';
import { getAnalyst, ANALYSTS } from '@/lib/analysts/personas';
import { generateText } from '@/lib/openrouter';
import { sql } from '@/lib/db';
import { speakAnalystContent } from '@/lib/voice/tts-router';
import { notifyNewEpisode } from '@/lib/notifications/triggers';

const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';

type EpisodeType = 'daily_take' | 'player_spotlight' | 'mock_draft_update' | 'debate';

const TYPE_INSTRUCTIONS: Record<EpisodeType, string> = {
  daily_take: 'Deliver a punchy daily take segment. Lead with the headline, give your analysis, and close with a bold prediction.',
  player_spotlight: 'Do a deep-dive spotlight on a specific player. Cover their TIE grade, strengths, weaknesses, and draft projection.',
  mock_draft_update: 'Walk through the latest mock draft movement. Who is rising, who is falling, and why — with your unique perspective.',
  debate: 'Present both sides of a hot debate, then pick your side decisively and defend it.',
};

async function ensureTable() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS podcast_episodes (
      id SERIAL PRIMARY KEY,
      analyst_id TEXT NOT NULL,
      title TEXT NOT NULL,
      transcript TEXT NOT NULL,
      audio_url TEXT,
      duration_seconds INTEGER DEFAULT 0,
      type TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

async function fetchLatestNews(): Promise<string> {
  try {
    // Use internal API — works both locally and in production
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/news`, { cache: 'no-store' });
    if (!res.ok) return 'Latest NFL Draft news and analysis.';
    const data = await res.json();
    const articles = data.articles || [];
    if (articles.length === 0) return 'Latest NFL Draft news and analysis.';
    return articles
      .slice(0, 5)
      .map((a: { title?: string; snippet?: string }) => `- ${a.title || a.snippet || ''}`)
      .join('\n');
  } catch {
    return 'Latest NFL Draft news and analysis.';
  }
}

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization') || '';
  if (PIPELINE_KEY && authHeader !== `Bearer ${PIPELINE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      topic,
      analyst: analystId,
      type = 'daily_take',
    } = body as { topic?: string; analyst?: string; type?: EpisodeType };

    // Resolve analyst — default to void-caster
    const resolvedId = analystId || 'void-caster';
    const analyst = getAnalyst(resolvedId);
    if (!analyst) {
      return NextResponse.json({ error: `Analyst ${resolvedId} not found` }, { status: 404 });
    }

    // Resolve topic — auto-select from news if not provided
    let resolvedTopic = topic;
    if (!resolvedTopic) {
      const newsDigest = await fetchLatestNews();
      resolvedTopic = `Pick the hottest story from today's headlines and give your take:\n${newsDigest}`;
    }

    // Generate the podcast script
    const scriptPrompt = `Write a podcast script in your voice for a PER|FORM PICKS episode.

FORMAT (strict):
TITLE: [a compelling episode title, 6-10 words]
---INTRO--- (approx 30 seconds when spoken)
[Your opening — set the stage, tease the topic]
---MAIN--- (approx 2-3 minutes when spoken)
[Your full analysis, insights, takes]
---CLOSING--- (approx 15 seconds when spoken)
[Your sign-off with a punchy final line]

TYPE: ${type}
INSTRUCTION: ${TYPE_INSTRUCTIONS[type] || TYPE_INSTRUCTIONS.daily_take}

TOPIC:
${resolvedTopic}

Write naturally as if speaking — no stage directions, no [PAUSE] markers, no production cues. Just your voice, your words, your cadence. This will be synthesized to audio directly.`;

    const script = await generateText(analyst.systemPrompt, scriptPrompt);

    // Extract title from script
    const titleMatch = script.match(/TITLE:\s*(.+)/i);
    const title = titleMatch
      ? titleMatch[1].trim()
      : `${analyst.name} — ${type.replace(/_/g, ' ')}`;

    // Strip the TITLE line for the spoken transcript
    const transcript = script
      .replace(/TITLE:\s*.+\n?/i, '')
      .replace(/---INTRO---\n?/g, '')
      .replace(/---MAIN---\n?/g, '')
      .replace(/---CLOSING---\n?/g, '')
      .trim();

    // Synthesize audio via the Per|Form TTS router (walks the
    // fallback chain: gemini-live → personaplex → grok-voice → playht)
    let audioUrl: string | null = null;
    let durationSeconds = 0;
    let engineUsed = 'none';

    try {
      const result = await speakAnalystContent({ analyst, text: transcript });
      audioUrl = result.audioUrl;
      engineUsed = result.engine;
      const wordCount = transcript.split(/\s+/).length;
      durationSeconds = result.durationSeconds ?? Math.round((wordCount / 150) * 60);

      if (!audioUrl) {
        console.warn('[podcast/generate] TTS returned null audioUrl', {
          analyst: resolvedId,
          engine: result.engine,
          error: result.error,
        });
      } else {
        console.log('[podcast/generate] TTS ok', {
          analyst: resolvedId,
          engine: result.engine,
          duration: durationSeconds,
        });
      }
    } catch (ttsErr) {
      console.error('[podcast/generate] TTS threw exception:', ttsErr);
      const wordCount = transcript.split(/\s+/).length;
      durationSeconds = Math.round((wordCount / 150) * 60);
    }

    // Save to database
    let episodeId: number | null = null;
    if (sql) {
      await ensureTable();
      const rows = await sql`
        INSERT INTO podcast_episodes (analyst_id, title, transcript, audio_url, duration_seconds, type)
        VALUES (${resolvedId}, ${title}, ${transcript}, ${audioUrl}, ${durationSeconds}, ${type})
        RETURNING id
      `;
      episodeId = rows[0]?.id ?? null;
    }

    // Send push notification for new episode (fire-and-forget)
    notifyNewEpisode({
      id: episodeId,
      title,
      analyst: { id: analyst.id, name: analyst.name },
    }).catch(() => {});

    return NextResponse.json({
      episodeId,
      title,
      duration: durationSeconds,
      audioUrl,
      engine: engineUsed,
      analyst: {
        id: analyst.id,
        name: analyst.name,
        color: analyst.color,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Podcast generation failed';
    console.error('Podcast generate error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
