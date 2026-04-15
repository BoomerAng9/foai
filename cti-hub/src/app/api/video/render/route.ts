import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit } from '@/lib/rate-limit-simple';
import { getDownloadUrl } from '@/lib/video/kie-ai';

/**
 * POST /api/video/render — Queue multi-scene video render
 *
 * Accepts a list of scenes with video URLs, durations, and transitions.
 * For now, stores the scene list and returns a job ID.
 * FFmpeg concatenation will be added when server-side FFmpeg is available.
 *
 * Body: { scenes: [{ videoUrl, duration, transition }] }
 */

interface RenderScene {
  videoUrl: string;
  duration: number;
  transition?: 'cut' | 'crossfade' | 'wipe' | 'dissolve' | 'slide';
}

interface RenderJob {
  id: string;
  userId: string;
  scenes: RenderScene[];
  downloadUrls: string[];
  status: 'queued' | 'processing' | 'complete' | 'failed';
  createdAt: number;
}

// In-memory job store (will be replaced with DB persistence)
const renderJobs = new Map<string, RenderJob>();

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    const { userId } = auth;
    // Video render is expensive — Kie/fal calls per scene. Tight cap.
    if (!rateLimit(userId, 5, 60000)) {
      return NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMITED' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { scenes } = body;

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: 'At least one scene is required' }, { status: 400 });
    }

    // Validate each scene
    const validScenes: RenderScene[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (!scene.videoUrl || typeof scene.videoUrl !== 'string') {
        return NextResponse.json(
          { error: `Scene ${i + 1} is missing a video URL` },
          { status: 400 },
        );
      }
      validScenes.push({
        videoUrl: scene.videoUrl,
        duration: typeof scene.duration === 'number' ? scene.duration : 8,
        transition: scene.transition || 'cut',
      });
    }

    // Resolve download URLs for all scenes (Kie.AI URLs expire after 20 min)
    const downloadUrls: string[] = [];
    for (const scene of validScenes) {
      try {
        const url = await getDownloadUrl(scene.videoUrl);
        downloadUrls.push(url);
      } catch {
        // If download URL resolution fails, keep the original
        downloadUrls.push(scene.videoUrl);
      }
    }

    // Create job
    const jobId = `render-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: RenderJob = {
      id: jobId,
      userId,
      scenes: validScenes,
      downloadUrls,
      status: 'queued',
      createdAt: Date.now(),
    };
    renderJobs.set(jobId, job);

    // Clean up old jobs (keep last 50)
    if (renderJobs.size > 50) {
      const entries = Array.from(renderJobs.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt);
      for (let i = 0; i < entries.length - 50; i++) {
        renderJobs.delete(entries[i][0]);
      }
    }

    const totalDuration = validScenes.reduce((sum, s) => sum + s.duration, 0);

    return NextResponse.json({
      jobId,
      status: 'queued',
      scenesCount: validScenes.length,
      totalDuration,
      transitions: validScenes.map(s => s.transition),
      message: `Render job queued: ${validScenes.length} scene${validScenes.length !== 1 ? 's' : ''}, ${totalDuration}s total. FFmpeg processing will begin when server-side rendering is enabled.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Render request failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/video/render?jobId=xxx — Check render job status
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const jobId = req.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'jobId parameter required' }, { status: 400 });
    }

    const job = renderJobs.get(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Render job not found' }, { status: 404 });
    }

    // Only allow the job owner to check status
    if (job.userId !== auth.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      scenesCount: job.scenes.length,
      totalDuration: job.scenes.reduce((sum, s) => sum + s.duration, 0),
      createdAt: job.createdAt,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Status check failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
