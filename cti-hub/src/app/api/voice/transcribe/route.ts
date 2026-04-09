import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

/**
 * POST /api/voice/transcribe — Transcribe audio using Whisper via OpenRouter/Groq
 * Accepts audio blob (webm/mp3/wav), returns transcribed text.
 * Falls back to Google Speech-to-Text if Whisper unavailable.
 */

const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GOOGLE_KEY = process.env.GOOGLE_KEY || '';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as Blob | null;

    if (!audio) {
      return NextResponse.json({ error: 'audio file required' }, { status: 400 });
    }

    // Strategy 1: Groq Whisper (fastest, most accurate)
    if (GROQ_KEY) {
      try {
        const groqForm = new FormData();
        groqForm.append('file', audio, 'recording.webm');
        groqForm.append('model', 'whisper-large-v3-turbo');
        groqForm.append('language', 'en');
        groqForm.append('response_format', 'json');

        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GROQ_KEY}` },
          body: groqForm,
          signal: AbortSignal.timeout(30000),
        });

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            text: data.text || '',
            provider: 'whisper',
            language: data.language || 'en',
          });
        }
      } catch { /* fall through */ }
    }

    // Strategy 2: Google Cloud Speech-to-Text
    if (GOOGLE_KEY) {
      try {
        const arrayBuffer = await audio.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');

        const res = await fetch(
          'https://speech.googleapis.com/v1/speech:recognize',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_KEY,
            },
            body: JSON.stringify({
              config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: 'en-US',
                model: 'latest_long',
                enableAutomaticPunctuation: true,
              },
              audio: { content: base64Audio },
            }),
            signal: AbortSignal.timeout(30000),
          },
        );

        if (res.ok) {
          const data = await res.json();
          const transcript = data.results
            ?.map((r: { alternatives?: { transcript?: string }[] }) =>
              r.alternatives?.[0]?.transcript || ''
            )
            .join(' ')
            .trim();

          return NextResponse.json({
            text: transcript || '',
            provider: 'google-stt',
          });
        }
      } catch { /* fall through */ }
    }

    return NextResponse.json({ error: 'No transcription service available', text: '' }, { status: 503 });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Transcription failed',
      text: '',
    }, { status: 500 });
  }
}
