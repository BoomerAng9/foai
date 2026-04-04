import { NextRequest, NextResponse } from 'next/server';
import { createIndex, indexVideo, searchVideo, generateSummary } from '@/lib/film/twelve-labs';
import { generateText } from '@/lib/openrouter';

interface FilmRequest {
  youtubeUrl: string;
  playerName: string;
  analysisType: 'full_game' | 'highlights' | 'specific_plays';
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body: FilmRequest = await req.json();
    const { youtubeUrl, playerName, analysisType } = body;

    if (!youtubeUrl || !playerName) {
      return NextResponse.json({ error: 'Missing youtubeUrl or playerName' }, { status: 400 });
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Step 1: Create a Twelve Labs index for this analysis session
    const indexName = `film-${playerName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
    const indexResult = await createIndex(indexName);

    if (!indexResult._id) {
      return NextResponse.json({
        error: 'Failed to create video index',
        detail: indexResult,
      }, { status: 502 });
    }

    const indexId = indexResult._id;

    // Step 2: Submit video for indexing
    const taskResult = await indexVideo(indexId, youtubeUrl);

    if (!taskResult._id) {
      return NextResponse.json({
        error: 'Failed to submit video for indexing',
        detail: taskResult,
      }, { status: 502 });
    }

    const taskVideoId = taskResult.video_id || taskResult._id;

    // Step 3: Search for plays involving the named player
    const queryMap: Record<string, string> = {
      full_game: `${playerName} all plays and involvement throughout the game`,
      highlights: `${playerName} best plays touchdowns big moments highlights`,
      specific_plays: `${playerName} key plays decisive moments technique`,
    };

    const searchQuery = queryMap[analysisType] || queryMap.full_game;
    const searchResults = await searchVideo(indexId, searchQuery);

    const plays = (searchResults.data || []).map((clip: {
      start: number;
      end: number;
      confidence: string;
      metadata?: { text?: string };
    }) => ({
      timestamp: `${Math.floor(clip.start / 60)}:${String(Math.floor(clip.start % 60)).padStart(2, '0')}`,
      duration: Math.round(clip.end - clip.start),
      confidence: clip.confidence,
      description: clip.metadata?.text || 'Play identified',
    }));

    // Step 4: Generate scouting summary via Twelve Labs
    const scoutingPrompt = `Break down ${playerName}'s performance in this film. Focus on technique, athleticism, football IQ, and draft stock impact. Analysis type: ${analysisType}.`;
    const summaryResult = await generateSummary(taskVideoId, scoutingPrompt);
    const rawSummary = summaryResult.summary || '';

    // Step 5: Use Gemma 4 to add editorial voice (Mel Kiper style)
    const editorialPrompt = `You are a senior NFL Draft analyst with decades of experience breaking down game film, in the style of Mel Kiper Jr. You speak with authority, use specific football terminology, and are not afraid to give bold grades and strong takes.

Given this raw scouting data, produce a polished film analysis with:
1. An OVERALL ASSESSMENT (2-3 sentences, decisive tone)
2. KEY OBSERVATIONS (3-5 bullet points on technique, athleticism, awareness)
3. DRAFT STOCK IMPACT (how this film moves the needle)
4. A TIE GRADE from 0-100 (be specific, not round numbers)

Raw scouting data:
${rawSummary || 'Video indexing in progress. Based on available metadata, provide a preliminary assessment.'}

Player: ${playerName}
Analysis type: ${analysisType}
Plays found: ${plays.length}`;

    const analysis = await generateText(
      'You are Per|Form\'s elite film analyst. You break down tape like a 30-year veteran scout. Be specific, be bold, reference actual football concepts (hand placement, pad level, hip fluidity, route running, field vision). Always give a numerical grade.',
      editorialPrompt,
    );

    // Extract grade from analysis text
    const gradeMatch = analysis.match(/(?:TIE\s*GRADE|grade)[:\s]*(\d{1,3})/i);
    const grade = gradeMatch ? Math.min(100, parseInt(gradeMatch[1], 10)) : 72;

    return NextResponse.json({
      analysis,
      plays,
      grade,
      meta: {
        indexId,
        videoId: taskVideoId,
        playerName,
        analysisType,
      },
    });
  } catch (err) {
    console.error('[Film Analyze]', err);
    return NextResponse.json(
      { error: 'Film analysis failed', detail: String(err) },
      { status: 500 },
    );
  }
}
