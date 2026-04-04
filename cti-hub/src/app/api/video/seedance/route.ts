import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { generateVideo, getTaskStatus, getCredits } from '@/lib/video/kie-ai';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { prompt, firstFrameUrl, lastFrameUrl, referenceImages, fast, duration, aspectRatio, generateAudio } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const credits = await getCredits();
    if (credits <= 0) {
      return NextResponse.json({ error: 'Insufficient video credits' }, { status: 402 });
    }

    const result = await generateVideo(
      {
        prompt: prompt.trim(),
        firstFrameUrl,
        lastFrameUrl,
        referenceImageUrls: referenceImages,
        generateAudio: generateAudio ?? true,
        duration: duration || 8,
        aspectRatio: aspectRatio || '16:9',
        resolution: '720p',
      },
      { fast: fast ?? false },
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      taskId: result.taskId,
      credits,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const taskId = req.nextUrl.searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

    const status = await getTaskStatus(taskId);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
  }
}
